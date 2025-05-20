from celery import shared_task
import numpy as np
import os
import re
import time
import boto3
import base64
from django.conf import settings
import tempfile
from django.core.files import File
from io import BytesIO
from rest_framework.test import APIRequestFactory
from django.core.files.storage import default_storage
import shutil

from .serializers import *
from .models import *
from .model_utils import create_layer_instance 

import logging
logger = logging.getLogger(__name__)


def get_s3_client():
    s3_client = boto3.client(
        's3',
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME
    )
    return s3_client


# Negative progress resets variables
def set_training_progress(profile, progress):
    profile.training_progress = progress
    if progress == -1:
        profile.training_accuracy = -1
        profile.training_loss = -1
        profile.training_time_remaining = ""
    profile.save()


def get_temp_model_name(id, timestamp, extension, user_id=None):   # Timestamp used if user (user_id) not specified
    base_path = '/tmp/temp_models' if os.name != 'nt' else 'tmp/temp_models'  # Use local path on Windows
    os.makedirs(base_path, exist_ok=True)  # make sure the folder exists

    if user_id:
        filename = f"temp_model-{id}-{user_id}.{extension}"
    else:
        filename = f"temp_model-{id}-{timestamp}.{extension}"
    
    return os.path.join(base_path, filename)


def get_pretrained_model(name):
    import tensorflow as tf
    
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    model_file_path = f"media/pretrained_models/{name}.keras"
    s3_client = get_s3_client()

    with tempfile.NamedTemporaryFile(suffix=".keras", delete=False) as tmp:
        s3_client.download_fileobj(bucket_name, model_file_path, tmp)
        temp_file_path = tmp.name
        tmp.flush()  # <-- Important

    try:
        model = tf.keras.models.load_model(temp_file_path)
        model.trainable = False

    finally:
        # Only delete after loading is fully complete
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    return model
    
    
def get_tf_model(model_instance, profile=None):
    import tensorflow as tf
    
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    model_file_path = "media/" + model_instance.model_file.name
    s3_client = get_s3_client()

    extension = model_file_path.split(".")[-1]
    timestamp = time.time()

    # Download model to a temp file
    with tempfile.NamedTemporaryFile(suffix=f".{extension}", delete=False) as tmp:
        s3_client.download_fileobj(bucket_name, model_file_path, tmp)
        temp_file_path = tmp.name
        tmp.flush()  # <-- Important

    try:
        model = tf.keras.models.load_model(temp_file_path)
    finally:
        # Always clean up
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

    # Return model and timestamp (still useful for logging or ongoing tasks)
    return model, timestamp
        

def get_tf_layer(layer):    # From a Layer instance
    import tensorflow as tf
    from tensorflow.keras import layers
    
    layer_type = layer.layer_type
    activation = layer.activation_function or None
    name = str(layer.id)
    
    if layer_type == "dense":
        if layer.input_x:
            return layers.Dense(layer.nodes_count, activation=activation, input_shape=(layer.input_x,), name=name)
        else:
            return layers.Dense(layer.nodes_count, activation=activation, name=name)
    elif layer_type == "conv2d":
        if layer.input_x or layer.input_y or layer.input_z:   # Dimensions specified
            return layers.Conv2D(layer.filters, layer.kernel_size, padding=layer.padding, activation=activation, input_shape=(layer.input_x, layer.input_y, layer.input_z), name=name)
        else:
            return layers.Conv2D(layer.filters, layer.kernel_size, padding=layer.padding, activation=activation, name=name)
    elif layer_type == "maxpool2d":
        return layers.MaxPool2D(pool_size=layer.pool_size, name=name)
    elif layer_type == "flatten":
        if layer.input_x or layer.input_y:   # Dimensions specified
            return layers.Flatten(input_shape=(layer.input_x, layer.input_y), name=name)
        else:
            return layers.Flatten(name=name)
    elif layer_type == "dropout":
        return layers.Dropout(rate=layer.rate, name=name)
    elif layer_type == "rescaling":
        if layer.input_x or layer.input_y or layer.input_z:   # Dimensions specified
            return layers.Rescaling(scale=layer.get_scale_value(), offset=layer.offset, input_shape=(layer.input_x, layer.input_y, layer.input_z), name=name)
        else:
            return layers.Rescaling(scale=layer.get_scale_value(), offset=layer.offset, name=name)
    elif layer_type == "randomflip":
        if layer.input_x or layer.input_y or layer.input_z:   # Dimensions specified
            return layers.RandomFlip(mode=layer.mode, input_shape=(layer.input_x, layer.input_y, layer.input_z), name=name)
        else:
            return layers.RandomFlip(mode=layer.mode, name=name)
    elif layer_type == "randomrotation":
        if layer.input_x or layer.input_y or layer.input_z:   # Dimensions specified
            return layers.RandomRotation(layer.factor, input_shape=(layer.input_x, layer.input_y, layer.input_z), name=name)
        else:
            return layers.RandomRotation(layer.factor, name=name)
    elif layer_type == "resizing":
        if layer.input_x or layer.input_y or layer.input_z:   # Dimensions specified
            return layers.Resizing(layer.output_y, layer.output_x, input_shape=(layer.input_x, layer.input_y, layer.input_z),name=name)
        else:
            return layers.Resizing(layer.output_y, layer.output_x)
    elif layer_type == "textvectorization":
        return layers.TextVectorization(max_tokens=layer.max_tokens, standardize=layer.standardize, output_sequence_length=layer.output_sequence_length, name=name)
    elif layer_type == "embedding":
        return layers.Embedding(layer.max_tokens, layer.output_dim, name=name)
    elif layer_type == "globalaveragepooling1d":
        return layers.GlobalAveragePooling1D(name=name)
    elif layer_type == "mobilenetv2":
        model = get_pretrained_model("mobilenetv2")
        return model
    elif layer_type == "mobilenetv2_96x96":
        model = get_pretrained_model("mobilenetv2_96x96")
        return model

    else:
        print("UNKNOWN LAYER OF TYPE: ", layer_type)
        raise Exception("Invalid layer: " + layer_type)


def download_s3_file(bucket_name, file_key):
    s3_client = get_s3_client()
    response = s3_client.get_object(Bucket=bucket_name, Key=file_key)
    return response['Body'].read()  # Returns the raw bytes


def download_dataset_from_s3(bucket_name, prefix, local_dir, profile, nbr_files):
    s3 = get_s3_client()
    paginator = s3.get_paginator('list_objects_v2')

    # Make sure the root download folder exists
    os.makedirs(local_dir, exist_ok=True)

    for page in paginator.paginate(Bucket=bucket_name, Prefix=prefix):
        contents = page.get('Contents', [])

        for t, obj in enumerate(contents):
            key = obj['Key']
            if key.endswith('/'):
                continue

            found_any = True
            # Construct relative and full local path
            relative_path = os.path.relpath(key, prefix)
            local_path = os.path.join(local_dir, relative_path)

            # Ensure subdirectory exists
            os.makedirs(os.path.dirname(local_path), exist_ok=True)

            # Download the file
            try:
                s3.download_file(bucket_name, key, local_path)
            except Exception as e:
                print(f"Error downloading {key}: {e}")
            
            profile.processing_data_progress = (t + 1) / nbr_files
            profile.save()

# Function to load and preprocess the images
def load_and_preprocess_image(file_path,input_dims):
    import tensorflow as tf
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
    
    image_bytes = tf.io.read_file(file_path)

    # Decode the image
    image = tf.image.decode_jpeg(image_bytes, channels=input_dims[-1])  # Assuming JPEG images
    
    image = tf.cast(image, tf.float32)
    
    image_shape = image.shape

    if image_shape[0] != input_dims[0] or image_shape[1] != input_dims[1]:
        image = tf.image.resize(image, [input_dims[0], input_dims[1]])  # Input dimensions of model
    
    image = preprocess_input(image)
    
    return image


# Function to load and preprocess the text
def remove_non_ascii(s):
    return re.sub(r'[^\x00-\x7F]', '', s)

def load_and_preprocess_text(file_path):
    import tensorflow as tf
    with open(file_path, "r", encoding="utf-8") as f:
        text = f.read()
    
    text = remove_non_ascii(text)
    
    return tf.convert_to_tensor(text, dtype=tf.string)


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
    import tensorflow as tf
    # Convert to one-hot encoded format
    return tf.keras.utils.to_categorical(label, num_classes=nbr_labels)

def label_to_tensor(label):
    import tensorflow as tf
    return tf.constant(label, dtype=tf.int32)


def create_tensorflow_dataset(dataset_instance, model_instance, profile):    # Returns tensorflow dataset, number of elements in the dataset
    import tensorflow as tf
    
    global label_map
    global currentLabel
    
    if not dataset_instance:
        return None
    
    # Initiate label_map
    label_map = {}
    num_labels = dataset_instance.labels.count()
    for t, label in enumerate(dataset_instance.labels.all().order_by('id')):    # Order by ID so reordering / renaming doesn't impact order
        label_map[label.name] = t
    
    first_layer = model_instance.layers.all().first()
    input_dims = (512,512,3)    # Just placeholder, updated later

    currentLabel = 0

    elements = dataset_instance.elements.all()
    
    AWS_DIR = f"media/files/{dataset_instance.id}/" # Update when changed
    local_dir = os.path.abspath(f"tmp/temp_datasets/{dataset_instance.name}-{profile.user.id}")
    
    try:
        download_dataset_from_s3(
            bucket_name=settings.AWS_STORAGE_BUCKET_NAME,
            prefix=AWS_DIR,
            local_dir=local_dir,
            profile=profile,
            nbr_files = elements.count()
        )
        
        profile.processing_data_progress = 0
        profile.save()
        
        def get_all_file_paths(directory):
            return [
                os.path.join(directory, f)
                for f in os.listdir(directory)
                if os.path.isfile(os.path.join(directory, f))
            ]
            
        file_paths = []
        labels = []

        for t, element in enumerate(elements):
            if element.label:
                filename = os.path.basename(element.file.name)
                file_paths.append(os.path.join(local_dir, filename))
                labels.append(element.label.name)


        def imageMapFunc(file_path):
            element = load_and_preprocess_image(file_path,input_dims)
            return element
            
        def textMapFunc(file_path):
            element = load_and_preprocess_text(file_path,file_paths[elementIdx])
            return element


        elements = []
        if dataset_instance.dataset_type == "image":
            input_dims = (first_layer.input_x, first_layer.input_y, first_layer.input_z) 
            if first_layer.layer_type == "mobilenetv2":
                input_dims = (224,224,3)
            if first_layer.layer_type == "mobilenetv2_96x96":
                input_dims = (96,96,3)
            elements = list(map(imageMapFunc, file_paths))
            
        elif dataset_instance.dataset_type == "text":
            elements = list(map(textMapFunc, file_paths))

        else:
            print("Invalid dataset type.")
            return None
        
        if os.path.exists(local_dir):
            shutil.rmtree(local_dir)
        
        loss_function = model_instance.loss_function
        if loss_function == "binary_crossentropy":
            labels = list(map(lambda label: label_to_tensor(map_labels(label)), labels))
        elif loss_function == "categorical_crossentropy":
            labels = list(map(lambda label: one_hot_encode(map_labels(label), num_labels), labels))
        elif loss_function == "sparse_categorical_crossentropy":
            labels = list(map(lambda label: map_labels(label), labels))

        dataset = tf.data.Dataset.from_tensor_slices((elements, labels))
        
        return dataset, len(elements)
    
    except Exception as e:
        if os.path.exists(local_dir):
            shutil.rmtree(local_dir)

        raise Exception(e)
    

def clean_vocab(vocab):
    seen = set()
    cleaned = []
    for word in vocab:
        clean_word = remove_non_ascii(word).strip()
        if clean_word and clean_word not in seen:
            cleaned.append(clean_word)
            seen.add(clean_word)
    return cleaned

def get_vectorize_layer(model_instance, model, train_ds, vocabulary=None):
    import tensorflow as tf
    from tensorflow.keras import layers
    
    vectorize_layer = None
    first_layer = model.layers[0]

    if isinstance(first_layer, layers.TextVectorization): # Text vectorization no longer supported so only happens if already trained.
        vectorize_layer = model.layers[0]
    else:
        max_tokens = 10000
        if model_instance.layers.first().layer_type.lower() == "embedding":
            max_tokens = model_instance.layers.first().max_tokens
        vectorize_layer = layers.TextVectorization(
            standardize="lower_and_strip_punctuation",
            max_tokens=max_tokens,
            output_sequence_length=model_instance.input_sequence_length 
        )
        
    if not vocabulary:
        train_text = train_ds.map(lambda x, y: x)
        vectorize_layer.adapt(train_text)
    else:
        max_tokens = vectorize_layer.get_config().get("max_tokens", 10000)
        num_reserved_tokens = 2  # adjust based on your setup
        vectorize_layer.set_vocabulary(clean_vocab(vocabulary[:max_tokens - num_reserved_tokens]))

    if not isinstance(first_layer, layers.TextVectorization):
        model_with_preprocessing = tf.keras.Sequential([
            vectorize_layer,
            model
        ])
    
        metrics = get_metrics(model_instance.loss_function)
        model_with_preprocessing.compile(optimizer=model_instance.optimizer, loss=model_instance.loss_function, metrics=[metrics])
    
        return model_with_preprocessing
    
    else:
        return model
    
    
@shared_task(bind=True)
def delete_dataset_task(self, dataset_id, user_id):
    import tensorflow as tf
    
    try:
        profile = Profile.objects.get(user_id=user_id)
        dataset = Dataset.objects.get(id=dataset_id)
        
        if dataset.owner == profile:
            totalCount = dataset.elements.count()
            for t, element in enumerate(dataset.elements.all()):
                if t % 10 == 0:
                    profile.delete_dataset_progress = (t + 1) / totalCount
                    profile.save()
                element.delete()
            profile.delete_dataset_progress = 0
            profile.save()
            dataset.delete()
            
            return {"status": 200}
        
        else:
            return {"Unauthorized": "You can only delete your own datasets.", "status": 401}
    except Dataset.DoesNotExist:
        return {"Not found": "Could not find dataset with the id " + str(dataset_id + "."), "status": 404}
    except Profile.DoesNotExist:
        return {"Not found": "Could not find profile with the id " + str(user_id + "."), "status": 404}
    
    
@shared_task(bind=True)
def delete_all_elements_task(self, dataset_id, user_id):
    import tensorflow as tf
    
    try:
        profile = Profile.objects.get(user_id=user_id)
        dataset = Dataset.objects.get(id=dataset_id)
        
        if dataset.owner == profile:
            totalCount = dataset.elements.count()
            for t, element in enumerate(dataset.elements.all()):
                if t % 10 == 0:
                    profile.deleting_elements_progress = (t + 1) / totalCount
                    profile.save()
                element.delete()
            profile.deleting_elements_progress = 0
            profile.save()
            
            return {"status": 200}
        
        else:
            return {"Unauthorized": "You can only delete elements from your own datasets.", "status": 401}
    except Dataset.DoesNotExist:
        return {"Not found": "Could not find dataset with the id " + str(dataset_id + "."), "status": 404}
    except Profile.DoesNotExist:
        return {"Not found": "Could not find profile with the id " + str(user_id + "."), "status": 404}
    

def get_accuracy_loss(history, model_instance, validation_size):
    metric = "accuracy"
    if model_instance.loss_function == "binary_crossentropy":
        metric = "binary_accuracy"
    accuracy = history.history[metric]
    loss = history.history["loss"]
    val_accuracy = []
    val_loss = []
    if validation_size >= 1:
        val_accuracy = history.history["val_" + metric]
        val_loss = history.history["val_loss"]
    return accuracy, val_accuracy, loss, val_loss

@shared_task(bind=True)
def train_model_task(self, model_id, dataset_id, epochs, validation_split, user_id):
    import tensorflow as tf
    
    class TrainingProgressCallback(tf.keras.callbacks.Callback):
        def __init__(self, profile, total_epochs):
            super().__init__()
            self.profile = profile
            self.total_epochs = total_epochs
            self.epoch_start_time = None
            self.total_elapsed_time = 0

        def on_epoch_begin(self, epoch, logs=None):
            self.epoch_start_time = time.time()

        def on_epoch_end(self, epoch, logs=None):
            epoch_duration = time.time() - self.epoch_start_time
            self.total_elapsed_time += epoch_duration
            
            if logs:
                self.profile.training_accuracy = logs["accuracy"]  # set_training_progress saves
                self.profile.training_loss = logs["loss"] 
            
            avg_time_per_epoch = self.total_elapsed_time / (epoch + 1)
            remaining_epochs = self.total_epochs - (epoch + 1)
            estimated_remaining_time = avg_time_per_epoch * remaining_epochs

            formatted_time = time.strftime("%H:%M:%S", time.gmtime(estimated_remaining_time))
            self.profile.training_time_remaining = formatted_time
            
            progress = (epoch + 1) / self.total_epochs
            set_training_progress(self.profile, round(progress, 4)) # Saves profile

    
    profile = Profile.objects.get(user_id=user_id)
    
    try:
        logger.info("Starting task for model %d and dataset %d", model_id, dataset_id)
        
        model_instance = Model.objects.get(id=model_id)
        
        dataset_instance = Dataset.objects.get(id=dataset_id)
        
        if model_instance.owner == profile:
            
            set_training_progress(profile, -1)
            
            if model_instance.model_file:
                
                timestamp = ""
                try:
                    extension = str(model_instance.model_file).split(".")[-1]
                    
                    model, timestamp = get_tf_model(model_instance, profile=profile)
                    if timestamp < 0: return {"Bad request": "You have an ongoing task on this model. Please wait until it finishes.", "status": 400}
                    if model.output_shape[-1] != dataset_instance.labels.count():
                        return {"Bad request": "The model's output shape and the dataset's number of labels do not match.", "status": 400}

                    dataset, dataset_length = create_tensorflow_dataset(dataset_instance, model_instance, profile)

                    validation_size = int(dataset_length * validation_split)
                    train_size = dataset_length - validation_size
                    
                    model.summary() # For debugging
                    
                    progress_callback = TrainingProgressCallback(profile=profile, total_epochs=epochs)

                    if validation_size >= 1: # Some dataset are too small for validation
                        dataset = dataset.shuffle(1000)
                        train_dataset = dataset.take(train_size)
                        validation_dataset = dataset.skip(train_size)
                    
                        set_training_progress(profile, 0)
                        
                        
                        if model_instance.model_type.lower() == "text": # Must be initialized
                            model = get_vectorize_layer(model_instance, model, train_dataset)

                        train_dataset = train_dataset.batch(32).prefetch(tf.data.experimental.AUTOTUNE)
                        validation_dataset = validation_dataset.batch(32).prefetch(tf.data.experimental.AUTOTUNE)
                    
                        history = model.fit(train_dataset, 
                                            epochs=epochs, 
                                            validation_data=validation_dataset,
                                            callbacks=[progress_callback])
                    else:
                        set_training_progress(profile, 0)
                        
                        if model_instance.model_type.lower() == "text": # Must be initialized
                            model = get_vectorize_layer(model_instance, model, dataset)
                            
                        dataset = dataset.shuffle(1000).batch(32).prefetch(tf.data.experimental.AUTOTUNE)
                        
                        history = model.fit(dataset, 
                                            epochs=epochs,
                                            callbacks=[progress_callback])
                    
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
                    
                    accuracy, val_accuracy, loss, val_loss = get_accuracy_loss(history, model_instance, validation_size)
                    
                    # UPDATING MODEL TRAINED_ON
                    model_instance.trained_on = dataset_instance
                    model_instance.trained_on_tensorflow = None
                    
                    model_instance.accuracy = accuracy
                    model_instance.val_accuracy = val_accuracy
                    model_instance.loss = loss
                    model_instance.val_loss = val_loss
                    
                    model_instance.val_split = validation_split
                    
                    model_instance.save()
                    
                    set_training_progress(profile, -1)
            
                    return {"accuracy": accuracy, "loss": loss, "val_accuracy": val_accuracy, "val_loss": val_loss, "status": 200}
                
                except ValueError as e: # In case of invalid layer combination
                    set_training_progress(profile, -1)

                    message = str(e)
                    if len(message) > 50:
                        message = message.split("ValueError: ")[-1]    # Skips long traceback for long errors

                    return {"Bad request": str(message), "status": 400}
                except Exception as e:
                    set_training_progress(profile, -1)

                    return {"Bad request": str(e), "status": 400}
            else:
                return {"Bad request": "Model has not been built.", "status": 400}
        else:
            return {"Unauthorized": "You can only train your own models.", "status": 401}
    except Model.DoesNotExist:
        return {"Not found": "Could not find model with the id " + str(model_id) + ".", "status": 404}
    except Dataset.DoesNotExist:
        return {"Not found": "Could not find dataset with the id " + str(dataset_id) + ".", "status": 404}
    except Exception as e:
        set_training_progress(profile, -1)
        return {"Bad request": str(e), "status": 400}
    

def getTensorflowPrebuiltDataset(tensorflowDataset):
    import tensorflow as tf
    
    if tensorflowDataset == "cifar10":
        return tf.keras.datasets.cifar10.load_data()
    elif tensorflowDataset == "cifar100":
        return tf.keras.datasets.cifar100.load_data()
    elif tensorflowDataset == "fashion_mnist":
        return tf.keras.datasets.fashion_mnist.load_data()
    elif tensorflowDataset == "imdb":
        return tf.keras.datasets.imdb.load_data(num_words=10000)
    elif tensorflowDataset == "mnist":
        return tf.keras.datasets.mnist.load_data()
    elif tensorflowDataset == "reuters":
        return tf.keras.datasets.reuters.load_data(num_words=10000)
    else:
        raise Exception("Invalid dataset.")
    
def getTensorflowDatasetVocabulary(tensorflowDataset):
    import tensorflow as tf
    
    word_index = {}
    if tensorflowDataset == "imdb":
        word_index = tf.keras.datasets.imdb.get_word_index()
    elif tensorflowDataset == "reuters":
        word_index = tf.keras.datasets.reuters.get_word_index()
    
    index_to_word = [None] * (max(word_index.values()) + 1)
    for word, index in word_index.items():
        index_to_word[index] = word

    # Remove None entries if any
    vocab = [word for word in index_to_word if word is not None]
    return vocab

tf_dataset_num_classes = {
    "cifar10": 10,
    "cifar100": 100,
    "fashion_mnist": 10,
    "mnist": 10
}

@shared_task(bind=True)
def train_model_tensorflow_dataset_task(self, tensorflowDataset, model_id, epochs, validation_split, user_id):
    import tensorflow as tf
    from tensorflow.keras.preprocessing.sequence import pad_sequences
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
    from tensorflow.keras.utils import to_categorical
    
    class TrainingProgressCallback(tf.keras.callbacks.Callback):
        def __init__(self, profile, total_epochs):
            super().__init__()
            self.profile = profile
            self.total_epochs = total_epochs
            self.epoch_start_time = None
            self.total_elapsed_time = 0

        def on_epoch_begin(self, epoch, logs=None):
            self.epoch_start_time = time.time()

        def on_epoch_end(self, epoch, logs=None):
            epoch_duration = time.time() - self.epoch_start_time
            self.total_elapsed_time += epoch_duration
            
            if logs:
                self.profile.training_accuracy = logs["accuracy"]  # set_training_progress saves
                self.profile.training_loss = logs["loss"] 
            
            avg_time_per_epoch = self.total_elapsed_time / (epoch + 1)
            remaining_epochs = self.total_epochs - (epoch + 1)
            estimated_remaining_time = avg_time_per_epoch * remaining_epochs

            formatted_time = time.strftime("%H:%M:%S", time.gmtime(estimated_remaining_time))
            self.profile.training_time_remaining = formatted_time
            
            progress = (epoch + 1) / self.total_epochs
            set_training_progress(self.profile, round(progress, 4)) # Saves profile

    profile = Profile.objects.get(user_id=user_id)
    
    try:
        model_instance = Model.objects.get(id=model_id)
        last_layer = model_instance.layers.last()
        
        (x_train, y_train), (x_test, y_test) = getTensorflowPrebuiltDataset(tensorflowDataset=tensorflowDataset)

        if model_instance.model_type.lower() == "text":
            x_train = pad_sequences(x_train, maxlen=model_instance.input_sequence_length)
        if last_layer.layer_type == "dense" and last_layer.nodes_count > 1 and model_instance.loss_function != "sparse_categorical_crossentropy":
            y_train = to_categorical(y_train, num_classes=tf_dataset_num_classes[tensorflowDataset])
            
        dataset = tf.data.Dataset.from_tensor_slices((x_train, y_train))
        
        if model_instance.model_type.lower() == "image":
            first_layer = model_instance.layers.first()
            input_dims = (first_layer.input_x, first_layer.input_y, first_layer.input_z) 
            if first_layer.layer_type == "mobilenetv2":
                input_dims = (224,224,3)
            if first_layer.layer_type == "mobilenetv2_96x96":
                input_dims = (96,96,3)
                
            def imageMapFunc(image, label):
                image = tf.cast(image, tf.float32)
                image = tf.image.resize(image, [input_dims[0], input_dims[1]])
                image = preprocess_input(image)
                return image, label

            dataset = dataset.map(imageMapFunc, num_parallel_calls=tf.data.AUTOTUNE)
        
        if model_instance.owner == profile:
            
            set_training_progress(profile, -1)
            
            if model_instance.model_file:
                timestamp = ""
                try:
                    extension = str(model_instance.model_file).split(".")[-1]
                    
                    model, timestamp = get_tf_model(model_instance, profile=profile)
                    if timestamp < 0: return {"Bad request": "You have an ongoing task on this model. Please wait until it finishes.", "status": 400}
                    
                    model.summary()
                    
                    vectorize_layer = None
                    metrics = get_metrics(model_instance.loss_function)
                    
                    if model_instance.model_type.lower() == "text": # Must be initialized
                        vocab = getTensorflowDatasetVocabulary(tensorflowDataset)

                        model = get_vectorize_layer(model_instance, model, dataset, vocab)
                        
                        vectorize_layer = model.layers[0]
                        newModel = tf.keras.Sequential([])
                        for layer in model.layers[1:]:
                            newModel.add(layer)
                        model = newModel
                        model.compile(optimizer=model_instance.optimizer, loss=model_instance.loss_function, metrics=[metrics])
                    
                    dataset_length = dataset.cardinality().numpy()
                    validation_size = int(dataset_length * validation_split)
                    train_size = dataset_length - validation_size
                    
                    progress_callback = TrainingProgressCallback(profile=profile, total_epochs=epochs)

                    set_training_progress(profile, 0)

                    if validation_size >= 1: # Some dataset are too small for validation
                        dataset = dataset.shuffle(1000)
                        train_dataset = dataset.take(train_size).batch(32).prefetch(tf.data.experimental.AUTOTUNE)
                        validation_dataset = dataset.skip(train_size).batch(32).prefetch(tf.data.experimental.AUTOTUNE)
                    
                        history = model.fit(train_dataset, 
                                            epochs=epochs, 
                                            validation_data=validation_dataset,
                                            callbacks=[progress_callback])
                    else:
                        dataset = dataset.shuffle(1000).batch(32).prefetch(tf.data.experimental.AUTOTUNE)
                        history = model.fit(dataset, 
                                            epochs=epochs,
                                            callbacks=[progress_callback])
                        
                    if model_instance.model_type.lower() == "text": # Add back the now-updated vectorize layer
                        model = tf.keras.Sequential([
                            vectorize_layer,
                            model
                        ])
                        model.compile(optimizer=model_instance.optimizer, loss=model_instance.loss_function, metrics=[metrics])
                        _ = model(tf.constant([["for building the model"]], dtype=tf.string))
                    
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
                    
                    accuracy, val_accuracy, loss, val_loss = get_accuracy_loss(history, model_instance, validation_size)
                        
                    model_instance.trained_on = None
                    model_instance.trained_on_tensorflow = tensorflowDataset
                    
                    model_instance.accuracy = accuracy
                    model_instance.val_accuracy = val_accuracy
                    model_instance.loss = loss
                    model_instance.val_loss = val_loss
                    
                    model_instance.val_split = validation_split
                    
                    model_instance.save()
                    
                    set_training_progress(profile, -1)
            
                    return{"accuracy": accuracy, "loss": loss, "val_accuracy": val_accuracy, "val_loss": val_loss, "status": 200}
                
                except ValueError as e: # In case of invalid layer combination
                    set_training_progress(profile, -1)
                    
                    message = str(e)

                    if len(message) > 50:
                        message = message.split("ValueError: ")[-1]    # Skips long traceback for long errors

                    return {"Bad request": str(message), "status": 400}
                except Exception as e:
                    set_training_progress(profile, -1)
                    
                    return {"Bad request": str(e), "status": 400}
            else:
                return {"Bad request": "Model has not been built.", "status": 400}
        else:
            {"Unauthorized": "You can only train your own models.", "status": 401}
    except Model.DoesNotExist:
        return {"Not found": "Could not find model with the id " + str(model_id) + ".", "status": 404}
    except Exception as e:
        set_training_progress(profile, -1)
        return {"Bad request": str(e), "status": 400}
    
    
def set_evaluation_progress(profile, progress):
    profile.evaluation_progress = progress
    profile.save()
    
@shared_task(bind=True)
def evaluate_model_task(self, model_id, dataset_id, user_id):
    import tensorflow as tf
    
    try:
        model_instance = Model.objects.get(id=model_id)
        dataset_instance = Dataset.objects.get(id=dataset_id)
        profile = Profile.objects.get(user_id=user_id)
        
        set_evaluation_progress(profile, 0)

        if model_instance.model_file:
            timestamp = ""
            try:
                model, timestamp = get_tf_model(model_instance, profile=profile)
                
                set_evaluation_progress(profile, 0.25)

                dataset, dataset_length = create_tensorflow_dataset(dataset_instance, model_instance, profile) 
                
                set_evaluation_progress(profile, 0.5)
                
                dataset = dataset.batch(32).prefetch(tf.data.experimental.AUTOTUNE)
                
                model.summary()
                
                try:
                    set_evaluation_progress(profile, 0)
                
                    res = model.evaluate(dataset, return_dict=True)
                except Exception as e:
                    return {"Bad request": "Could not evaluate on given dataset.", "status": 400} 
                
                set_evaluation_progress(profile, 0.8)
                
                metric = "accuracy"
                if model_instance.loss_function == "binary_crossentropy": metric = "binary_accuracy"
                if model_instance.owner == profile:
                    model_instance.evaluated_on = dataset_instance
                    model_instance.evaluated_accuracy = res[metric]
                    model_instance.save()
                    
                res["status"] = 200
                res["accuracy"] = res[metric]
                
                set_evaluation_progress(profile, 0)
                
                return res
            
            except ValueError as e: # In case of invalid layer combination
                set_evaluation_progress(profile, 0)
                
                message = str(e)
                if len(message) > 50:
                    message = message.split("ValueError: ")[-1]    # Skips long traceback for long errors
                
                raise ValueError(e)

                return {"Bad request": str(message), "status": 400}
            except Exception as e:
                set_evaluation_progress(profile, 0)
                return {"Bad request": str(e), "status": 400}
        else:
            return {"Bad request": "Model has not been built.", "status": 400}

    except Model.DoesNotExist:
        return {"Not found": "Could not find model with the id " + str(model_id) + ".", "status": 404}
    except Dataset.DoesNotExist:
        return {"Not found": "Could not find dataset with the id " + str(dataset_id) + ".", "status": 404}
    except Exception as e:
        set_evaluation_progress(profile, 0)
        return {"Bad request": str(e), "status": 400}
    
    
def preprocess_uploaded_image(uploaded_file, target_size=(256,256,3)):   # Convert uploaded files to tensors for TensorFlow processing
    import tensorflow as tf
    from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
    
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
    image_array = preprocess_input(image_array)
    
    # Expand dimensions to match TensorFlow model input
    image_array = np.expand_dims(image_array, axis=0)  # Shape: (1, height, width, channels)
    
    # Convert to TensorFlow tensor
    image_tensor = tf.convert_to_tensor(image_array, dtype=tf.float32)
    
    return image_tensor    


def decode_image(encoded_image):    # Used for prediction, creates a BytesIO object that can be opened with Image.open
    img_data = base64.b64decode(encoded_image)
        
    # Convert binary data to file-like object (InMemoryUploadedFile)
    file_like_object = BytesIO(img_data)
    return file_like_object

def get_tensorflow_labels(num_labels, label_names=[]):
    li = []
    for i in range(num_labels):
        hue = int(360 * i / num_labels)  # Divide the full hue spectrum by 10
        color = f"hsl({hue}, 100%, 50%)"
        name = str(i)
        if len(label_names) == num_labels:
            name = label_names[i]

        li.append({
            "name": name,
            "color": color
        })

    return li

tf_dataset_to_labels = {
    "imdb": [
        {
            "name": "positive",
            "color": "blue"
        },
        {
            "name": "negative",
            "color": "red"
        }
    ],
    "reuters": get_tensorflow_labels(46, [
        'cocoa', 'grain', 'veg-oil', 'earn', 'acq', 'wheat', 'copper', 'housing',
        'money-supply', 'coffee', 'sugar', 'trade', 'reserves', 'ship', 'cotton', 'carcass',
        'crude', 'nat-gas', 'cpi', 'money-fx', 'interest', 'gnp', 'meal-feed', 'alum',
        'oilseed', 'gold', 'tin', 'strategic-metal', 'livestock', 'retail', 'ipi', 'iron-steel',
        'rubber', 'heat', 'jobs', 'lei', 'bop', 'zinc', 'orange', 'pet-chem',
        'dlr', 'gas', 'income', 'instal-debt', 'lead', 'lumber'
    ]),
    "mnist": get_tensorflow_labels(10),
    "fashion_mnist": get_tensorflow_labels(10, [
        'T-shirt/top',
        'Trouser',    
        'Pullover',   
        'Dress',      
        'Coat',       
        'Sandal',     
        'Shirt',      
        'Sneaker',    
        'Bag',        
        'Ankle boot'  
    ]),
    "cifar10": get_tensorflow_labels(10, ["airplane", "automobile", "bird", "cat", "deer", "dog", "frog", "horse", "ship", "truck"]),
    "cifar100": get_tensorflow_labels(100, [
        'apple', 'aquarium_fish', 'baby', 'bear', 'beaver', 'bed', 'bee', 'beetle',
        'bicycle', 'bottle', 'bowl', 'boy', 'bridge', 'bus', 'butterfly', 'camel',
        'can', 'castle', 'caterpillar', 'cattle', 'chair', 'chimpanzee', 'clock',
        'cloud', 'cockroach', 'couch', 'crab', 'crocodile', 'cup', 'dinosaur',
        'dolphin', 'elephant', 'flatfish', 'forest', 'fox', 'girl', 'hamster',
        'house', 'kangaroo', 'keyboard', 'lamp', 'lawn_mower', 'leopard', 'lion',
        'lizard', 'lobster', 'man', 'maple_tree', 'motorcycle', 'mountain',
        'mouse', 'mushroom', 'oak_tree', 'orange', 'orchid', 'otter', 'palm_tree',
        'pear', 'pickup_truck', 'pine_tree', 'plain', 'plate', 'poppy', 'porcupine',
        'possum', 'rabbit', 'raccoon', 'ray', 'road', 'rocket', 'rose',
        'sea', 'seal', 'shark', 'shrew', 'skunk', 'skyscraper', 'snail', 'snake',
        'spider', 'squirrel', 'streetcar', 'sunflower', 'sweet_pepper', 'table',
        'tank', 'telephone', 'television', 'tiger', 'tractor', 'train', 'trout',
        'tulip', 'turtle', 'wardrobe', 'whale', 'willow_tree', 'wolf', 'woman',
        'worm'
    ]
)
}
    
@shared_task(bind=True)
def predict_model_task(self, model_id, s3_keys, text, user_id=None):
    import tensorflow as tf
    
    profile = None
    try:
        images = []
        
        if user_id:
            try:
                profile = Profile.objects.get(user_id=user_id)
            except Profile.DoesNotExist:
                return {"Not found": "Could not find profile with the id " + str(user_id) + ".", "status": 404}

        try:
            for t, key in enumerate(s3_keys):
                with default_storage.open(key, "rb") as f:
                    images.append(BytesIO(f.read()))
                default_storage.delete(key)
                
                if profile:
                    profile.prediction_progress = (1 / 3) + ((t + 1) / (2 * len(s3_keys))) 
                    profile.save()
                
        except Exception as e:
            for key in s3_keys:
                try:
                    default_storage.delete(key)
                except Exception:
                    pass  # swallow delete errors if needed
            
        model_instance = Model.objects.get(id=model_id)
        
        if model_instance.trained_on or model_instance.trained_on_tensorflow:
            timestamp = ""
            try:
                if model_instance.model_type.lower() == "image":
                    first_layer = model_instance.layers.all().first()
                    
                    target_size = (first_layer.input_x, first_layer.input_y, first_layer.input_z)
                    if first_layer.layer_type == "mobilenetv2": # Doesn't have input_x, ...
                        target_size = (224,224,3)
                    if first_layer.layer_type == "mobilenetv2_96x96": # Doesn't have input_x, ...
                        target_size = (96,96,3)
                    
                    model, timestamp = get_tf_model(model_instance)
                    
                    if profile:
                        profile.prediction_progress = 1
                        profile.save()
                    
                    prediction_names = []
                    prediction_colors = []
                    
                    labels_ordered = list(model_instance.trained_on.labels.all().order_by('id'))
                    
                    for image in images:
                        image_tensor = preprocess_uploaded_image(image, target_size)
                        
                        prediction_arr = model.predict(image_tensor)

                        if model_instance.output_type == "regression":
                            prediction_names.append(prediction_arr)
                            continue
                        
                        prediction_idx = int(np.argmax(prediction_arr))
                        if model_instance.loss_function == "binary_crossentropy":
                            prediction_idx = int(prediction_arr[0][0] >= 0.5)
                        
                        predicted_label = None
                        
                        predicted_label = None
                        if model_instance.trained_on:
                            predicted_label = labels_ordered[prediction_idx]
                            prediction_names.append(predicted_label.name)
                            prediction_colors.append(predicted_label.color)
                        else:
                            predicted_label = tf_dataset_to_labels[model_instance.trained_on_tensorflow][prediction_idx]
                            prediction_names.append(predicted_label["name"])
                            prediction_colors.append(predicted_label["color"])
                    
                    return {"predictions": prediction_names, "colors": prediction_colors, "status": 200}
                    
                elif model_instance.model_type.lower() == "text":
                    model, timestamp = get_tf_model(model_instance)
                    model.summary()
                    
                    if isinstance(text, str):
                        text = [[text]]  # shape (1, 1)
                    elif isinstance(text, list):
                        text = [[t] for t in text]  # shape (batch_size, 1)

                    text = tf.convert_to_tensor(text, dtype=tf.string)

                    prediction_arr = model.predict(text)

                    if model_instance.output_type == "regression":
                        return {"predictions": [prediction_arr], "colors": [], "status": 200}
                    
                    prediction_idx = int(np.argmax(prediction_arr))
                    if model_instance.loss_function == "binary_crossentropy":
                        prediction_idx = int(prediction_arr[0][0] >= 0.5)
                        
                    predicted_label = None
                    if model_instance.trained_on:
                        predicted_label = model_instance.trained_on.labels.all()[prediction_idx]
                        return {"predictions": [predicted_label.name], "colors": [predicted_label.color], "status": 200}
                    else:
                        predicted_label = tf_dataset_to_labels[model_instance.trained_on_tensorflow][prediction_idx]
                        return {"predictions": [predicted_label["name"]], "colors": [predicted_label["color"]], "status": 200}
            
                return {"status": 200}
            except ValueError as e: # In case of invalid layer combination
                message = str(e)
                if len(message) > 50:
                    message = message.split("ValueError: ")[-1]    # Skips long traceback for long errors

                return {"Bad request": str(message), "status": 400}
            except Exception as e:
                return {"Bad request": str(e), "status": 400}
        else:
            return {"Bad request": "Model has not been trained.", "status": 400}
    except Model.DoesNotExist:
        return {"Not found": "Could not find model with the id " + str(model_id) + ".", "status": 404}
    except Exception as e:
        return {"Bad request": str(e), "status": 400}
    finally:
        if profile:
            profile.prediction_progress = 0
            profile.save()
    
    
def get_metrics(loss_function):
    import tensorflow as tf
    
    metrics = "accuracy"
    if loss_function == "binary_crossentropy":
        metrics = tf.metrics.BinaryAccuracy(threshold=0.5)
    return metrics


def get_tf_optimizer(optimizer_str, learning_rate):
    import tensorflow as tf
    
    if optimizer_str == "adam":
        return tf.keras.optimizers.Adam(
            learning_rate=learning_rate
        )
    elif optimizer_str == "adagrad":
        return tf.keras.optimizers.Adagrad(
            learning_rate=learning_rate
        )
    elif optimizer_str == "adadelta":
        return tf.keras.optimizers.Adadelta(
            learning_rate=learning_rate
        )
    elif optimizer_str == "adamax":
        return tf.keras.optimizers.Adamax(
            learning_rate=learning_rate
        )
    elif optimizer_str == "sgd":
        return tf.keras.optimizers.SGD(
            learning_rate=learning_rate
        )
    elif optimizer_str == "rmsprop":
        return tf.keras.optimizers.RMSprop(
            learning_rate=learning_rate
        )
    else:
        raise Exception("Could not find optimzier of type " + optimizer_str)
    

def find_layer_by_name(layer_container, name):
    """
    Recursively search for a layer by name in a model or nested container.
    """
    for layer in getattr(layer_container, 'layers', []):
        if layer.name == name:
            return layer
        # if it's a nested model or Sequential, search inside it
        if hasattr(layer, 'layers'):
            found = find_layer_by_name(layer, name)
            if found:
                return found
    return None

    
@shared_task(bind=True)
def build_model_task(self, model_id, optimizer, learning_rate, loss_function, user_id, input_sequence_length):
    import tensorflow as tf
    
    profile = Profile.objects.get(user_id=user_id)
    
    try:
        instance = Model.objects.get(id=model_id)
        
        if instance.owner == profile:
            temp_path = ""
            timestamp = ""
            try:
                model = tf.keras.Sequential()
                
                extension = instance.model_file.name.split(".")[-1]
                
                old_model = None
                
                for layer in instance.layers.all():
                    if not layer.update_build:
                        if not old_model:
                            old_model, timestamp = get_tf_model(instance, profile=profile)
                            if timestamp < 0: return {"Bad request": "You have an ongoing task on this model. Please wait until it finishes.", "status": 400}
                        
                        matched_layer = find_layer_by_name(old_model, str(layer.id))
                        if matched_layer:
                            model.add(matched_layer)
                    else:
                        new_layer = get_tf_layer(layer)
                        new_layer.trainable = layer.trainable
                        model.add(new_layer)

                # Must build in this case
                if instance.model_type.lower() == "text":
                    model.build(input_sequence_length)

                metrics = get_metrics(loss_function)
                
                if model.count_params() > 5 * 10**6:
                    return {"Bad request": "A model cannot have more than 5 million parameters. Current parameter count: " + str(model.count_params()), "status": 400}
                
                tf_optimizer = get_tf_optimizer(optimizer, learning_rate)
                model.compile(optimizer=tf_optimizer, 
                    loss=loss_function, 
                    metrics=[metrics]
                )
                
                # Do this here so it's not set to false if build fails
                for layer in instance.layers.all():
                    layer.updated = False
                    layer.save()
                
                model.summary()
                
                # Create a temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix=".keras") as temp_file:
                    temp_path = temp_file.name  # Get temp file path

                # Save the model to the temp file
                model.save(temp_path)
                
                if instance.model_file:
                    instance.model_file.delete(save=False)
                
                # Open the file and save it to Django's FileField
                with open(temp_path, 'rb') as model_file:
                    instance.model_file.save(instance.name + ".keras", File(model_file))

                # Delete the temporary file after saving
                os.remove(temp_path)
                
                instance.optimizer = optimizer
                instance.loss_function = loss_function
                
                instance.trained_on = None
                instance.trained_on_tensorflow = None
                
                instance.accuracy = []
                instance.val_accuracy = []
                instance.loss = []
                instance.val_loss = []
                
                instance.val_split = None
                
                instance.evaluated_on = None
                instance.evaluated_on_tensorflow = None
                instance.evaluated_accuracy = None
                
                if input_sequence_length:
                    instance.input_sequence_length = input_sequence_length
                
                instance.save()
                
                return {"status": 200}
        
            except ValueError as e: # In case of invalid layer combination
                print("Error: ", e)
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return {"Bad request": str(e), "status": 400}
            except Exception as e:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                return {"Bad request": str(e), "status": 400}
        else:
            return {"Unauthorized": "You can only build your own models.", "status": 401}
    except Model.DoesNotExist:
        return {"Not found": "Could not find model with the id " + str(model_id) + ".", "status": 404}
    except Exception as e:
        return {"Bad request": str(e), "status": 400}
    

def set_trainable_recursive(layer, names_to_freeze):
    """
    Recursively set trainable attribute on a layer and its sublayers.
    """
    if hasattr(layer, 'layers'):  # it's a model or a container
        PRETRAINED_SET = set(["mobilenetv2", "mobilenetv2_96x96", "mobilenetv2_32x32"])
        if layer.name in PRETRAINED_SET: return
        for sublayer in layer.layers:
            set_trainable_recursive(sublayer, names_to_freeze)
    else:
        if layer.name in names_to_freeze:
            layer.trainable = False
        else:
            layer.trainable = True

    
@shared_task(bind=True)
def recompile_model_task(self, model_id, optimizer, learning_rate, loss_function, user_id, input_sequence_length):
    import tensorflow as tf
    
    try:
        profile = Profile.objects.get(user_id=user_id)
        
        model_instance = Model.objects.get(id=model_id)
        if not model_instance.model_file: return {"Bad request": "Model has not been built."}
        
        if model_instance.owner == profile:
            timestamp = ""
            try:
                extension = str(model_instance.model_file).split(".")[-1]
                
                model, timestamp = get_tf_model(model_instance, profile=profile)

                if timestamp < 0: return {"Bad request": "You have an ongoing task on this model. Please wait until it finishes.", "status": 400}
                
                names_to_freeze = set([])
                for layer in model_instance.layers.all():
                    if not layer.trainable:
                        names_to_freeze.add(str(layer.id))
                
                for layer in model.layers:
                    set_trainable_recursive(layer, names_to_freeze)
                        
                model.summary()

                metrics = get_metrics(loss_function)
                tf_optimizer = get_tf_optimizer(optimizer, learning_rate)
                model.compile(optimizer=tf_optimizer, 
                    loss=loss_function, 
                    metrics=[metrics]
                )
                
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
                
                model_instance.optimizer = optimizer
                model_instance.loss_function = loss_function
                
                if input_sequence_length:
                    model_instance.input_sequence_length = input_sequence_length
                
                model_instance.save()
                
                return {"status": 200}
        
            except ValueError as e: # In case of invalid layer combination
                return {"Bad request": str(e), "status": 400}
            except Exception as e:
                return {"Bad request": str(e), "status": 400}
        else:
            return {"Unauthorized": "You can only recompile your own models.", "status": 401}
    except Profile.DoesNotExist:
        return {"Not found": "Could not find profile with the id " + str(user_id) + ".", "status": 404}
    except Model.DoesNotExist:
        return {"Not found": "Could not find model with the id " + str(model_id) + ".", "status": 404}
    except Exception as e:
        return {"Bad request": str(e), "status": 400}
    
    
# Sets params of layer_instance to tf_layer
def set_to_tf_layer(layer_instance, tf_layer):
    from tensorflow.keras import layers
    
    config = tf_layer.get_config()
    
    input_shape = False
    if "batch_input_shape" in config.keys():
        input_shape = config["batch_input_shape"]
    else:
        input_shape = [None, None, None, None]
    
    if isinstance(tf_layer, layers.Dense):
        layer_instance.nodes_count = config["units"]
        if input_shape:
            layer_instance.input_x = input_shape[-1]
    elif isinstance(tf_layer, layers.Conv2D):
        layer_instance.filters = config["filters"]
        layer_instance.kernel_size = config["kernel_size"][0]
        layer_instance.padding = config["padding"]
        if input_shape:
            layer_instance.input_x = input_shape[1]    # First one is None
            layer_instance.input_y = input_shape[2]
            layer_instance.input_z = input_shape[3]
    elif isinstance(tf_layer, layers.MaxPool2D):
        layer_instance.pool_size = config["pool_size"][0]
    elif isinstance(tf_layer, layers.Flatten):
        if input_shape:
            layer_instance.input_x = input_shape[1]
            layer_instance.input_y = input_shape[2]
    elif isinstance(tf_layer, layers.Dropout):
        layer_instance.rate = config["rate"]
    elif isinstance(tf_layer, layers.Rescaling):
        layer_instance.scale = config["scale"]
        layer_instance.offset = config["offset"]
        if input_shape:
            layer_instance.input_x = input_shape[1]
            layer_instance.input_y = input_shape[2]
            layer_instance.input_z = input_shape[3]
    elif isinstance(tf_layer, layers.RandomFlip):
        layer_instance.mode = config["mode"]
        if input_shape:
            layer_instance.input_x = input_shape[1]
            layer_instance.input_y = input_shape[2]
            layer_instance.input_z = input_shape[3]
    elif isinstance(tf_layer, layers.RandomRotation):
        layer_instance.factor = config["factor"]
        if input_shape:
            layer_instance.input_x = input_shape[1]
            layer_instance.input_y = input_shape[2]
            layer_instance.input_z = input_shape[3]
    elif isinstance(tf_layer, layers.Resizing):
        layer_instance.output_x = config["width"]
        layer_instance.output_y = config["height"]
        if input_shape:
            layer_instance.input_x = input_shape[1]
            layer_instance.input_y = input_shape[2]
            layer_instance.input_z = input_shape[3]
    elif isinstance(tf_layer, layers.TextVectorization):
        layer_instance.max_tokens = config["max_tokens"]
        layer_instance.standardize = config["standardize"]
    elif isinstance(tf_layer, layers.Embedding):
        layer_instance.max_tokens = config["input_dim"]
        layer_instance.output_dim = config["output_dim"]
    else:   # GlobalPooling1D and pretrained models can't be reset
        print("DID NOT UPDATE LAYER OF TYPE: ", layer_instance.layer_type)
        return # Continue instantiating model
    
    if "activation" in config.keys():
        layer_instance.activation_function = config["activation"]
    
    layer_instance.updated = False
    layer_instance.save()
    return layer_instance


@shared_task(bind=True)
def reset_to_build_task(self, layer_id, user_id):
    import tensorflow as tf
    
    try:
        profile = Profile.objects.get(user_id=user_id)
        layer_instance = Layer.objects.get(id=layer_id)
        model_instance = layer_instance.model
        
        if not model_instance.model_file: return {"Bad request": "Model has not been built.", "status": 400}
        
        if model_instance.owner == profile:
            timestamp = ""
            try:
                extension = str(model_instance.model_file).split(".")[-1]
                 
                model, timestamp = get_tf_model(model_instance, profile=profile)
                if timestamp < 0: return {"Bad request": "You have an ongoing task on this model. Please wait until it finishes.", "status": 400}
                
                found = False
                for layer in model.layers:
                    if layer.name == str(layer_id):
                        found = True
                        layer_instance = set_to_tf_layer(layer_instance, layer)
                
                if not found: return {"data": None, "status": 200}
                
                return {"data": LayerSerializer(layer_instance).data,"status": 200}
        
            except ValueError as e: # In case of invalid layer combination
                return {"Bad request": str(e), "status": 400}
            except Exception as e:
                return {"Bad request": str(e), "status": 400}
        else:
            return {"Unauthorized": "You can only recompile your own models.", "status": 401}
        
    except Profile.DoesNotExist:
        return {"Not found": "Could not find profile with the id " + str(user_id) + ".", "status": 404}
    except Layer.DoesNotExist:
        return {"Not found": "Could not find layer with the id " + str(layer_id) + ".", "status": 404}
    except Exception as e:
        return {"Bad request": str(e), "status": 400}


def layer_model_from_tf_layer(tf_layer, model_id, idx, user, input_shape=False):    # Takes a TensorFlow layer and creates a Layer instance for the given model (if the layer is valid).
    from tensorflow.keras import layers
    
    config = tf_layer.get_config()
        
    data = {}
    
    if isinstance(tf_layer, layers.Dense):
        data["type"] = "dense"
        data["nodes_count"] = config["units"]
        if input_shape:
            data["input_x"] = input_shape[-1]
    elif isinstance(tf_layer, layers.Conv2D):
        data["type"] = "conv2d"
        data["filters"] = config["filters"]
        data["kernel_size"] = config["kernel_size"][0]
        data["padding"] = config["padding"]
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
    elif isinstance(tf_layer, layers.RandomRotation):
        data["type"] = "randomrotation"
        data["factor"] = config["factor"]
        if input_shape:
            data["input_x"] = input_shape[1]
            data["input_y"] = input_shape[2]
            data["input_z"] = input_shape[3]
    elif isinstance(tf_layer, layers.Resizing):
        print(config)
        data["type"] = "resizing"
        data["output_x"] = config["width"]
        data["output_y"] = config["height"]
        if input_shape:
            data["input_x"] = input_shape[1]
            data["input_y"] = input_shape[2]
            data["input_z"] = input_shape[3]
    elif isinstance(tf_layer, layers.TextVectorization):
        data["type"] = "textvectorization"
        data["max_tokens"] = config["max_tokens"]
        data["standardize"] = config["standardize"]
    elif isinstance(tf_layer, layers.Embedding):
        data["type"] = "embedding"
        data["max_tokens"] = config["input_dim"]
        data["output_dim"] = config["output_dim"]
    elif isinstance(tf_layer, layers.GlobalAveragePooling1D):
        data["type"] = "globalaveragepooling1d"
    elif tf_layer.name == "mobilenetv2":
        data["type"] = "mobilenetv2"
    elif tf_layer.name == "mobilenetv2_96x96":
        data["type"] = "mobilenetv2_96x96"
    elif tf_layer.name == "mobilenetv2_32x32":
        data["type"] = "mobilenetv2_32x32"
    else:
        print("UNKNOWN LAYER TYPE: ", tf_layer)
        return # Continue instantiating model
    
    data["model"] = model_id
    data["index"] = idx
    data["activation_function"] = config.get("activation", "")


    instance = create_layer_instance(data, user)
    
    return instance  # Or return {'id': instance.id} or whatever you need


@shared_task(bind=True)
def reset_model_to_build_task(self, model_id, user_id):
    import tensorflow as tf
    
    backend_temp_model_path = ""
    
    try:
        profile = Profile.objects.get(user_id=user_id)
        model_instance = Model.objects.get(id=model_id)
        
        input_shape = []
        
        if model_instance.owner == profile:  
            for t, layer in enumerate(model_instance.layers.all()):    # Workaround due to bug with Django Polymorphic
                if t == 0:
                    input_shape = [None, layer.input_x, layer.input_y, layer.input_z]
                layer.delete()
            
            model_file = model_instance.model_file
            extension = model_file.name.split(".")[-1]
            temp_path = "tmp/temp_models/" + model_file.name
            file_path = default_storage.save(temp_path, model_file.file)
            
            bucket_name = settings.AWS_STORAGE_BUCKET_NAME
            temp_model_file_path = "media/" + file_path
                    
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
                print(t)
                if t == 0:
                    layer_model_from_tf_layer(layer, model_id, t, profile.user, input_shape)
                else:
                    layer_model_from_tf_layer(layer, model_id, t, profile.user)
                
                
            model_instance.model_file = model_file
            model_instance.optimizer = model.optimizer.__class__.__name__.lower()

            def get_loss_name(loss):
                if isinstance(loss, str):
                    return loss
                elif hasattr(loss, '__name__'):
                    return loss.__name__
                elif hasattr(loss, 'name'):
                    return loss.name
                elif hasattr(loss, '__class__'):
                    return loss.__class__.__name__
                return str(loss)

            model_instance.loss_function = get_loss_name(model.loss)
            
            model_instance.save()
            
            for layer in model_instance.layers.all():
                layer.updated = False
                layer.save()
            
            return {"status": 200}
    
        else:
            return {"Unauthorized": "You can only reset your own models.", "status": 401}
    except Model.DoesNotExist: 
        return {"Not found": "Could not find model with the id " + str(model_id) + ".", "status": 404}
    except Profile.DoesNotExist: 
        return {"Not found": "Could not find model with the id " + str(model_id) + ".", "status": 404}
    except Exception as e:
        if backend_temp_model_path and os.path.exists(backend_temp_model_path):
            os.remove(backend_temp_model_path)
        return {"Bad request": str(e), "status": 400}
    
    
def create_model_file(model_instance, profile):
    import tensorflow as tf
    
    backend_temp_model_path = ""
    try:
        model_file = model_instance.model_file  # View saves uploaded file here
        extension = model_file.name.split(".")[-1]
        temp_path = "tmp/temp_models/" + model_file.name
        file_path = default_storage.save(temp_path, model_file.file)
        
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        temp_model_file_path = "media/" + file_path
                
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
            layer_model_from_tf_layer(layer, model_instance.id, t, profile.user)
            
        model_instance.model_file = model_file
        model_instance.optimizer = model.optimizer.__class__.__name__.lower()

        def get_loss_name(loss):
            if isinstance(loss, str):
                return loss
            elif hasattr(loss, '__name__'):
                return loss.__name__
            elif hasattr(loss, 'name'):
                return loss.name
            elif hasattr(loss, '__class__'):
                return loss.__class__.__name__
            return str(loss)

        model_instance.loss_function = get_loss_name(model.loss)
        
        model_instance.save()
        
        return {"status": 200}
    except Exception as e:
        if os.path.exists(backend_temp_model_path):
            os.remove(backend_temp_model_path)
        return {"Bad request": str(e), "status": 400}    


# Takes a while if user uploads a model, therefore task
@shared_task(bind=True)
def create_model_task(self, model_id, user_id):
    import tensorflow as tf
    
    try:
        profile = Profile.objects.get(user_id=user_id)
    except Profile.DoesNotExist:
        return {"Not found": "Could not find profile with the id " + str(user_id) + ".", "status": 404}

    try:
        model_instance = Model.objects.get(id=model_id)
    except Model.DoesNotExist:
        return {"Not found": "Could not find model with the id " + str(model_id) + ".", "status": 404}
        
    res = create_model_file(model_instance, profile)
    if res["status"] != 200:
        return {'Bad Request': res["Bad request"], "status": 400}
                
    return {"status": 200}


def resize_element_image(instance, newWidth, newHeight):
    new_name = instance.file.name.split("/")[-1]     # Otherwise includes files

    newWidth = min(1024, newWidth)
    newHeight = min(1024, newHeight)
    
    try:
        
        img = Image.open(instance.file)
        oldWidth, oldHeight = img.size
        if oldWidth == newWidth and oldHeight == newHeight:
            return

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


@shared_task(bind=True)
def resize_dataset_images_task(self, dataset_id, user_id, imageWidth, imageHeight):
    import tensorflow as tf
    
    try:
        try:
            profile = Profile.objects.get(user_id=user_id)
        except Profile.DoesNotExist:
            return {"Not found": "Could not find profile with the id " + str(user_id) + ".", "status": 404}
        
        try:
            dataset = Dataset.objects.get(id=dataset_id)
        except Dataset.DoesNotExist:
            return {"Not found": "Could not find dataset with the id " + str(dataset_id) + ".", "status": 404}
        
        if dataset.owner != profile:
            return {"Unauthorized": "You can only edit your own datasets.", "status": 401}
        
        totalCount = dataset.elements.count()
        for t, element in enumerate(dataset.elements.all()):
            print(t)
            if t % 5 == 0:
                profile.edit_dataset_progress = (t + 1) / totalCount
                profile.save()
            resize_element_image(element, int(imageHeight), int(imageWidth))
        
        profile.edit_dataset_progress = 0
        profile.save()
            
        return {"status": 200}
    
    except Exception as e:
        return {"Bad request": str(e), "status": 400}    
    
    
@shared_task
def create_elements_task(s3_keys, dataset_id, user_id, index, labels):
    from django.db import transaction
    
    try:
        profile = Profile.objects.get(user_id=user_id)
        dataset = Dataset.objects.get(id=dataset_id)
    except (Profile.DoesNotExist, Dataset.DoesNotExist) as e:
        return {"Not found": str(e), "status": 404}

    profile.creating_elements_progress = 0
    profile.save()

    elements_to_create = []
    files_data = []

    try:
        # Read all files first (or in chunks)
        for i, key in enumerate(s3_keys):
            filename_with_uuid = key.split("/")[-1]
            print(f"filename_with_uuid: {filename_with_uuid}")
            original_filename = "_".join(filename_with_uuid.split("_")[2:])
            print(f"filename_with_uuid: {filename_with_uuid}")
            with default_storage.open(key, "rb") as f:
                file_content = f.read()
                files_data.append((file_content, original_filename))
            
            if i % 10 == 0:
                profile.creating_elements_progress = (i + 1) / (len(s3_keys) * 5)
                profile.save()
            
        profile.creating_elements_progress = (1/5)
        profile.save()

        # Prepare Element instances (not saved yet)
        for i, (file_content, original_filename) in enumerate(files_data):
            file_obj = File(BytesIO(file_content), name=original_filename)
            
            if dataset.dataset_type.lower() == "image" and not (dataset.imageWidth or dataset.imageHeight):
                with Image.open(BytesIO(file_content)) as img:
                    width, height = img.size
                element = Element(
                    dataset=dataset,
                    owner=profile,
                    file=file_obj,
                    index=index + i,
                    name=original_filename,
                    imageWidth=width,
                    imageHeight=height
                )
            else:
                element = Element(
                    dataset=dataset,
                    owner=profile,
                    file=file_obj,
                    index=index + i,
                    name=original_filename
                )
            elements_to_create.append(element)
            
            if i % 10 == 0:
                profile.creating_elements_progress = (1/5) + (i + 1) / (len(files_data) * 5)
                profile.save()
            
        profile.creating_elements_progress = (2/5)
        profile.save()

        with transaction.atomic():
            created_elements = Element.objects.bulk_create(elements_to_create)

            # Assign labels in bulk if possible
            for i, element in enumerate(created_elements):
                if labels and i < len(labels):
                    try:
                        label = Label.objects.get(id=labels[i])
                        element.label = label
                    except Label.DoesNotExist:
                        pass
                
                if i % 10:
                    profile.creating_elements_progress = (2/5) + (i + 1) / (len(created_elements) * 5)
                    profile.save()
                
            Element.objects.bulk_update(created_elements, ['label'])
            
        profile.creating_elements_progress = (3/5)
        profile.save()

        # Resize images after creation (could be async)
        if dataset.dataset_type.lower() == "image" and (dataset.imageWidth or dataset.imageHeight):
            for t, element in enumerate(created_elements):
                ext = element.file.name.split(".")[-1].lower()
                if ext in ALLOWED_IMAGE_FILE_EXTENSIONS:
                    resize_element_image(element, dataset.imageWidth, dataset.imageHeight)
                    
                if t % 10 == 0:
                    profile.creating_elements_progress = (3/5) + (t + 1) / (len(created_elements) * 5)
                    profile.save()
        elif dataset.dataset_type.lower() == "image":
            for t, element in enumerate(created_elements):
                if element.imageWidth > 1024 or element.imageHeight > 1024:
                    ext = element.file.name.split(".")[-1].lower()
                    if ext in ALLOWED_IMAGE_FILE_EXTENSIONS:
                        resize_element_image(element, min(1024, element.imageWidth), min(1024, element.imageHeight))
                    
                if t % 10 == 0:
                    profile.creating_elements_progress = (3/5) + (t + 1) / (len(created_elements) * 5)
                    profile.save()
                
        profile.creating_elements_progress = (4/5)
        profile.save()

        # Delete files after processing (outside loop)
        for t, key in enumerate(s3_keys):
            default_storage.delete(key)
            
            if t % 10 == 0:
                profile.creating_elements_progress = (4/5) + ((t + 1) / (len(s3_keys) * 5))
                profile.save()

        profile.creating_elements_progress = 0
        profile.save()

        return {"status": 200}

    except Exception as e:
        print("Error during background element creation:", str(e))
        profile.creating_elements_progress = 0
        profile.save()
            
        for key in s3_keys:
            try:
                default_storage.delete(key)
            except Exception as inner_e:
                print("Cleanup failed for:", key, inner_e)
        return {"Bad request": str(e), "status": 400}    