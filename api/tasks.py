from celery import shared_task
import tensorflow as tf
import os
import time
import boto3
from django.conf import settings

from .serializers import *
from .models import *


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



class TrainingProgressCallback(tf.keras.callbacks.Callback):
    def __init__(self, profile, total_epochs):
        super().__init__()
        self.profile = profile
        self.total_epochs = total_epochs

    def on_epoch_end(self, epoch, logs=None):
        self.profile.training_progress = round((epoch + 1) / self.total_epochs, 4)
        self.profile.save()


@shared_task
def train_model_task(model_id, dataset_id, epochs, validation_split, user_id):
    
    profile = Profile.objects.get(user_id=user_id)
    
    try:
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