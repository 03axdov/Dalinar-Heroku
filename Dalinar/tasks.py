from celery import shared_task
import tensorflow as tf
import os
import time
import boto3
from django.conf import settings
import tempfile
from django.core.files import File

from api.serializers import *
from api.models import *

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


def get_temp_model_name(id, timestamp, extension):
    return 'temp_model' + str(id) + "-" + str(timestamp) + '.' + extension
    
    
def get_tf_model(model_instance):     # Gets a Tensorflow model from a built Model instance
    # Define the S3 bucket and file path
    bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    model_file_path = "media/" + model_instance.model_file.name
    
    s3_client = get_s3_client()
    print("A")
    
    extension = model_file_path.split(".")[-1]
    
    timestamp = time.time()

    # Download the model file from S3 to a local temporary file
    temp_file_path = get_temp_model_name(model_instance.id, timestamp, extension)
    print("B")
    print(f"bucket_name: {bucket_name}, model_file_path: {model_file_path}")
    with open(temp_file_path, 'wb') as f:
        s3_client.download_fileobj(bucket_name, model_file_path, f)

    # Load the TensorFlow model from the temporary file
    print("C")
    model = tf.keras.models.load_model(temp_file_path)
    print("D")
    return model, timestamp
    
    
def remove_temp_tf_model(model_instance, timestamp):
    extension = str(model_instance.model_file).split(".")[-1]
    os.remove(get_temp_model_name(model_instance.id, timestamp, extension)) 


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




class TrainingProgressCallback(tf.keras.callbacks.Callback):
    def __init__(self, profile, total_epochs):
        super().__init__()
        self.profile = profile
        self.total_epochs = total_epochs

    def on_epoch_end(self, epoch, logs=None):
        self.profile.training_progress = round((epoch + 1) / self.total_epochs, 4)
        self.profile.save()


@shared_task(bind=True)
def train_model_task(self, model_id, dataset_id, epochs, validation_split, user_id):
    
    profile = Profile.objects.get(user_id=user_id)
    
    try:
        logger.info("Starting task for model %d and dataset %d", model_id, dataset_id)
        
        model_instance = Model.objects.get(id=model_id)
        
        dataset_instance = Dataset.objects.get(id=dataset_id)
        
        if model_instance.owner == profile:
            
            profile.training_progress = -1 # To Show Preprocessing
            profile.save()
            
            if model_instance.model_file:
                try:
                    extension = str(model_instance.model_file).split(".")[-1]
                    model, timestamp = get_tf_model(model_instance)
                    
                    dataset, dataset_length = create_tensorflow_dataset(dataset_instance, model_instance)
                    validation_size = int(dataset_length * validation_split)
                    train_size = dataset_length - validation_size
                    
                    model.summary() # For debugging
                    
                    progress_callback = TrainingProgressCallback(profile=profile, total_epochs=epochs)

                    if validation_size >= 1: # Some dataset are too small for validation
                        train_dataset, validation_dataset = tf.keras.utils.split_dataset(dataset, train_size, validation_size, shuffle=True)
                        
                        train_dataset = train_dataset.prefetch(tf.data.experimental.AUTOTUNE)
                        validation_dataset = validation_dataset.prefetch(tf.data.experimental.AUTOTUNE)
                    
                        profile.training_progress = 0
                        profile.save()
                    
                        history = model.fit(train_dataset, 
                                            epochs=epochs, 
                                            validation_data=validation_dataset,
                                            callbacks=[progress_callback])
                    else:
                        profile.training_progress = 0
                        profile.save()
                        
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

                    # Delete the temporary file after saving
                    remove_temp_tf_model(model_instance, timestamp)
                    
                    accuracy = history.history["accuracy"]
                    loss = history.history["loss"]
                    val_accuracy = []
                    val_loss = []
                    if validation_size >= 1:
                        val_accuracy = history.history["val_accuracy"]
                        val_loss = history.history["val_loss"]
                    
                    # UPDATING MODEL TRAINED_ON
                    model_instance.trained_on = dataset_instance
                    model_instance.trained_accuracy = accuracy[-1]
                    model_instance.save()
            
                    return {"accuracy": accuracy, "loss": loss, "val_accuracy": val_accuracy, "val_loss": val_loss, "status": 200}
                
                except ValueError as e: # In case of invalid layer combination
                    message = str(e)
                    if len(message) > 50 and len(list(dataset)) * validation_split > 1:
                        message = message.split("ValueError: ")[-1]    # Skips long traceback for long errors
                    
                    raise ValueError(e)

                    return {"Bad request": str(message), "status": 400}
                except Exception as e:
                    return {"Bad request": str(e), "status": 400}
            else:
                return {"Bad request": "Model has not been built.", "status": 400}
        else:
            return {"Unauthorized": "You can only train your own models.", "status": 401}
    except Model.DoesNotExist:
        return {"Not found": "Could not find model with the id " + str(model_id) + ".", "status": 404}
    except Dataset.DoesNotExist:
        return {"Not found": "Could not find dataset with the id " + str(dataset_id) + ".", "status": 404}