from django.db import models
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.db.models.signals import post_save, post_delete
from django.core.validators import FileExtensionValidator
import os


ALLOWED_IMAGE_FILE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "avif"]
ALLOWED_TEXT_FILE_EXTENSIONS = ["txt", "doc", "docx"]


class Profile(models.Model):    # Extends default User class
    user = models.OneToOneField(User, primary_key=True, verbose_name='user', related_name='profile', on_delete=models.CASCADE)
    name = models.CharField(max_length=30, blank=True, null=True, unique=True)
    
    def __str__(self):
        return self.name
    
@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance, name=instance.username)

@receiver(post_save, sender=User)
def save_profile(sender, instance, **kwargs):
    instance.profile.save()
    
    
# DATASETS

class Dataset(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="datasets")
    image = models.ImageField(upload_to='images/', null=True)
    downloaders = models.ManyToManyField(Profile, related_name="downloaded_datasets", blank=True)
    
    VISIBILITY_CHOICES = [
        ("private", "Private"),
        ("public", "Public")
    ]
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default="private")
    
    DATATYPE_CHOICES = [
        ("classification", "Classification"),
        ("area", "Area")
    ]
    datatype = models.CharField(max_length=20, choices=DATATYPE_CHOICES, default="image")
    
    def __str__(self):
        return self.name


    
# LABELS
# Elements in datasets, such as files, are given labels
    
class Label(models.Model):
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name="labels", null=True)
    name = models.CharField(max_length=200)
    owner = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="labels", null=True)
    color = models.CharField(max_length=7, default="#ffffff") # Hexadecimal format -- #000000
    keybind = models.CharField(max_length=20, blank=True)
        
    def __str__(self):
        return self.name


# ELEMENTS
# Datasets contain elements, which can be e.g. files

class Element(models.Model):
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name="elements", null=True)
    owner = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="elements", null=True)
    name = models.CharField(max_length=100)
    file = models.FileField(upload_to="files/", null=True, validators=[FileExtensionValidator(allowed_extensions=ALLOWED_IMAGE_FILE_EXTENSIONS + ALLOWED_TEXT_FILE_EXTENSIONS)])
    label = models.ForeignKey(Label, on_delete=models.SET_NULL, related_name="labels", blank=True, null=True)
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # If a new file is uploaded
        if self.file and not self.name:
            # Set the name field to the file's name (without the path)
            self.name = os.path.basename(self.file.name)
            print(self.file.name)
        super().save(*args, **kwargs)
