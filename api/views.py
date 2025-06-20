import requests
from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login
from django.contrib import messages
from rest_framework.response import Response
from django.db.models import Q, Count, OuterRef, Subquery, IntegerField, Sum, Value, F, Q, Prefetch
from django.db.models.functions import Coalesce
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.urls import resolve
import json
from rest_framework.test import APIRequestFactory
import math
import time

import os

from django.core.files.base import ContentFile
from io import BytesIO
from PIL import Image
import tempfile
from django.core.files.storage import default_storage

from .serializers import *
from .models import *
from .tasks import *
from .model_utils import create_layer_instance
import base64
import uuid


# CONSTANTS

ALLOWED_IMAGE_FILE_EXTENSIONS = set(["png", "jpg", "jpeg", "webp", "avif"])

STATUS_TO_MESSAGE = {
    400: "Bad request",
    401: "Unauthorized",
    404: "Not found",
}


# HELPER FUNCTIONS


def createSmallImage(instance, target_width=230, target_height=190):
    img = Image.open(instance.image)
    
    new_name = instance.image.name.split("/")[-1]     # Otherwise includes files
    extension = new_name.split(".")[-1]
    new_name = new_name[0:len(new_name) - 1 - len(extension) - 1]
    new_name = new_name.split("-")[0]   # Remove previous resize information      
    new_name += ("-" + str(target_width) + "x" + str(target_height) + "." + extension) 
    
    # Get original dimensions
    img_width, img_height = img.size
    
    # Calculate the aspect ratios
    target_ratio = target_width / target_height
    img_ratio = img_width / img_height

    # Determine how to resize (fit width or height)
    if img_ratio > target_ratio:
        # Wider than target: Fit height, then crop width
        new_height = target_height
        new_width = int(target_height * img_ratio)
    else:
        # Taller than target: Fit width, then crop height
        new_width = target_width
        new_height = int(target_width / img_ratio)

    # Resize while keeping aspect ratio
    img = img.resize((new_width, new_height), Image.LANCZOS)

    # Calculate cropping box
    left = (new_width - target_width) / 2
    top = (new_height - target_height) / 2
    right = left + target_width
    bottom = top + target_height

    # Crop the center
    img = img.crop((left, top, right, bottom))

    # Save to BytesIO buffer
    buffer = BytesIO()

    # Determine format
    img_format = img.format if img.format else "JPEG"

    # Convert to RGB if saving as JPEG and image is RGBA
    if img_format.upper() == "JPEG" and img.mode == "RGBA":
        img = img.convert("RGB")

    img.save(buffer, format=img_format, quality=90)
    buffer.seek(0)
                            
    instance.imageSmall.save(new_name, ContentFile(buffer.read()), save=False)
    instance.save()
    
    
def parse_dimensions(data): # Empty values given as blank strings, must be set to None
    if "input_x" in data.keys() and not data["input_x"]: data["input_x"] = None
    elif "input_x" in data.keys():
        data["input_x"] = int(data["input_x"])
    if "input_y" in data.keys() and not data["input_y"]: data["input_y"] = None
    elif "input_y" in data.keys():
        data["input_y"] = int(data["input_y"])
    if "input_z" in data.keys() and not data["input_z"]: data["input_z"] = None
    elif "input_z" in data.keys():
        data["input_z"] = int(data["input_z"])


import random

def random_light_color():   # Slightly biased towards lighter shades
    r = random.randint(150, 255)  # Higher values mean lighter colors
    g = random.randint(150, 255)
    b = random.randint(150, 255)
    return "#{:02x}{:02x}{:02x}".format(r, g, b)


def dataset_order_by(datasets, order_by):
    if order_by == "downloads": 
        return datasets.order_by("downloaders")
    if order_by == "elements":
        return datasets.annotate(num_elements=Count('elements', distinct=True)).order_by('-num_elements')
    if order_by == "labels":
        return datasets.annotate(num_labels=Count('labels', distinct=True)).order_by('-num_labels')
    if order_by == "alphabetical": 
        return datasets.order_by("name")
    if order_by == "date": 
        return datasets.order_by("-created_at")

    return datasets

# PROFILE HANDLING

class GetCurrentProfile(APIView):
    serializer_class = ProfileSerializer

    def get(self, request, format=None):
        if request.user.id == None:
            return Response('', status=status.HTTP_200_OK)
        profile = request.user.profile
        profileSerialized = ProfileSerializer(profile)
        data = profileSerialized.data
        data["datasetsCount"] = profile.datasets.count()
        data["modelsCount"] = profile.models.count()
        data["savedDatasetsCount"] = profile.saved_datasets.count()
        data["savedModelsCount"] = profile.saved_models.count()
        
        return Response(data, status=status.HTTP_200_OK)
    
    
class ProfileStatsListView(generics.ListAPIView):
    serializer_class = ProfileStatsSerializer

    def get_queryset(self):
        request = self.request

        order_by = request.query_params.get("order_by", "name")
        search_query = request.query_params.get("search", "").strip()

        allowed_order_fields = ["name", "-total_downloads", "-model_count", "-dataset_count"]
        if order_by not in allowed_order_fields:
            order_by = "name"

        queryset = Profile.objects.all()
        if search_query:
            queryset = queryset.filter(name__istartswith=search_query)

        # Count all M2M entries pointing to this profile's models and datasets
        queryset = queryset.annotate(
            model_count=Count("models", distinct=True),
            dataset_count=Count("datasets", distinct=True),
            model_downloads=Count("models__downloaders", distinct=True),
            dataset_downloads=Count("datasets__downloaders", distinct=True),
        ).annotate(
            total_downloads=F("model_downloads") + F("dataset_downloads")
        )

        return queryset.order_by(order_by)
    
    
# Element count per dataset
element_count_subquery = (
    Element.objects.filter(dataset=OuterRef("pk"))
    .order_by()
    .values("dataset")
    .annotate(c=Count("id"))
    .values("c")[:1]
)

# Label count per dataset
label_count_subquery = (
    Label.objects.filter(dataset=OuterRef("pk"))
    .order_by()
    .values("dataset")
    .annotate(c=Count("id"))
    .values("c")[:1]
)
    
    
class GetProfile(APIView):
    serializer_class = ProfileExpandedSerializer
    lookup_url_kwarg = 'name'

    def get(self, request, format=None, *args, **kwargs):
        profile_name = kwargs[self.lookup_url_kwarg]

        try:
            element_count_subquery = (
                Element.objects.filter(dataset=OuterRef("pk"))
                .order_by()
                .values("dataset")
                .annotate(c=Count("id"))
                .values("c")[:1]
            )

            label_count_subquery = (
                Label.objects.filter(dataset=OuterRef("pk"))
                .order_by()
                .values("dataset")
                .annotate(c=Count("id"))
                .values("c")[:1]
            )

            annotated_datasets = Dataset.objects.annotate(
                element_count=Subquery(element_count_subquery, output_field=IntegerField()),
                label_count=Subquery(label_count_subquery, output_field=IntegerField())
            )
            
            profile = profile = Profile.objects.prefetch_related(
                Prefetch(
                    'datasets',
                    queryset=annotated_datasets
                ),
                'models__layers'
            ).get(name=profile_name)
        
            return Response(self.serializer_class(profile).data, status=status.HTTP_200_OK)
        except Profile.DoesNotExist:
            return Response({'Not found': 'Could not find profile with the name ' + str(profile_name) + '.'}, status=status.HTTP_404_NOT_FOUND)         
        
        
class UpdateProfileImage(APIView):
    def post(self, request, format=None):
        try:
            profile = Profile.objects.get(user=request.user)
        except Profile.DoesNotExist:
            return Response({'Not found': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ProfileImageUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)  
        

# DATASET HANDLING

class DatasetListPublic(generics.ListAPIView):
    serializer_class = DatasetElementSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        search = self.request.GET.get("search")
        dataset_type = self.request.GET.get("dataset_type")
        order_by = self.request.GET.get("order_by")
        imageWidth = self.request.GET.get("imageWidth")
        imageHeight = self.request.GET.get("imageHeight")
        
        datasets = Dataset.objects.filter(visibility="public")
        if search:
            datasets = datasets.filter(
                Q(name__icontains=search) | Q(keywords__icontains=search)
            )
            
        if dataset_type != "all":
            datasets = datasets.filter(dataset_type=dataset_type)
        if imageWidth:
            datasets = datasets.filter(imageWidth=imageWidth)
        if imageHeight:
            datasets = datasets.filter(imageHeight=imageHeight)

        if order_by:
            datasets = dataset_order_by(datasets, order_by)
            
        datasets = datasets.annotate(
            element_count=Coalesce(Subquery(element_count_subquery, output_field=IntegerField()), 0),
            label_count=Coalesce(Subquery(label_count_subquery, output_field=IntegerField()), 0)
        )

        return datasets


class DatasetListProfile(generics.ListCreateAPIView):
    serializer_class = DatasetElementSerializer
    permission_classes  = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = user.profile
        datasets = profile.datasets
        
        search = self.request.GET.get("search")
        dataset_type = self.request.GET.get("dataset_type")
        order_by = self.request.GET.get("order_by")
        imageWidth = self.request.GET.get("imageWidth")
        imageHeight = self.request.GET.get("imageHeight")

        if (search):
            datasets = datasets.filter(Q(name__contains=search) | (
                Q(
                    keywords__icontains=search
                )
            ))
        if dataset_type != "all":
            datasets = datasets.filter(dataset_type=dataset_type)
        if imageWidth:
            datasets = datasets.filter(imageWidth=imageWidth)
        if imageHeight:
            datasets = datasets.filter(imageHeight=imageHeight)

        if order_by:
            datasets = dataset_order_by(datasets, order_by)
            
        datasets = datasets.annotate(
            element_count=Coalesce(Subquery(element_count_subquery, output_field=IntegerField()), 0),
            label_count=Coalesce(Subquery(label_count_subquery, output_field=IntegerField()), 0)
        )

        return datasets
    
    
class DatasetListSaved(generics.ListCreateAPIView):
    serializer_class = DatasetElementSerializer
    permission_classes  = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = user.profile
        
        datasets = profile.saved_datasets.all()
        
        datasets = datasets.annotate(
            element_count=Coalesce(Subquery(element_count_subquery, output_field=IntegerField()), 0),
            label_count=Coalesce(Subquery(label_count_subquery, output_field=IntegerField()), 0)
        )

        return datasets


class GetDataset(APIView):
    serializer_class = DatasetSerializer
    lookup_url_kwarg = 'id'
    
    def get(self, request, *args, **kwargs):
        
        editing = request.GET.get('editing', 'false').lower() == 'true'
        serializer = self.serializer_class
        if editing:
            serializer = EditDatasetSerializer
        
        user = self.request.user
        if user.is_authenticated:
            dataset_id = kwargs[self.lookup_url_kwarg]
                
            if dataset_id != None:
                try:
                    dataset = Dataset.objects.get(Q(id=dataset_id) & Q(Q(visibility = "public") | Q(owner=user.profile)))
                    
                    datasetSerialized = serializer(dataset)
                    data = datasetSerialized.data
                    data["ownername"] = dataset.owner.name
                    
                    trained_with = []
                    for model in dataset.trained_with.all():
                        trained_with.append([model.id, model.name])
                    data["trained_with"] = trained_with
                    
                    return Response(data, status=status.HTTP_200_OK)
                    
                except Dataset.DoesNotExist:
                    return Response({'Not found': 'No public dataset or dataset belonging to you was found with the id ' + str(dataset_id) + '.'}, status=status.HTTP_404_NOT_FOUND)        
            
            else:
                return Response({'Bad Request': 'Id parameter not found in call to GetDataset.'}, status=status.HTTP_400_BAD_REQUEST)
            
        else:
            return Response({'Unauthorized': 'Must be logged in to get datasets.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class GetDatasetPublic(APIView):
    serializer_class = DatasetSerializer
    lookup_url_kwarg = 'id' 
    
    def get(self, request, *args, **kwargs):

        dataset_id = kwargs[self.lookup_url_kwarg]
            
        if dataset_id != None:
            try:
                dataset = Dataset.objects.get(Q(id=dataset_id) & Q(Q(visibility = "public")))
                
                datasetSerialized = self.serializer_class(dataset)
                data = datasetSerialized.data
                data["ownername"] = dataset.owner.name
                
                trained_with = []
                for model in dataset.trained_with.all():
                    trained_with.append([model.id, model.name])
                data["trained_with"] = trained_with
                
                return Response(data, status=status.HTTP_200_OK)
                
            except Dataset.DoesNotExist:
                return Response({'Not found': 'No public dataset was found with the id ' + str(dataset_id) + '.'}, status=status.HTTP_404_NOT_FOUND)        
        
        else:
            return Response({'Bad Request': 'Id parameter not found in call to GetDataset.'}, status=status.HTTP_400_BAD_REQUEST)


def get_element_text(element, dataset_type):
    if dataset_type.lower() == "text":
        return element.read().decode('utf-8')
    else:
        return ""


class CreateDataset(APIView):
    serializer_class = CreateDatasetSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, format=None):
        data = request.data
        data_dict = dict(data)
        
        user = request.user
        
        if user.is_authenticated:
            serializer = self.serializer_class(data=data)
            if serializer.is_valid():
                
                dataset_instance = serializer.save(owner=request.user.profile)
                
                createSmallImage(dataset_instance, 225, 190)    # Create a smaller image for displaying dataset elements
  
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response({'Bad Request': 'An error occurred while creating dataset'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'Unauthorized': 'Must be logged in to create datasets.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    
class EditDataset(APIView):
    serializer_class = CreateDatasetSerializer
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, format=None):   # A put request may fit better, post for now
        name = request.data["name"]
        description = request.data["description"]
        image = request.data["image"]
        visibility = request.data["visibility"]
        dataset_id = request.data["id"]
        keywords = request.data["keywords"]
        imageWidth = request.data["imageWidth"]
        imageHeight = request.data["imageHeight"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                dataset = Dataset.objects.get(id=dataset_id)
                
                prevImageWidth = dataset.imageWidth
                prevImageHeight = dataset.imageHeight
                
                if dataset.owner == user.profile:
                    dataset.name = name
                    dataset.description = description   
                    if image: 
                        dataset.image.delete(save=False)
                        dataset.imageSmall.delete(save=False)
                        dataset.image = image
                        createSmallImage(dataset, 230, 190)
                        
                    dataset.visibility = visibility
                    dataset.keywords = list(filter(lambda el: el != "", keywords.split(",")))
                        
                    if imageWidth:
                        dataset.imageWidth = int(imageWidth)
                    else: dataset.imageWidth = None
                    if imageHeight:
                        dataset.imageHeight = int(imageHeight)
                    else: dataset.imageHeight = None
                    
                    dataset.save()
                        
                    if imageWidth and imageHeight and (dataset.imageWidth != prevImageWidth or dataset.imageHeight != prevImageHeight):
                        task = resize_dataset_images_task.delay(dataset_id, user.id, imageWidth, imageHeight)

                        return Response({
                            "message": "Resizing started",
                            "task_id": task.id
                        }, status=status.HTTP_200_OK)
                
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({'Unauthorized': 'You can only edit your own datasets.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Dataset.DoesNotExist:
                return Response({'Not found': 'Could not find dataset with the id ' + str(dataset_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to edit datasets.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class DownloadDataset(APIView):
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        dataset_id = request.data["id"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                dataset = Dataset.objects.get(id=dataset_id)
                
                dataset.downloaders.add(user.profile)
                
                return Response(None, status=status.HTTP_200_OK)
            except Dataset.DoesNotExist:
                return Response({"Not found": "Could not find dataset with the id " + str(dataset_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Unauthorized": "Did not increase download count as user is not signed in."}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class SaveDataset(APIView):
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        dataset_id = request.data["id"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                dataset = Dataset.objects.get(id=dataset_id)
                
                dataset.saved_by.add(user.profile)
                
                return Response(None, status=status.HTTP_200_OK)
            
            except Dataset.DoesNotExist:
                return Response({"Not found": "Could not find dataset with the id " + str(dataset_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Unauthorized": "You must be signed in to save datasets."}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class UnsaveDataset(APIView):
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        dataset_id = request.data["id"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                dataset = Dataset.objects.get(id=dataset_id)
                
                dataset.saved_by.remove(user.profile)
                
                return Response(None, status=status.HTTP_200_OK)
            
            except Dataset.DoesNotExist:
                return Response({"Not found": "Could not find dataset with the id " + str(dataset_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Unauthorized": "You must be signed in to unsave datasets."}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class DeleteDataset(APIView):
    serializer_class = DatasetSerializer
    
    def post(self, request, format=None):
        dataset_id = request.data["dataset"]
        
        user = self.request.user
        
        if user.is_authenticated:
            task = delete_dataset_task.delay(dataset_id, user.id)

            return Response({
                "message": "Deleting started",
                "task_id": task.id
            }, status=status.HTTP_200_OK)
        else:
            return Response({'Unauthorized': 'Must be logged in to delete datasets.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class DeleteAllElements(APIView):
    serializer_class = ElementSerializer
    
    def post(self, request, format=None):
        dataset_id = request.data["dataset"]
        
        user = self.request.user
        
        if user.is_authenticated:
            task = delete_all_elements_task.delay(dataset_id, user.id)

            return Response({
                "message": "Deleting started",
                "task_id": task.id
            }, status=status.HTTP_200_OK)
        else:
            return Response({'Unauthorized': 'Must be logged in to delete elements.'}, status=status.HTTP_401_UNAUTHORIZED)
        
              
class ReorderDatasetLabels(APIView):
    serializer_class = DatasetSerializer
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        idToIdx = request.data["order"]
        dataset_id = request.data["id"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                dataset = Dataset.objects.get(id=dataset_id)
                
                if dataset.owner == user.profile:
                    for label in dataset.labels.all():
                        label.index = int(idToIdx[str(label.id)])
                        label.save()
        
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only reorder labels in your own datasets."}, status=status.HTTP_401_UNAUTHORIZED)
            except Dataset.DoesNotExist:
                return Response({"Not found": "Could not find dataset with the id " + str(dataset_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Unauthorized": "Must be logged in to reorder labels."}, status=status.HTTP_401_UNAUTHORIZED)
        

class ReorderDatasetElements(APIView):
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        indexes = request.data.get('indexes', [])
        dataset_id = request.data["id"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                dataset = Dataset.objects.get(id=dataset_id)
                
                if dataset.owner == user.profile:
                    for t, element in enumerate(dataset.elements.all()):
                        element.index = indexes[t]
                        element.save()
        
                    return Response(DatasetSerializer(dataset).data, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only reorder elements in your own datasets."}, status=status.HTTP_401_UNAUTHORIZED)
            except Dataset.DoesNotExist:
                return Response({"Not found": "Could not find dataset with the id " + str(dataset_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Unauthorized": "Must be logged in to reorder elements."}, status=status.HTTP_401_UNAUTHORIZED)
            
    
# ELEMENT HANDLING


def resize_element_image(instance, newWidth, newHeight):
    new_name = instance.file.name.split("/")[-1]     # Otherwise includes files
    new_name, extension = new_name.split(".")     
    new_name = new_name.split("-")[0]   # Remove previous resize information      
    
    new_name += ("-" + str(newWidth) + "x" + str(newHeight) + "." + extension) 
    
    try:
        
        img = Image.open(instance.file)
        img = img.resize([newWidth, newHeight], Image.LANCZOS)
        
        if default_storage.exists(instance.file.name):
            default_storage.delete(instance.file.name)
        
        # Save to BytesIO buffer
        buffer = BytesIO()
        img_format = img.format if img.format else "JPEG"  # Default to JPEG
        img.save(buffer, format=img_format, quality=90)
        buffer.seek(0)
                            
        instance.file.save(new_name, ContentFile(buffer.read()), save=False)
        instance.imageWidth = newWidth
        instance.imageHeight = newHeight
        instance.save()
        
    except IOError:
        print("Element ignored: not an image.")


class CreateElement(APIView):
    serializer_class = CreateElementSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, format=None):
        data = self.request.data
        serializer = self.serializer_class(data=data)
        
        if serializer.is_valid():
            
            dataset_id = data["dataset"]
            
            try:
                dataset = Dataset.objects.get(id=dataset_id)
                
                user = self.request.user
                
                if user.is_authenticated:
                    
                    if user.profile == dataset.owner:
                        instance = serializer.save(owner=request.user.profile)
                        
                        if (instance.dataset.dataset_type.lower() == "image"):
                            fileExtension = instance.file.name.split("/")[-1].split(".")[-1]
                            # Resize images if dataset has specified dimensions
                            if dataset.imageHeight and dataset.imageWidth and fileExtension in ALLOWED_IMAGE_FILE_EXTENSIONS:
                                resize_element_image(instance, dataset.imageWidth, dataset.imageHeight)
                                
                        if "label" in data.keys():
                            try:
                                label = Label.objects.get(id=data["label"])
                                instance.label = label
                                instance.save()
                            except Label.DoesNotExist:
                                return Response({'Not found': 'Could not find label with the id ' + str(data["label"]) + '.'}, status=status.HTTP_404_NOT_FOUND)
                            
                        return Response({"data": serializer.data, "id": instance.id}, status=status.HTTP_200_OK)
                    
                    else:
                        return Response({'Unauthorized': 'You can only add elements to your own datasets.'}, status=status.HTTP_401_UNAUTHORIZED)
                
                else:
                    return Response({'Unauthorized': 'Must be logged in to create elements.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Dataset.DoesNotExist:
                return Response({'Not found': 'Could not find dataset with the id ' + str(dataset_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Bad Request": "An error occured while creating element"}, status=status.HTTP_400_BAD_REQUEST)
        
        
def save_element_to_s3(file, idx=None, total=None, user=None):
    filename = f"tmp/elements/{uuid.uuid4()}_{file.name}"
    saved_key = default_storage.save(filename, file)  # stored in S3 via django-storages

    # Optional: update progress on the profile
    if user and user.is_authenticated and idx is not None and total:
        progress = (idx + 1) / total
        user.profile.create_elements_progress = progress * 100
        user.profile.save(update_fields=["create_elements_progress"])

    return saved_key  # this is the S3 key to pass to Celery
        

class UploadElements(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, format=None):
        files = request.FILES.getlist("files")
        dataset_id = request.data.get("dataset")
        index_offset = int(request.data.get("index", 0))

        s3_keys = []

        for i, f in enumerate(files):
            global_index = index_offset + i
            filename = f"tmp/elements/{dataset_id}/{global_index:06d}_{uuid.uuid4()}_{f.name}"
            default_storage.save(filename, f)
            s3_keys.append(filename)

        return Response({"uploaded": len(s3_keys)}, status=202)
    
    
class FinalizeElementsUpload(APIView):
    def post(self, request):
        dataset_id = request.data.get("dataset")
        user = request.user
        index = int(request.data.get("start_index", 0))
        labels = request.data.get("labels", None)
        area_points = request.data.get("area_points", None)

        # List all uploaded files under the dataset folder
        prefix = f"tmp/elements/{dataset_id}/"
        all_keys = default_storage.listdir(prefix)[1]  # second item is file list
        full_paths = [prefix + fname for fname in sorted(all_keys)]  # ensure order

        task = create_elements_task.delay(
            s3_keys=full_paths,
            dataset_id=dataset_id,
            user_id=user.id,
            index=index,
            labels=labels,
            area_points=area_points
        )

        return Response({
            "message": "Creating model started",
            "task_id": task.id
        }, status=status.HTTP_200_OK)
    
        
class EditElementLabel(APIView):   # Currently only used for labelling
    serializer_class = EditElementSerializer
    parser_classes = [JSONParser]

    def post(self, request, format=None):   # A put request may fit better, post for now
        label_id = request.data["label"]
        element_id = request.data["id"]
        
        user = self.request.user
        
        if user.is_authenticated:
            found_element = False
            try:
                element = Element.objects.get(id=element_id)
                found_element = True
                
                label = Label.objects.get(id=label_id)
                if element.owner == user.profile:
                    element.label = label
                    element.save()
                
                    return Response(ElementSerializer(element).data, status=status.HTTP_200_OK)
                
                else:
                    return Response({'Unauthorized': 'You can only edit your own elements.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Element.DoesNotExist or Label.DoesNotExist:
                if found_element: return Response({'Not found': 'Could not find label with the id ' + str(label_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
                return Response({'Not found': 'Could not find element with the id ' + str(element_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to edit elements.'}, status=status.HTTP_401_UNAUTHORIZED)
      
      
class EditElement(APIView):
    serializer_class = EditElementSerializer
    parser_classes = [JSONParser]

    def post(self, request, format=None):   # A put request may fit better, post for now
        name = request.data["name"]
        element_id = request.data["id"]
        text = request.data["text"]
        index = request.data["index"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                element = Element.objects.get(id=element_id)
                
                if element.owner == user.profile:
                    if name:
                        element.name = name
                    if text:
                        element.text = text
                    element.index = index
                        
                    element.save()
                
                    return Response(ElementSerializer(element).data, status=status.HTTP_200_OK)
                
                else:
                    return Response({'Unauthorized': 'You can only edit your own elements.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Element.DoesNotExist:
                return Response({'Not found': 'Could not find element with the id ' + str(element_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to edit elements.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class RemoveElementLabel(APIView):
    serializer_class = EditElementSerializer
    parser_classes = [JSONParser]

    def post(self, request, format=None):   # A put request may fit better, post for now
        element_id = request.data["id"]
        user = self.request.user
        
        if user.is_authenticated:
            try:
                element = Element.objects.get(id=element_id)

                if element.owner == user.profile:
                    element.label = None
                    element.save()
                
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({'Unauthorized': 'You can only edit your own elements.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Element.DoesNotExist:
                return Response({'Not found': 'Could not find element with the id ' + str(element_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to edit elements.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class DeleteElement(APIView):
    serializer_class = ElementSerializer
    
    def post(self, request, format=None):
        element_id = request.data["element"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                element = Element.objects.get(id=element_id)
                
                if element.owner == user.profile:
                    element.delete()
                    
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only delete your own elements."}, status=status.HTTP_401_UNAUTHORIZED)
            except Label.DoesNotExist:
                return Response({"Not found": "Could not find element with the id " + str(element_id + ".")}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to delete elements.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class ResizeElementImage(APIView):
    serializer_class = ElementSerializer
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        element_id = request.data["id"]
        newWidth = int(request.data["width"])
        newHeight = int(request.data["height"])
        
        user = self.request.user
        
        if user.is_authenticated:
            if newWidth > 0 and newWidth <= 1024 and newHeight > 0 and newHeight <= 1024:
                try:
                    element = Element.objects.get(id=element_id)
                    
                    if element.owner == user.profile:
                        file = element.file
                        new_name = file.name.split("/")[-1]     # Otherwise includes files
                        new_name, extension = new_name.split(".")     
                        new_name = new_name.split("-")[0]   # Remove previous resize information      
                        new_name += ("-" + str(newWidth) + "x" + str(newHeight) + "." + extension) 
                        
                        try:
                            
                            img = Image.open(file)
                            img = img.resize([newWidth, newHeight], Image.LANCZOS)
                            
                            if default_storage.exists(file.name):
                                default_storage.delete(file.name)
                            
                            # Save to BytesIO buffer
                            buffer = BytesIO()
                            img_format = img.format if img.format else "JPEG"  # Default to JPEG
                            img.save(buffer, format=img_format, quality=90)
                            buffer.seek(0)
                                                
                            element.file.save(new_name, ContentFile(buffer.read()), save=False)
                            element.imageWidth = newWidth
                            element.imageHeight = newHeight
                            element.save()
                            
                            return Response(self.serializer_class(element).data, status=status.HTTP_200_OK)
                        
                        except IOError:
                            return Response({"Bad Request": "Not an image."}, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        return Response({"Unauthorized": "You can only resize images for your own elements."}, status=status.HTTP_401_UNAUTHORIZED)
                except Element.DoesNotExist:
                    return Response({"Not found": "Could not find element with the id " + str(element_id) + "."}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({"Bad request": "Dimensions must be between 0 and 1024."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({"Unauthorized": "Must be logged in to resize element images."}, status=status.HTTP_401_UNAUTHORIZED)
        
        
# LABEL HANDLING

class CreateLabel(APIView):
    serializer_class = CreateLabelSerializer
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        data = self.request.data
        serializer = self.serializer_class(data=data)
        
        if serializer.is_valid():
            
            dataset_id = data["dataset"]
            
            try:
                dataset = Dataset.objects.get(id=dataset_id)
                
                if dataset.labels.count() >= 1000:
                    return Response({"Bad Request": "A dataset can have at most 1000 labels."}, status=status.HTTP_400_BAD_REQUEST)
                
                user = self.request.user
                
                if user.is_authenticated:
                    if user.profile == dataset.owner:
                        instance = serializer.save(owner=request.user.profile)
                        return Response({"data": serializer.data, "id": instance.id}, status=status.HTTP_200_OK)
                    
                    else:
                        return Response({'Unauthorized': 'Users can only add labels to their  own datasets.'}, status=status.HTTP_401_UNAUTHORIZED)
                
                else:
                    return Response({'Unauthorized': 'Users must be logged in to create labels.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Dataset.DoesNotExist:
                return Response({"Not found": "Could not find dataset with the id " + str(dataset_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Bad Request": "An error occured while creating label. Invalid input."}, status=status.HTTP_400_BAD_REQUEST)
        
        
class CreateLabels(APIView):
    serializer_class = CreateLabelSerializer
    parser_classes = [JSONParser]

    def post(self, request, format=None):
        data = self.request.data

        # Expecting data like:
        # {
        #   "dataset": 123,
        #   "labels": [
        #     {"name": "label1", "color": "#ff0000"},
        #     {"name": "label2", "color": "#00ff00"},
        #     ...
        #   ]
        # }

        dataset_id = data.get("dataset")
        labels_data = data.get("labels", [])

        if not dataset_id or not isinstance(labels_data, list):
            return Response({"Bad Request": "dataset and labels list are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return Response({"Not found": f"Could not find dataset with the id {dataset_id}."}, status=status.HTTP_404_NOT_FOUND)
        
        if dataset.labels.count() + len(labels_data) >= 1000:
            return Response({"Bad Request": "A dataset can have at most 1000 labels."}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.is_authenticated:
            return Response({'Unauthorized': 'Users must be logged in to create labels.'}, status=status.HTTP_401_UNAUTHORIZED)

        if user.profile != dataset.owner:
            return Response({'Unauthorized': 'Users can only add labels to their own datasets.'}, status=status.HTTP_401_UNAUTHORIZED)

        created_labels = []
        errors = []

        for label_data in labels_data:
            serializer = self.serializer_class(data=label_data)
            if serializer.is_valid():
                instance = serializer.save(owner=user.profile)
                created_labels.append({"id": instance.id, "name": instance.name, "color": instance.color})
            else:
                errors.append({"label": label_data.get("name"), "errors": serializer.errors})

        if errors:
            return Response({"created": created_labels, "errors": errors}, status=status.HTTP_207_MULTI_STATUS)
        else:
            return Response({"created": created_labels}, status=status.HTTP_201_CREATED)
        
        
class GetDatasetLabels(generics.ListAPIView):
    serializer_class = LabelSerializer
    permission_classes  = [AllowAny]
    
    def get_queryset(self):
        dataset = self.request.query_params.get("dataset", None)
        labels = []
        
        if dataset:
            labels = Label.objects.filter(dataset=int(dataset))
    
        return labels
    
    
class EditLabel(APIView):
    serializer_class = EditLabelSerializer
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        label_id = request.data["label"]
        name = request.data["name"]
        color = request.data["color"]
        keybind = request.data["keybind"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                label = Label.objects.get(id=label_id)
                
                if label.owner == user.profile:
                    label.name = name
                    label.color = color
                    label.keybind = keybind
                    label.save()
                    
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only edit your own labels."}, status=status.HTTP_401_UNAUTHORIZED)
            except Label.DoesNotExist:
                return Response({"Not found": "Could not find label with the id " + str(label_id + ".")}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to edit labels.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class DeleteLabel(APIView):
    serializer_class = LabelSerializer
    
    def post(self, request, format=None):
        label_id = request.data["label"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                label = Label.objects.get(id=label_id)
                
                if label.owner == user.profile:
                    label.delete()
                    
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only delete your own labels."}, status=status.HTTP_401_UNAUTHORIZED)
            except Label.DoesNotExist:
                return Response({"Not found": "Could not find label with the id " + str(label_id + ".")}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to delete labels.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
# MISCELLANEOUS

class CreateArea(APIView):
    serializer_class = AreaSerializer
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        data = self.request.data
        serializer = self.serializer_class(data={"label": data["label"], "element": data["element"], "area_points": data["area_points"]})
            
        user = self.request.user
        
        if user.is_authenticated:
            try:
                label_id = data["label"]
                label = Label.objects.get(id=label_id)
                
                try:
                    element_id = data["element"]
                    element = Element.objects.get(id=element_id)
                    
                    if user.profile != element.owner:
                        return Response({'Unauthorized': 'Users can only create areas for their own element.'}, status=status.HTTP_401_UNAUTHORIZED)
                    if user.profile != label.owner:
                        return Response({'Unauthorized': 'Users can only create areas for their own labels.'}, status=status.HTTP_401_UNAUTHORIZED)
                    
                    if serializer.is_valid():
                        serializer.save()
                        return Response(serializer.data, status=status.HTTP_200_OK)
                    
                    else:
                        return Response({"Bad Request": "An error occured while creating area. Invalid input."}, status=status.HTTP_400_BAD_REQUEST)
                except Element.DoesNotExist:
                    return Response({"Not found": "Could not find element with the id " + str(element_id) + "."}, status=status.HTTP_404_NOT_FOUND)
            except Label.DoesNotExist:
                return Response({"Not found": "Could not find label with the id " + str(label_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Users must be logged in to create labels.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = self.request.user
        

def polar_angle(p1, p2):
    """Compute the polar angle of p2 relative to p1."""
    return math.atan2(p2[1] - p1[1], p2[0] - p1[0])


def reorder_points(points):
    """Reorder points to surround the area naturally without removing any points."""
    start_point = points[0]

    # Sort remaining points by polar angle relative to the first point
    remaining_points = sorted(points[1:], key=lambda p: polar_angle(start_point, p))
    
    return [start_point] + remaining_points


class EditArea(APIView):
    serializer_class = AreaSerializer
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        area_id = request.data["area"]
        area_points = request.data["area_points"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                area = Area.objects.get(id=area_id)
                
                if area.element.owner == user.profile:
                    if len(json.loads(area_points)) > 0:
                        
                        area.area_points = area_points

                        area.save()
                        
                        return Response({"deleted": False}, status=status.HTTP_200_OK)
                    else:
                        area.delete()
                        
                        return Response({"deleted": True}, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only edit areas belonging to your own elements."}, status=status.HTTP_401_UNAUTHORIZED)
            except Area.DoesNotExist:
                return Response({"Not found": "Could not find area with the id " + str(area_id + ".")}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to edit areas.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class DeleteArea(APIView):
    serializer_class = AreaSerializer
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        area_id = request.data["area"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                area = Area.objects.get(id=area_id)
                
                if area.element.owner == user.profile:
                    area.delete()
                        
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only delete areas belonging to your own elements."}, status=status.HTTP_401_UNAUTHORIZED)
            except Area.DoesNotExist:
                return Response({"Not found": "Could not find area with the id " + str(area_id + ".")}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to delete areas.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
# MODEL FUNCTIONALITY

def model_order_by(models, order_by):
    if order_by == "downloads": 
        return models.order_by("downloaders")
    if order_by == "layers":
        return models.annotate(num_layers=Count('layers', distinct=True)).order_by('-num_layers')
    if order_by == "alphabetical": 
        return models.order_by("name")
    if order_by == "date": 
        return models.order_by("-created_at")
    return models

class ModelListPublic(generics.ListAPIView):
    serializer_class = ModelElementSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        search = self.request.GET.get("search")
        model_type = self.request.GET.get("model_type")
        model_build_type = self.request.GET.get("model_build_type")
        order_by = self.request.GET.get("order_by")
        
        models = Model.objects.filter(Q(visibility="public") & (
            # Search handling
            Q(name__icontains=search)
        ))
        if model_type != "all":
            models = models.filter(model_type=model_type)
        if model_build_type != "all":
            if model_build_type == "built":
                models = models.filter(Q(model_file__isnull=False))
            else:
                models = models.filter(Q(model_file__isnull=True) | Q(model_file=''))
        if order_by:
            models = model_order_by(models, order_by)

        return models


class ModelListProfile(generics.ListCreateAPIView):
    serializer_class = ModelElementSerializer
    permission_classes  = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = user.profile
        models = profile.models
        
        search = self.request.GET.get("search")
        model_type = self.request.GET.get("model_type")
        model_build_type = self.request.GET.get("model_build_type")
        order_by = self.request.GET.get("order_by")

        if (search):
            models = models.filter(Q(name__contains=search))
        if model_type != "all":
            models = models.filter(model_type=model_type)
        if model_build_type != "all":
            if model_build_type == "built":
                models = models.filter(Q(model_file__isnull=False))
            else:
                models = models.filter(Q(model_file__isnull=True) | Q(model_file=''))
        if order_by:
            models = model_order_by(models, order_by)

        return models
    
    
class GetModel(APIView):
    serializer_class = ModelSerializer
    lookup_url_kwarg = 'id'
    
    def get(self, request, *args, **kwargs):
        user = self.request.user
        if user.is_authenticated:
            model_id = kwargs[self.lookup_url_kwarg]
                
            if model_id != None:
                try:
                    model = Model.objects.get(Q(id=model_id) & Q(Q(visibility = "public") | Q(owner=user.profile)))
                    
                    modelSerialized = self.serializer_class(model)
                    data = modelSerialized.data
                    data["ownername"] = model.owner.name
                    
                    return Response(data, status=status.HTTP_200_OK)
                    
                except Model.DoesNotExist:
                    return Response({'Not found': 'No public model or model belonging to you was found with the id ' + str(model_id) + '.'}, status=status.HTTP_404_NOT_FOUND)        
            
            else:
                return Response({'Bad Request': 'Id parameter not found in call to GetModel.'}, status=status.HTTP_400_BAD_REQUEST)
            
        else:
            return Response({'Unauthorized': 'Must be logged in to get models.'}, status=status.HTTP_401_UNAUTHORIZED)
    
    
class GetModelPublic(APIView):
    serializer_class = ModelSerializer
    lookup_url_kwarg = 'id' 
    
    def get(self, request, *args, **kwargs):

        model_id = kwargs[self.lookup_url_kwarg]
            
        if model_id != None:
            try:
                model = Model.objects.get(Q(id=model_id) & Q(Q(visibility = "public")))
                
                modelSerialized = self.serializer_class(model)
                data = modelSerialized.data
                data["ownername"] = model.owner.name
                
                return Response(data, status=status.HTTP_200_OK)
                
            except Model.DoesNotExist:
                return Response({'Not found': 'No public model was found with the id ' + str(model_id) + '.'}, status=status.HTTP_404_NOT_FOUND)        
        
        else:
            return Response({'Bad Request': 'Id parameter not found in call to GetModelPublic.'}, status=status.HTTP_400_BAD_REQUEST)
    

class CreateModel(APIView):
    serializer_class = CreateModelSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, format=None):
        data = request.data
        
        user = request.user
        
        if user.is_authenticated:
            serializer = self.serializer_class(data=data)

            if serializer.is_valid():
                
                model_instance = serializer.save(owner=user.profile)
                
                createSmallImage(model_instance, 230, 190)    # Create a smaller image for displaying model elements
                
                

                if "model" in request.data.keys() and request.data["model"]:   # Uploaded model
                    model_instance.model_file = data["model"]
                    model_instance.save()
                    
                    task = create_model_task.delay(model_instance.id, user.id)
                    
                    return Response({
                        "message": "Creating model started",
                        "task_id": task.id
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({}, status=status.HTTP_200_OK)
            
            else:
                return Response({"Bad Request": "An error occured while creating model. Invalid input."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'Unauthorized': 'Must be logged in to create models.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class DeleteModel(APIView):
    serializer_class = ModelSerializer
    
    def post(self, request, format=None):
        model_id = request.data["model"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                model = Model.objects.get(id=model_id)
                
                if model.owner == user.profile:
                    model.delete()
                    
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only delete your own models."}, status=status.HTTP_401_UNAUTHORIZED)
            except Model.DoesNotExist:
                return Response({"Not found": "Could not find model with the id " + str(model_id + ".")}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to delete models.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class EditModel(APIView):
    serializer_class = CreateModelSerializer
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, format=None):   # A put request may fit better, post for now
        name = request.data["name"]
        description = request.data["description"]
        image = request.data["image"]
        visibility = request.data["visibility"]
        model_id = request.data["id"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                model = Model.objects.get(id=model_id)
                
                if model.owner == user.profile:
                    model.name = name
                    model.description = description   
                    if image: 
                        model.image.delete(save=False)
                        model.imageSmall.delete(save=False)
                        model.image = image
                        createSmallImage(model, 230, 190)
                        
                    model.visibility = visibility
                        
                    model.save()
                
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({'Unauthorized': 'You can only edit your own models.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Model.DoesNotExist:
                return Response({'Not found': 'Could not find model with the id ' + str(model_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to edit models.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class ReorderModelLayers(APIView):
    serializer_class = DatasetSerializer
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        idToIdx = request.data["order"]
        model_id = request.data["id"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                model = Model.objects.get(id=model_id)
                
                if model.owner == user.profile:
                    for layer in model.layers.all():
                        layer.index = int(idToIdx[str(layer.id)])
                        layer.save()
        
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only reorder layers in your own models."}, status=status.HTTP_401_UNAUTHORIZED)
            except Model.DoesNotExist:
                return Response({"Not found": "Could not find model with the id " + str(model_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Unauthorized": "Must be logged in to reorder layers."}, status=status.HTTP_401_UNAUTHORIZED)
        

class BuildModel(APIView):
    parser_classes = [JSONParser]

    def post(self, request, format=None):
        model_id = request.data["id"]
        optimizer = request.data["optimizer"]
        learning_rate = request.data["learning_rate"]
        loss_function = request.data["loss"]
        input_sequence_length = None
        if "input_sequence_length" in request.data.keys():
            input_sequence_length = request.data["input_sequence_length"]
        
        user = self.request.user
        
        if user.is_authenticated:
            task = build_model_task.delay(model_id, optimizer, learning_rate, loss_function, user.id, input_sequence_length)

            # Optionally, you could return a task ID to the client if you plan to track progress
            return Response({
                "message": "Building started",
                "task_id": task.id
            }, status=status.HTTP_200_OK)
        else:
            return Response({"Unauthorized": "Must be logged in to build models."}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class RecompileModel(APIView):
    parser_classes = [JSONParser]

    def post(self, request, format=None):
        model_id = request.data["id"]
        optimizer = request.data["optimizer"]
        learning_rate = request.data["learning_rate"]
        loss_function = request.data["loss"]
        input_sequence_length = None
        if "input_sequence_length" in request.data.keys():
            input_sequence_length = request.data["input_sequence_length"]
        
        user = self.request.user
        
        if user.is_authenticated:
            task = recompile_model_task.delay(model_id, optimizer, learning_rate, loss_function, user.id, input_sequence_length)

            # Optionally, you could return a task ID to the client if you plan to track progress
            return Response({
                "message": "Recompilation started",
                "task_id": task.id
            }, status=status.HTTP_200_OK)
        else:
            return Response({"Unauthorized": "Must be logged in to recompile models."}, status=status.HTTP_401_UNAUTHORIZED)    
        
        
def trainModelDatasetInstance(model_id, dataset_id, epochs, validation_split, user):
    task = train_model_task.delay(model_id, dataset_id, epochs, validation_split, user.id)

    # Optionally, you could return a task ID to the client if you plan to track progress
    return Response({
        "message": "Training started",
        "task_id": task.id
    }, status=status.HTTP_200_OK)
     

def trainModelTensorflowDataset(tensorflowDataset, model_id, epochs, validation_split, user):
    task = train_model_tensorflow_dataset_task.delay(tensorflowDataset, model_id, epochs, validation_split, user.id)

    # Optionally, you could return a task ID to the client if you plan to track progress
    return Response({
        "message": "Training started",
        "task_id": task.id
    }, status=status.HTTP_200_OK)
        
        
class TrainModel(APIView):
    parser_classes = [JSONParser]

    def post(self, request, format=None):
        model_id = request.data["model"]
        dataset_id = request.data["dataset"]
        epochs = int(request.data["epochs"])
        validation_split = float(request.data["validation_split"])
        tensorflowDataset = request.data["tensorflow_dataset"]
        
        user = self.request.user
        
        if user.is_authenticated:
            if dataset_id > 0 and tensorflowDataset == "":
                return trainModelDatasetInstance(model_id, dataset_id, epochs, validation_split, user)
            else:
                return trainModelTensorflowDataset(tensorflowDataset, model_id, epochs, validation_split, user)
        else:
            return Response({"Unauthorized": "Must be logged in to train models."}, status=status.HTTP_401_UNAUTHORIZED)
            
  
class EvaluateModel(APIView):
    parser_classes = [JSONParser]

    def post(self, request, format=None):
        model_id = request.data["model"]
        dataset_id = request.data["dataset"]
        
        user = self.request.user
        
        if user.is_authenticated:
            task = evaluate_model_task.delay(model_id, dataset_id, user.id)

            return Response({
                "message": "Evaluation started",
                "task_id": task.id
            }, status=status.HTTP_200_OK)
        else:
            return Response({"Unauthorized": "You must be signed in to evaluate models."}, status=status.HTTP_401_UNAUTHORIZED)
           
          
def convert_image_to_base64(image_file):
    """
    Converts an image file to a base64 string.
    """
    img_data = image_file.read()  # Reading the file data
    img_str = base64.b64encode(img_data).decode('utf-8')  # Convert to base64
    return img_str
          
          
def save_image_to_s3(image_file, idx, total_count, user):
    import uuid
    from django.core.files.storage import default_storage

    filename = f"tmp/prediction/{uuid.uuid4()}.jpg"
    saved_path = default_storage.save(filename, image_file)
    
    if user.is_authenticated:
        user.profile.prediction_progress = (idx + 1) / (total_count * 3)
        user.profile.save()
    
    return saved_path  # This is the key

           
class PredictModel(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, format=None):
        model_id = request.data["model"]
        images = request.data.getlist("images[]")
        text = request.data["text"]
        
        user = request.user

        s3_keys = [save_image_to_s3(image, t, len(images), user) for t, image in enumerate(images)]
        
        if user.is_authenticated:
            task = predict_model_task.delay(model_id, s3_keys, text, user.id)
        else:
            task = predict_model_task.delay(model_id, s3_keys, text)

        return Response({
            "message": "Prediction started",
            "task_id": task.id
        }, status=status.HTTP_200_OK)

 
class SaveModel(APIView):
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        model_id = request.data["id"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                model = Model.objects.get(id=model_id)
                
                model.saved_by.add(user.profile)
                
                return Response(None, status=status.HTTP_200_OK)
            
            except Model.DoesNotExist:
                return Response({"Not found": "Could not find model with the id " + str(model_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Unauthorized": "You must be signed in to save models."}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class UnsaveModel(APIView):
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        model_id = request.data["id"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                model = Model.objects.get(id=model_id)
                
                model.saved_by.remove(user.profile)
                
                return Response(None, status=status.HTTP_200_OK)
            
            except Model.DoesNotExist:
                return Response({"Not found": "Could not find model with the id " + str(model_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Unauthorized": "You must be signed in to unsave models."}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class ResetModelToBuild(APIView):
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        model_id = request.data["id"]
        
        user = self.request.user
        
        backend_temp_model_path = ""
        
        if user.is_authenticated:
            task = reset_model_to_build_task.delay(model_id, user.id)

            return Response({
                "message": "Resetting model started",
                "task_id": task.id
            }, status=status.HTTP_200_OK)
        else:
            return Response({"Unauthorized": "You must be signed in to reset models to build."}, status=status.HTTP_401_UNAUTHORIZED)

           
# LAYER FUNCTIONALITY

class CreateLayer(APIView):
    serializer_class = CreateLayerSerializer
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        try:
            instance = create_layer_instance(request.data, request.user)
            return Response({"data": self.serializer_class(instance).data, "id": instance.id}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"Bad Request": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except serializers.ValidationError:
            return Response({"Bad Request": "Validation failed."}, status=status.HTTP_400_BAD_REQUEST)
        except PermissionError as e:
            return Response({"Unauthorized": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class DeleteLayer(APIView):
    serializer_class = LayerSerializer
    
    def post(self, request, format=None):
        layer_id = request.data["layer"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                layer = Layer.objects.get(id=layer_id)
                
                if layer.model.owner == user.profile:
                    layer.delete()
                    
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only delete your own layers."}, status=status.HTTP_401_UNAUTHORIZED)
            except Layer.DoesNotExist:
                return Response({"Not found": "Could not find layer with the id " + str(layer_id + ".")}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to delete layers.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class DeleteAllLayers(APIView):
    def post(self, request, format=None):
        model_id = request.data["model"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                model = Model.objects.get(id=model_id)
                
                if model.owner == user.profile:
                    for layer in model.layers.all():
                        layer.delete()
                    
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only delete your own layers."}, status=status.HTTP_401_UNAUTHORIZED)
            except Layer.DoesNotExist:
                return Response({"Not found": "Could not find model with the id " + str(model_id + ".")}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to delete layers.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class EditLayer(APIView):
    parser_classes = [JSONParser]

    def post(self, request, format=None):   # A put request may fit better, post for now
        layer_id = request.data["id"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                layer = Layer.objects.get(id=layer_id)
                
                if layer.model.owner == user.profile:
                    layer_type = request.data["type"]

                    parse_dimensions(request.data)
                    
                    if layer_type == "dense":
                        layer.nodes_count = request.data["nodes_count"]
                        layer.input_x = request.data["input_x"]
                    elif layer_type == "conv2d":
                        layer.filters = request.data["filters"]
                        layer.kernel_size = request.data["kernel_size"]
                        layer.padding = request.data["padding"]
                        layer.input_x = request.data["input_x"]
                        layer.input_y = request.data["input_y"]
                        layer.input_z = request.data["input_z"]
                    elif layer_type == "maxpool2d":
                        layer.pool_size = request.data["pool_size"]
                    elif layer_type == "flatten":
                        layer.input_x = request.data["input_x"]
                        layer.input_y = request.data["input_y"]
                    elif layer_type == "dropout":
                        layer.rate = request.data["rate"]
                    elif layer_type == "rescaling":
                        layer.scale = request.data["scale"]
                        layer.offset = request.data["offset"]
                        layer.input_x = request.data["input_x"]
                        layer.input_y = request.data["input_y"]
                        layer.input_z = request.data["input_z"]
                    elif layer_type == "randomflip":
                        layer.mode = request.data["mode"]
                        layer.input_x = request.data["input_x"]
                        layer.input_y = request.data["input_y"]
                        layer.input_z = request.data["input_z"]
                    elif layer_type == "randomrotation":
                        layer.factor = request.data["factor"]
                        layer.input_x = request.data["input_x"]
                        layer.input_y = request.data["input_y"]
                        layer.input_z = request.data["input_z"]
                    elif layer_type == "resizing":
                        layer.input_x = request.data["input_x"]
                        layer.input_y = request.data["input_y"]
                        layer.input_z = request.data["input_z"]
                        
                        layer.output_x = request.data["output_x"]
                        layer.output_y = request.data["output_y"]
                    elif layer_type == "textvectorization":
                        layer.max_tokens = request.data["max_tokens"]
                        layer.standardize = request.data["standardize"]
                        layer.output_sequence_length = request.data["output_sequence_length"]
                    elif layer_type == "embedding":
                        layer.max_tokens = request.data["max_tokens"]
                        layer.output_dim = request.data["output_dim"]
                    # Can't edit GlobalAveragePooling1DLayer or pretrained model layers  

                    layer.activation_function = request.data["activation_function"]
                    layer.updated = True

                    if ("trainable" in request.data.keys()):
                        trainable_val = request.data["trainable"] 
                        layer.trainable = (trainable_val.lower() == 'true') if isinstance(trainable_val, str) else trainable_val
                    if ("update_build" in request.data.keys()): 
                        update_build_val = request.data["update_build"] 
                        layer.update_build = (update_build_val.lower() == 'true') if isinstance(update_build_val, str) else update_build_val

                    layer.save()
                
                    return Response(LayerSerializer(layer).data, status=status.HTTP_200_OK)
                
                else:
                    return Response({'Unauthorized': 'You can only edit layers belonging to your own models.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Layer.DoesNotExist:
                return Response({'Not found': 'Could not find model with the id ' + str(layer_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to edit layers.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class ClearLayerUpdated(APIView):
    parser_classes = [JSONParser]

    def post(self, request, format=None):   # A put request may fit better, post for now
        layer_id = request.data["id"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                layer = Layer.objects.get(id=layer_id)
                
                if layer.model.owner == user.profile:
                    layer.updated = False
                    layer.save()
                
                    return Response(LayerSerializer(layer).data, status=status.HTTP_200_OK)
                
                else:
                    return Response({'Unauthorized': 'You can only edit layers belonging to your own models.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Layer.DoesNotExist:
                return Response({'Not found': 'Could not find model with the id ' + str(layer_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to edit layers.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class ResetLayerToBuild(APIView):
    parser_classes = [JSONParser]

    def post(self, request, format=None):   # A put request may fit better, post for now
        layer_id = request.data["id"]
        
        user = self.request.user
        if user.is_authenticated:
            task = reset_to_build_task.delay(layer_id, user.id)

            return Response({
                "message": "Prediction started",
                "task_id": task.id
            }, status=status.HTTP_200_OK)
        else:
            return Response({"Unauthorized": "Must be logged in to reset layers to build."})
        
        
# TASK HANDLING (USED TO TRACK RESULTS FROM CELERY TASKS)
          
from celery.result import AsyncResult

class GetTaskResult(APIView):
    lookup_url_kwarg = "id"
    
    def get(self, request, *args, **kwargs):
        task_id = kwargs[self.lookup_url_kwarg]
        task = AsyncResult(task_id)

        if task.state == 'SUCCESS' and task.result["status"] == 200:
            return Response(task.result, status=status.HTTP_200_OK)
        elif task.state == 'PENDING':
            user = self.request.user
            
            if user.is_authenticated:
                profile = user.profile
                
                training_progress = profile.training_progress
                training_accuracy = profile.training_accuracy
                processing_data_progress = profile.processing_data_progress
                training_loss = profile.training_loss
                training_time_remaining = profile.training_time_remaining
                delete_dataset_progress = profile.delete_dataset_progress
                deleting_elements_progress = profile.deleting_elements_progress
                creating_elements_progress = profile.creating_elements_progress
                edit_dataset_progress = profile.edit_dataset_progress
                prediction_progress = profile.prediction_progress
                
                evaluation_progress = user.profile.evaluation_progress
                return Response({'status': 'in progress', 
                                 "training_progress": training_progress, 
                                 "training_accuracy": training_accuracy,
                                 "processing_data_progress": processing_data_progress,
                                 "training_loss": training_loss,
                                 "deleting_elements_progress": deleting_elements_progress,
                                 "creating_elements_progress": creating_elements_progress,
                                 "prediction_progress": prediction_progress,
                                 "delete_dataset_progress": delete_dataset_progress,
                                 "edit_dataset_progress": edit_dataset_progress,
                                 "training_time_remaining": training_time_remaining,
                                 "evaluation_progress": evaluation_progress}, status=status.HTTP_200_OK)
            else:
                return Response({'status': 'in progress'}, status=status.HTTP_200_OK)
        else:
            print(task.result)
            message = task.result[STATUS_TO_MESSAGE[task.result["status"]]]
            if len(message) > 400:
                message = message[:400] + "..."
            return Response({'status': 'failed', "message": message}, status=status.HTTP_200_OK)