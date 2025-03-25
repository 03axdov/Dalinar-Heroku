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
import time
import numpy as np

import tempfile
import os
import tensorflow as tf
from tensorflow.keras import layers

import boto3
from django.conf import settings

from django.core.files.base import ContentFile
from io import BytesIO
from PIL import Image
from django.core.files.storage import default_storage
from django.core.files import File
from django.http import StreamingHttpResponse

from .serializers import *
from .models import *
from Dalinar.tasks import train_model_task, train_model_tensorflow_dataset_task, evaluate_model_task, predict_model_task
import base64


# CONSTANTS

ALLOWED_IMAGE_FILE_EXTENSIONS = set(["png", "jpg", "jpeg", "webp", "avif"])


# HELPER FUNCTIONS

def get_s3_client():
    s3_client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME
    )
    return s3_client


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

def download_s3_file(bucket_name, file_key):
    s3_client = get_s3_client()
    response = s3_client.get_object(Bucket=bucket_name, Key=file_key)
    return response['Body'].read()  # Returns the raw bytes


# Function to load and preprocess the images
def load_and_preprocess_image(file_path,input_dims,file_key):
    
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    image_bytes = download_s3_file(bucket_name, file_key)

    # Decode the image
    image = tf.image.decode_jpeg(image_bytes, channels=input_dims[-1])  # Assuming JPEG images
    
    image = tf.image.resize(image, [input_dims[0], input_dims[1]])  # Input dimensions of model
    
    # Normalize the image to [0, 1]
    image = tf.cast(image, tf.float32) / 255.0
    return image


# Function to load and preprocess the text
def load_and_preprocess_text(file_path, file_key):
    
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    text_bytes = download_s3_file(bucket_name, file_key)
    
    # Decode the text bytes into a string
    text = tf.io.decode_utf8(text_bytes)  # Assuming UTF-8 encoded text
    
    return text


# Convert labels to numeric form (for classification, example with 2 labels)
label_map = {}  # Adjust based on your labels
currentLabel = 0
def map_labels(label):
    
    global label_map
    global currentLabel
    
    if label not in label_map.keys(): return None
    return label_map[label]


# Function to apply one-hot encoding
def one_hot_encode(label, nbr_labels):
    # Convert to one-hot encoded format
    return tf.keras.utils.to_categorical(label, num_classes=nbr_labels)


def create_tensorflow_dataset(dataset_instance, model_instance):    # Returns tensorflow dataset, number of elements in the dataset
    global label_map
    global currentLabel
    
    if not dataset_instance:
        return None
    
    # Initiate label_map
    label_map = {}
    num_labels = dataset_instance.labels.count()
    for t, label in enumerate(dataset_instance.labels.all()):
        label_map[label.name] = t
    
    first_layer = model_instance.layers.all().first()
    input_dims = (512,512,3)    # Just placeholder

    currentLabel = 0

    elements = dataset_instance.elements.all()

    file_paths = ["media/" + str(element.file) for element in elements]
    labels = []

    for t, element in enumerate(elements):
        if element.label:
            labels.append(element.label.name)
        else:
            file_paths.pop(t)   # Don't include elements without labels


    elementIdx = 0
    def imageMapFunc(file_path):
        nonlocal elementIdx
        
        element = load_and_preprocess_image(file_path,input_dims,file_path)
        elementIdx += 1
        return element
        
    def textMapFunc(file_path):
        nonlocal elementIdx
        
        element = load_and_preprocess_text(file_path,file_paths[elementIdx])
        elementIdx += 1
        return element


    if dataset_instance.dataset_type == "image":
        input_dims = (first_layer.input_x, first_layer.input_y, first_layer.input_z)
        
        file_paths = list(map(imageMapFunc, file_paths))
        
    elif dataset_instance.dataset_type == "text":
        file_paths = list(map(textMapFunc, file_paths))
    else:
        print("Invalid dataset type.")
        return None
    
    labels = list(map(lambda label: one_hot_encode(map_labels(label), num_labels), labels))

    # Create TensorFlow Dataset
    dataset = tf.data.Dataset.from_tensor_slices((file_paths, labels))

    dataset = dataset.batch(32)

    # Prefetch for performance (optional)
    # dataset = dataset.prefetch(tf.data.experimental.AUTOTUNE)
    
    return dataset, len(file_paths)



def get_tf_layer(layer):    # From a Layer instance
    layer_type = layer.layer_type
    activation = layer.activation_function or None
    
    if layer_type == "dense":
        if layer.input_x:
            return layers.Dense(layer.nodes_count, activation=activation, input_shape=(layer.input_x,))
        else:
            return layers.Dense(layer.nodes_count, activation=activation)
    elif layer_type == "conv2d":
        if layer.input_x or layer.input_y or layer.input_z:   # Dimensions specified
            return layers.Conv2D(layer.filters, layer.kernel_size, activation=activation, input_shape=(layer.input_x, layer.input_y, layer.input_z))
        else:
            return layers.Conv2D(layer.filters, layer.kernel_size, activation=activation)
    elif layer_type == "maxpool2d":
        return layers.MaxPool2D(pool_size=layer.pool_size)
    elif layer_type == "flatten":
        if layer.input_x or layer.input_y:   # Dimensions specified
            return layers.Flatten(input_shape=(layer.input_x, layer.input_y))
        else:
            return layers.Flatten()
    elif layer_type == "dropout":
        return layers.Dropout(rate=layer.rate)
    elif layer_type == "rescaling":
        if layer.input_x or layer.input_y or layer.input_z:   # Dimensions specified
            return layers.Rescaling(scale=layer.get_scale_value(), offset=layer.offset, input_shape=(layer.input_x, layer.input_y, layer.input_z))
        else:
            return layers.Rescaling(scale=layer.get_scale_value(), offset=layer.offset)
    elif layer_type == "randomflip":
        if layer.input_x or layer.input_y or layer.input_z:   # Dimensions specified
            return layers.RandomFlip(mode=layer.mode, input_shape=(layer.input_x, layer.input_y, layer.input_z))
        else:
            return layers.RandomFlip(mode=layer.mode)
    elif layer_type == "resizing":
        if layer.input_x or layer.input_y or layer.input_z:   # Dimensions specified
            return layers.Resizing(layer.output_y, layer.output_x, input_shape=(layer.input_x, layer.input_y, layer.input_z))
        else:
            return layers.Resizing(layer.output_y, layer.output_x)
    else:
        print("UNKNOWN LAYER OF TYPE: ", layer_type)
        raise Exception("Invalid layer: " + layer_type)


def layer_model_from_tf_layer(tf_layer, model_id, request, idx):    # Takes a TensorFlow layer and creates a Layer instance for the given model (if the layer is valid).
    config = tf_layer.get_config()
    
    data = {}
    
    input_shape = False
    if "batch_input_shape" in config.keys():
        input_shape = config["batch_input_shape"]
    
    if isinstance(tf_layer, layers.Dense):
        data["type"] = "dense"
        data["nodes_count"] = config["units"]
        if input_shape:
            data["input_x"] = input_shape[-1]
    elif isinstance(tf_layer, layers.Conv2D):
        data["type"] = "conv2d"
        data["filters"] = config["filters"]
        data["kernel_size"] = config["kernel_size"][0]
        if input_shape:
            data["input_x"] = input_shape[1]    # First one is None
            data["input_y"] = input_shape[2]
            data["input_z"] = input_shape[3]
    elif isinstance(tf_layer, layers.MaxPool2D):
        data["type"] = "maxpool2d"
        data["pool_size"] = config["pool_size"][0]
    elif isinstance(tf_layer, layers.Flatten):
        data["type"] = "flatten"
        if input_shape:
            data["input_x"] = input_shape[1]
            data["input_y"] = input_shape[2]
    elif isinstance(tf_layer, layers.Dropout):
        data["type"] = "dropout"
        data["rate"] = config["rate"]
    elif isinstance(tf_layer, layers.Rescaling):
        data["type"] = "rescaling"
        data["scale"] = config["scale"]
        data["offset"] = config["offset"]
        if input_shape:
            data["input_x"] = input_shape[1]
            data["input_y"] = input_shape[2]
            data["input_z"] = input_shape[3]
    elif isinstance(tf_layer, layers.RandomFlip):
        data["type"] = "randomflip"
        data["mode"] = config["mode"]
        if input_shape:
            data["input_x"] = input_shape[1]
            data["input_y"] = input_shape[2]
            data["input_z"] = input_shape[3]
    elif isinstance(tf_layer, layers.Resizing):
        data["type"] = "resizing"
        data["output_x"] = config["width"]
        data["output_y"] = config["height"]
        if input_shape:
            data["input_x"] = input_shape[1]
            data["input_y"] = input_shape[2]
            data["input_z"] = input_shape[3]
    else:
        print("UNKNOWN LAYER OF TYPE: ", layer_type)
        return # Continue instantiating model
    
    factory = APIRequestFactory()
    
    data["model"] = model_id
    data["index"] = idx
    data["activation_function"] = ""
    if "activation" in config.keys():
        data["activation_function"] = config["activation"]
    
    create_layer = CreateLayer.as_view()
    
    layer_request = factory.post('/create-layer/', data=json.dumps(data), content_type='application/json')
    layer_request.user = request.user
    
    layer_response = create_layer(layer_request)
    if layer_response.status_code != 200:
        return Response(
            {'Bad Request': f'Error creating layer {idx}'},
            status=layer_response.status_code
        )
    

def get_temp_model_name(id, timestamp, extension):
    return 'temp_model' + str(id) + "-" + str(timestamp) + '.' + extension
    
    
def get_tf_model(model_instance):     # Gets a Tensorflow model from a built Model instance
    # Define the S3 bucket and file path
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    model_file_path = "media/" + model_instance.model_file.name
    
    s3_client = get_s3_client()
    
    extension = model_file_path.split(".")[-1]
    
    timestamp = time.time()

    # Download the model file from S3 to a local temporary file
    temp_file_path = get_temp_model_name(model_instance.id, timestamp, extension)
    with open(temp_file_path, 'wb') as f:
        s3_client.download_fileobj(bucket_name, model_file_path, f)

    # Load the TensorFlow model from the temporary file
    model = tf.keras.models.load_model(temp_file_path)
    return model, timestamp
    
    
def remove_temp_tf_model(model_instance, timestamp):
    extension = str(model_instance.model_file).split(".")[-1]
    os.remove(get_temp_model_name(model_instance.id, timestamp, extension)) 
    
    
def preprocess_uploaded_image(uploaded_file, target_size=(256,256,3)):   # Convert uploaded files to tensors for TensorFlow processing
    image = Image.open(uploaded_file)
    
    # Convert to RGB (to handle grayscale images)
    if target_size[-1] == 3:
        image = image.convert("RGB")
    elif target_size[-1] == 4:
        image = image.convert("RGBA")
    elif target_size[-1] == 1:
        image = image.convert("I")
    
    # Resize the image to fit model requirements
    image = image.resize((target_size[0], target_size[1]))
    
    # Convert image to NumPy array
    image_array = np.array(image)
    
    # Normalize pixel values to [0,1]
    image_array = image_array / 255.0
    
    # Expand dimensions to match TensorFlow model input
    image_array = np.expand_dims(image_array, axis=0)  # Shape: (1, height, width, channels)
    
    # Convert to TensorFlow tensor
    image_tensor = tf.convert_to_tensor(image_array, dtype=tf.float32)
    
    return image_tensor


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
                                                                                            "color": random_light_color(),
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
                                
                    return Response(serializer.data, status=status.HTTP_200_OK)
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
                    dataset.keywords = list(filter(lambda el: el != "", keywords.split(",")))
                        
                    if imageWidth:
                        dataset.imageWidth = int(imageWidth)
                    else: dataset.imageWidth = None
                    if imageHeight:
                        dataset.imageHeight = int(imageHeight)
                    else: dataset.imageHeight = None
                        
                    if imageWidth and imageHeight:
                        for element in dataset.elements.all():
                            resize_element_image(element, int(imageHeight), int(imageWidth))
                        
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
                
                model_instance = serializer.save(owner=request.user.profile)
                
                createSmallImage(model_instance, 230, 190)    # Create a smaller image for displaying model elements
                
                if "model" in request.data.keys() and request.data["model"]:   # Uploaded model
                    model_file = request.data["model"]
                    extension = model_file.name.split(".")[-1]
                    temp_path = "temp_models/" + model_file.name
                    file_path = default_storage.save(temp_path, model_file.file)
                    
                    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
                    temp_model_file_path = "media/" + file_path
                    print(f"Model file saved at: {temp_model_file_path}")
                            
                    s3_client = get_s3_client()
                    
                    # Download the model file from S3 to a local temporary file
                    timestamp = time.time()
                    backend_temp_model_path = get_temp_model_name(model_instance.id, timestamp, extension)
                    with open(backend_temp_model_path, 'wb') as f:
                        s3_client.download_fileobj(bucket_name, temp_model_file_path, f)

                    model = tf.keras.models.load_model(backend_temp_model_path)
                    
                    default_storage.delete(file_path)
                    
                    os.remove(backend_temp_model_path)
                    
                    for t, layer in enumerate(model.layers):
                        layer_model_from_tf_layer(layer, model_instance.id, request, t)
                        
                    model_instance.model_file = model_file
                    model_instance.optimizer = model.optimizer.__class__.__name__.lower()
                    model_instance.loss_function = model.loss.__name__
                    
                    model_instance.save()
                       
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
                    for layer in model.layers.all():    # Workaround due to bug with Django Polymorphic
                        layer.delete()
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
        loss_function = request.data["loss"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                instance = Model.objects.get(id=model_id)
                
                if instance.owner == user.profile:
                    try:
                        model = tf.keras.Sequential()
                        
                        if instance.model_file:
                            instance.model_file.delete(save=False)
                        
                        for layer in instance.layers.all():
                            model.add(get_tf_layer(layer))

                        model.compile(optimizer=optimizer, loss=loss_function, metrics=['accuracy'])
                        
                        # Create a temporary file
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".keras") as temp_file:
                            temp_path = temp_file.name  # Get temp file path

                        # Save the model to the temp file
                        model.save(temp_path)
                        
                        # Open the file and save it to Django's FileField
                        with open(temp_path, 'rb') as model_file:
                            instance.model_file.save(instance.name + ".keras", File(model_file))

                        # Delete the temporary file after saving
                        os.remove(temp_path)
                        
                        instance.optimizer = optimizer
                        instance.loss_function = loss_function
                        
                        instance.trained_on = None
                        instance.trained_on_tensorflow = None
                        instance.trained_accuracy = None
                        
                        instance.evaluated_on = None
                        instance.evaluated_on_tensorflow = None
                        instance.evaluated_accuracy = None
                        
                        instance.save()
                        
                        return Response(None, status=status.HTTP_200_OK)
                
                    except ValueError as e: # In case of invalid layer combination
                        print("Error: ", e)
                        return Response({"Bad request": str(e)}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({"Unauthorized": "You can only build your own models."}, status=status.HTTP_401_UNAUTHORIZED)
            except Model.DoesNotExist:
                return Response({"Not found": "Could not find model with the id " + str(model_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Unauthorized": "Must be logged in to build models."}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class RecompileModel(APIView):
    parser_classes = [JSONParser]

    def post(self, request, format=None):
        model_id = request.data["id"]
        optimizer = request.data["optimizer"]
        loss_function = request.data["loss"]
        
        user = self.request.user
        
        if user.is_authenticated:
            try:
                model_instance = Model.objects.get(id=model_id)
                if not model_instance.model_file: return Response({"Bad request": "Model has not been built."}, status=status.HTTP_200_OK)
                
                if model_instance.owner == user.profile:
                    try:
                        model, timestamp = get_tf_model(model_instance)

                        model.compile(optimizer=optimizer, loss=loss_function, metrics=['accuracy'])
                        
                        # UPDATING MODEL_FILE
                        # Create a temporary file
                        with tempfile.NamedTemporaryFile(delete=False, suffix="."+extension) as temp_file:
                            temp_path = temp_file.name  # Get temp file path

                        # Save the model to the temp file
                        model.save(temp_path)
                        
                        model_instance.model_file.delete(save=False)
                        # Open the file and save it to Django's FileField
                        with open(temp_path, 'rb') as model_file:
                            model_instance.model_file.save(model_instance.name + "." + extension, File(model_file))

                        # Delete the temporary file after saving
                        remove_temp_tf_model(model_instance, timestamp)
                        
                        model_instance.optimizer = optimizer
                        model_instance.loss_function = loss_function
                        
                        model_instance.save()
                        
                        return Response(None, status=status.HTTP_200_OK)
                
                    except ValueError as e: # In case of invalid layer combination
                        print("Error: ", e)
                        return Response({"Bad request": str(e)}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({"Unauthorized": "You can only recompile your own models."}, status=status.HTTP_401_UNAUTHORIZED)
            except Model.DoesNotExist:
                return Response({"Not found": "Could not find model with the id " + str(model_id) + "."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"Unauthorized": "Must be logged in to recompile models."}, status=status.HTTP_401_UNAUTHORIZED)
      
      
class TrainingProgressCallback(tf.keras.callbacks.Callback):
    def __init__(self, profile, total_epochs):
        super().__init__()
        self.profile = profile
        self.total_epochs = total_epochs

    def on_epoch_end(self, epoch, logs=None):
        self.profile.training_progress = round((epoch + 1) / self.total_epochs, 4)
        self.profile.save()
        

class GetModelTrainingResult(APIView):
    lookup_url_kwarg = "id"
    
    def get(self, request, *args, **kwargs):
        task_id = kwargs[self.lookup_url_kwarg]
        
        from celery.result import AsyncResult
        task = AsyncResult(task_id)

        if task.state == 'SUCCESS' and task.result["status"] == 200:
            # Return the results in the HTTP response
            return Response({
                'status': 'Training completed',
                'accuracy': task.result['accuracy'],
                'loss': task.result['loss'],
                "val_accuracy": task.result["val_accuracy"],
                "val_loss": task.result["val_loss"]
            }, status=status.HTTP_200_OK)
        elif task.state == 'PENDING':
            user = self.request.user
            
            if user.is_authenticated:
                return Response({'status': 'Training in progress', "progress": user.profile.training_progress}, status=status.HTTP_200_OK)
            else:
                return Response({"Unauthorized": "Must be logged in to get training progress of model."}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({'status': 'Training failed'}, status=status.HTTP_200_OK)
        
        
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

    @tf.autograph.experimental.do_not_convert
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
            
            
class GetModelEvaluationResult(APIView):
    lookup_url_kwarg = "id"
    
    def get(self, request, *args, **kwargs):
        task_id = kwargs[self.lookup_url_kwarg]
        
        from celery.result import AsyncResult
        task = AsyncResult(task_id)

        if task.state == 'SUCCESS' and task.result["status"] == 200:
            # Return the results in the HTTP response
            return Response(task.result, status=status.HTTP_200_OK)
        elif task.state == 'PENDING':
            user = self.request.user
            
            if user.is_authenticated:
                return Response({'status': 'Evaluation in progress', "progress": user.profile.evaluation_progress}, status=status.HTTP_200_OK)
            else:
                return Response({"Unauthorized": "Must be logged in to get evaluation progress of model."}, status=status.HTTP_401_UNAUTHORIZED)

        else:
            return Response({'status': 'Evaluation failed'}, status=status.HTTP_200_OK)
            
  
class EvaluateModel(APIView):
    parser_classes = [JSONParser]

    @tf.autograph.experimental.do_not_convert
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
          
           
class PredictModel(APIView):
    parser_classes = [MultiPartParser, FormParser]
    
    @tf.autograph.experimental.do_not_convert
    def post(self, request, format=None):
        model_id = request.data["model"]
        images = request.data.getlist("images[]")
        print(images)
        encoded_images = [convert_image_to_base64(image) for image in images]
        text = request.data["text"]
        
        task = predict_model_task.delay(model_id, encoded_images, text)

        return Response({
            "message": "Prediction started",
            "task_id": task.id
        }, status=status.HTTP_200_OK)
        
        
class GetModelPredictionResult(APIView):
    lookup_url_kwarg = "id"
    
    def get(self, request, *args, **kwargs):
        task_id = kwargs[self.lookup_url_kwarg]
        
        from celery.result import AsyncResult
        task = AsyncResult(task_id)

        if task.state == 'SUCCESS' and task.result["status"] == 200:
            # Return the results in the HTTP response
            return Response(task.result, status=status.HTTP_200_OK)
        elif task.state == 'PENDING':
            return Response({'status': 'Prediction in progress'}, status=status.HTTP_200_OK)

        else:
            return Response({'status': 'Prediction failed'}, status=status.HTTP_200_OK)
       
       
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
           
           
# LAYER FUNCTIONALITY

class CreateLayer(APIView):
    serializer_class = CreateLayerSerializer
    parser_classes = [JSONParser]
    
    def post(self, request, format=None):
        data = self.request.data
        
        layer_type = data["type"]
        
        ALLOWED_TYPES = set(["dense", "conv2d", "flatten",
                             "dropout", "maxpool2d", "rescaling",
                             "randomflip", "resizing"])
        if not layer_type in ALLOWED_TYPES:
            return Response({"Bad Request": "Invalid layer type: " + layer_type}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = None
        parse_dimensions(request.data)
        if layer_type == "dense":
            serializer = CreateDenseLayerSerializer(data=data)
        elif layer_type == "conv2d":
            serializer = CreateConv2DLayerSerializer(data=data)
        elif layer_type == "maxpool2d":
            serializer = CreateMaxPool2DLayerSerializer(data=data)
        elif layer_type == "flatten":
            serializer = CreateFlattenLayerSerializer(data=data)
        elif layer_type == "dropout":
            serializer = CreateDropoutLayerSerializer(data=data)
        elif layer_type == "rescaling":
            serializer = CreateRescalingLayerSerializer(data=data)
        elif layer_type == "randomflip":
            serializer = CreateRandomFlipLayerSerializer(data=data)
        elif layer_type == "resizing":
            serializer = CreateResizingLayerSerializer(data=data)
        
        if serializer and serializer.is_valid():
            
            model_id = data["model"]
            try:
                model = Model.objects.get(id=model_id)
                
                user = self.request.user
                
                if user.is_authenticated:
                    
                    if user.profile == model.owner:
                        last = model.layers.all().last()
                        idx = 0
                        if last: 
                            idx = model.layers.all().last().index + 1
                        instance = serializer.save(model=model, layer_type=layer_type, index=idx, activation_function=data["activation_function"])
                            
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

                    parse_dimensions(request.data)
                    
                    if layer_type == "dense":
                        layer.nodes_count = request.data["nodes_count"]
                        layer.input_x = request.data["input_x"]
                    elif layer_type == "conv2d":
                        layer.filters = request.data["filters"]
                        layer.kernel_size = request.data["kernel_size"]
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
                    elif layer_type == "resizing":
                        layer.input_x = request.data["input_x"]
                        layer.input_y = request.data["input_y"]
                        layer.input_z = request.data["input_z"]
                        
                        layer.output_x = request.data["output_x"]
                        layer.output_y = request.data["output_y"]
                        
                    layer.activation_function = request.data["activation_function"]
                    layer.save()
                
                    return Response(LayerSerializer(layer).data, status=status.HTTP_200_OK)
                
                else:
                    return Response({'Unauthorized': 'You can only edit layers belonging to your own models.'}, status=status.HTTP_401_UNAUTHORIZED)
            except Layer.DoesNotExist:
                return Response({'Not found': 'Could not find model with the id ' + str(model_id) + '.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'Unauthorized': 'Must be logged in to edit layers.'}, status=status.HTTP_401_UNAUTHORIZED)