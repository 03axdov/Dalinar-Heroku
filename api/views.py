import requests
from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login
from django.contrib import messages
from rest_framework.response import Response
from django.db.models import Q, Count
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.urls import resolve
import json
from rest_framework.test import APIRequestFactory
import math

from django.core.files.base import ContentFile
from io import BytesIO
from PIL import Image
from django.core.files.storage import default_storage

from .serializers import *
from .models import *


# CONSTANTS

ALLOWED_IMAGE_FILE_EXTENSIONS = set(["png", "jpg", "jpeg", "webp", "avif"])


# HELPER FUNCTIONS

def createSmallImage(instance, target_width=230, target_height=190):
    img = Image.open(instance.image)
    
    new_name = instance.image.name.split("/")[-1]     # Otherwise includes files
    new_name, extension = new_name.split(".")     
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
    img_format = img.format if img.format else "JPEG"  # Default to JPEG
    img.save(buffer, format=img_format, quality=90)
    buffer.seek(0)
                            
    instance.imageSmall.save(new_name, ContentFile(buffer.read()), save=False)
    instance.save()
    

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
        
        return Response(data, status=status.HTTP_200_OK)


# DATASET HANDLING


class DatasetListPublic(generics.ListAPIView):
    serializer_class = DatasetSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        search = self.request.GET.get("search")
        if search == None: search = ""
        datasets = Dataset.objects.filter(Q(visibility="public") & (
            # Search handling
            Q(name__icontains=search) | (
                Q(
                    keywords__icontains=search
                )
            )
        ))
        return datasets


class DatasetListProfile(generics.ListCreateAPIView):
    serializer_class = DatasetSerializer
    permission_classes  = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = user.profile
        datasets = profile.datasets
        
        search = self.request.GET.get("search")
        if (search):
            datasets = datasets.filter(Q(name__contains=search) | (
                Q(
                    keywords__icontains=search
                )
            ))

        return datasets


class GetDataset(APIView):
    serializer_class = DatasetSerializer
    lookup_url_kwarg = 'id'
    
    def get(self, request, *args, **kwargs):
        user = self.request.user
        if user.is_authenticated:
            dataset_id = kwargs[self.lookup_url_kwarg]
                
            if dataset_id != None:
                try:
                    dataset = Dataset.objects.get(Q(id=dataset_id) & Q(Q(visibility = "public") | Q(owner=user.profile)))
                    
                    datasetSerialized = self.serializer_class(dataset)
                    data = datasetSerialized.data
                    data["ownername"] = dataset.owner.name
                    
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
                
                return Response(data, status=status.HTTP_200_OK)
                
            except Dataset.DoesNotExist:
                return Response({'Not found': 'No public dataset was found with the id ' + str(dataset_id) + '.'}, status=status.HTTP_404_NOT_FOUND)        
        
        else:
            return Response({'Bad Request': 'Id parameter not found in call to GetDataset.'}, status=status.HTTP_400_BAD_REQUEST)


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
                
                createSmallImage(dataset_instance, 230, 190)    # Create a smaller image for displaying dataset elements
                
                if "labels" in data_dict.keys():
                    labels = data_dict["labels"]
                    create_element = CreateElement.as_view()
                    create_label = CreateLabel.as_view()
                    edit_element_label = EditElementLabel.as_view()
                    
                    factory = APIRequestFactory()
                    for label in labels:
                        elements = data_dict[label]
                        
                        label_request = factory.post('/create-label/', data=json.dumps({"name": label,
                                                                                            "dataset": dataset_instance.id, 
                                                                                            "color": "#ffffff",
                                                                                            "keybind": ""}), content_type='application/json')
                        label_request.user = request.user
                        
                        label_response = create_label(label_request)
                        if label_response.status_code != 200:
                            return Response(
                                {'Bad Request': f'Error creating label {label}'},
                                status=label_response.status_code
                            )
                        
                        label_id = label_response.data["id"]
                        for element in elements:
                            element_request = factory.post("/create-element/", data={
                                "file": element,
                                "dataset": dataset_instance.id,
                            }, format="multipart")
                            element_request.user = request.user
                            
                            element_response = create_element(element_request)
                            if element_response.status_code != 200:
                                return Response(
                                    {'Bad Request': 'Error creating element'},
                                    status=element_response.status_code
                                )
                            
                            element_id = element_response.data["id"]
                            
                            label_element_request = factory.post("/edit-element-label/", data=json.dumps({
                                "label": label_id,
                                "id": element_id
                                }), content_type='application/json')
                            label_element_request.user = request.user
                            
                            label_element_response = edit_element_label(label_element_request)
                            if label_element_response.status_code != 200:
                                return Response(
                                    {'Bad Request': 'Error labelling element'},
                                    status=label_element_response.status_code
                                )
                else:            
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
                
                if dataset.owner == user.profile:
                    dataset.name = name
                    dataset.description = description   
                    if image: 
                        dataset.image.delete(save=False)
                        dataset.imageSmall.delete(save=False)
                        dataset.image = image
                        createSmallImage(dataset, 230, 190)
                        
                    dataset.visibility = visibility
                    if keywords:
                        dataset.keywords = keywords.split(",")
                    if imageWidth:
                        dataset.imageWidth = int(imageWidth)
                    else: dataset.imageWidth = None
                    if imageHeight:
                        dataset.imageHeight = int(imageHeight)
                    else: dataset.imageHeight = None
                        
                    dataset.save()
                
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
        
        
class DeleteDataset(APIView):
    serializer_class = DatasetSerializer
    
    def post(self, request, format=None):
        dataset_id = request.data["dataset"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                dataset = Dataset.objects.get(id=dataset_id)
                
                if dataset.owner == user.profile:
                    dataset.delete()
                    
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only delete your own datasets."}, status=status.HTTP_401_UNAUTHORIZED)
            except Dataset.DoesNotExist:
                return Response({"Not found": "Could not find dataset with the id " + str(dataset_id + ".")}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to delete datasets.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class ReorderDatasetElements(APIView):
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
                    for element in dataset.elements.all():
                        element.index = int(idToIdx[str(element.id)])
                        element.save()
        
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({"Unauthorized": "You can only reorder elements in your own datasets."}, status=status.HTTP_401_UNAUTHORIZED)
            except Dataset.DoesNotExist:
                return Response({"Not found": "Could not find dataset with the id " + str(dataset_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Unauthorized": "Must be logged in to reorder elements."}, status=status.HTTP_401_UNAUTHORIZED)
        
        
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
                        
                        fileExtension = instance.file.name.split("/")[-1].split(".")[-1]
                        # Resize images if dataset has specified dimensions
                        if dataset.imageHeight and dataset.imageWidth and fileExtension in ALLOWED_IMAGE_FILE_EXTENSIONS:
                            resize_element_image(instance, dataset.imageWidth, dataset.imageHeight)
                            
                        return Response({"data": serializer.data, "id": instance.id}, status=status.HTTP_200_OK)
                    
                    else:
                        return Response({'Unauthorized': 'You can only add elements to your own datasets.'}, status=status.HTTP_401_UNAUTHORIZED)
                
                else:
                    return Response({'Unauthorized': 'Must be logged in to create elements.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Dataset.DoesNotExist:
                return Response({'Not found': 'Could not find dataset with the id ' + str(dataset_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Bad Request": "An error occured while creating element"}, status=status.HTTP_400_BAD_REQUEST)
        
        
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
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                element = Element.objects.get(id=element_id)
                
                if element.owner == user.profile:
                    if name:
                        element.name = name
                        
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

class ModelListPublic(generics.ListAPIView):
    serializer_class = ModelSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        search = self.request.GET.get("search")
        if search == None: search = ""
        models = Model.objects.filter(Q(visibility="public") & (
            # Search handling
            Q(name__icontains=search)
        ))
        return models


class ModelListProfile(generics.ListCreateAPIView):
    serializer_class = ModelSerializer
    permission_classes  = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = user.profile
        models = profile.models
        
        search = self.request.GET.get("search")
        if (search):
            models = models.filter(Q(name__contains=search))

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
                    
                    trained_on_names = []
                    trained_on_visibility = []
                    for dataset in model.trained_on.all():
                        trained_on_names.append(dataset.name)
                        trained_on_visibility.append(dataset.visibility)
                        
                    data["trained_on_names"] = trained_on_names
                    data["trained_on_visibility"] = trained_on_visibility
                    
                    return Response(data, status=status.HTTP_200_OK)
                    
                except Model.DoesNotExist:
                    return Response({'Not found': 'No public model or model belonging to you was found with the id ' + str(model_id) + '.'}, status=status.HTTP_404_NOT_FOUND)        
            
            else:
                return Response({'Bad Request': 'Id parameter not found in call to GetModel.'}, status=status.HTTP_400_BAD_REQUEST)
            
        else:
            return Response({'Unauthorized': 'Must be logged in to get models.'}, status=status.HTTP_401_UNAUTHORIZED)
    

class CreateModel(APIView):
    serializer_class = CreateModelSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, format=None):
        data = request.data
        data_dict = dict(data)
        
        user = request.user
        
        if user.is_authenticated:
            serializer = self.serializer_class(data=data)

            if serializer.is_valid():
                
                model_instance = serializer.save(owner=request.user.profile)
                
                createSmallImage(model_instance, 230, 190)    # Create a smaller image for displaying model elements
                       
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response({'Bad Request': 'An error occurred while creating model.'}, status=status.HTTP_400_BAD_REQUEST)
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
        pass
           
        
# LAYER FUNCTIONALITY

class CreateLayer(APIView):
    serializer_class = CreateLayerSerializer
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        data = self.request.data
        
        layer_type = data["type"]   # One of ["dense", "conv2d"]
        
        ALLOWED_TYPES = set(["dense", "conv2d", "flatten"])
        if not layer_type in ALLOWED_TYPES:
            return Response({"Bad Request": "Invalid layer type: " + layer_type}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = None
        if layer_type == "dense":
            serializer = CreateDenseLayerSerializer(data=data)
        elif layer_type == "conv2d":
            serializer = CreateConv2DLayerSerializer(data=data)
        elif layer_type == "flatten":
            serializer = CreateFlattenLayerSerializer(data=data)
        
        if serializer and serializer.is_valid():
            
            model_id = data["model"]
            try:
                model = Model.objects.get(id=model_id)
                
                user = self.request.user
                
                if user.is_authenticated:
                    
                    if user.profile == model.owner:
                        instance = serializer.save(model=model, layer_type=layer_type, index=data["index"], activation_function=data["activation_function"])
                            
                        return Response({"data": serializer.data, "id": instance.id}, status=status.HTTP_200_OK)
                    
                    
                    else:
                        return Response({'Unauthorized': 'You can only add layers to your own models.'}, status=status.HTTP_401_UNAUTHORIZED)
                else:
                    return Response({'Unauthorized': 'Must be logged in to create layers.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Model.DoesNotExist:
                return Response({'Not found': 'Could not find model with the id ' + str(model_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Bad Request": "An error occured while creating layer."}, status=status.HTTP_400_BAD_REQUEST)
        
        
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
                    if layer_type == "dense":
                        layer.nodes_count = request.data["nodes_count"]
                    elif layer_type == "conv2d":
                        layer.filters = request.data["filters"]
                        layer.kernel_size = request.data["kernel_size"]
                    elif layer_type == "flatten":
                        layer.input_x = request.data["input_x"]
                        layer.input_y = request.data["input_y"]
                        
                    layer.save()
                
                    return Response(None, status=status.HTTP_200_OK)
                
                else:
                    return Response({'Unauthorized': 'You can only edit layers belonging to your own models.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Layer.DoesNotExist:
                return Response({'Not found': 'Could not find model with the id ' + str(model_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to edit layers.'}, status=status.HTTP_401_UNAUTHORIZED)