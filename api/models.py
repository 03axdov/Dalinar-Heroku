from django.db import models
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.db.models.signals import post_save, post_delete
from django.core.validators import FileExtensionValidator
import os
from django.core.validators import MaxLengthValidator
from PIL import Image


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
    verified = models.BooleanField(default=False)
    keywords = models.JSONField(
        default=list,
        validators=[MaxLengthValidator(3)],
        help_text="A list of up to 3 keywords for the dataset.",
        blank=True
    )
    
    imageHeight = models.PositiveIntegerField(null=True, blank=True)    # If specified will resize image files uploaded
    imageWidth = models.PositiveIntegerField(null=True, blank=True)     # If specified will resize image files uploaded
        
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


@receiver(post_delete, sender=Dataset)
def delete_dataset_image(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)
    
# LABELS
# Elements in datasets, such as files, are given labels
    
class Label(models.Model):
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name="labels", null=True)
    name = models.CharField(max_length=200)
    owner = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="labels", null=True)
    color = models.CharField(max_length=7, default="#ffffff") # Hexadecimal format -- #000000
    keybind = models.CharField(max_length=20, blank=True)
        
    def __str__(self):
        return self.name + " - " + self.dataset.name


# ELEMENTS
# Datasets contain elements, which can be e.g. files

class Element(models.Model):
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name="elements", null=True)
    owner = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="elements", null=True)
    name = models.CharField(max_length=100)
    file = models.FileField(upload_to="files/", null=True, validators=[FileExtensionValidator(allowed_extensions=ALLOWED_IMAGE_FILE_EXTENSIONS + ALLOWED_TEXT_FILE_EXTENSIONS)])
    label = models.ForeignKey(Label, on_delete=models.SET_NULL, related_name="labels", blank=True, null=True)
    
    imageHeight = models.PositiveIntegerField(blank=True, null=True)    # Only used if file is image
    imageWidth = models.PositiveIntegerField(blank=True, null=True)     # Only used if file is image
    
    def __str__(self):
        return self.name + " - " + self.dataset.name
    
    def save(self, *args, **kwargs):
        # If a new file is uploaded
        if self.file and not self.name:
            # Set the name field to the file's name (without the path)
            self.name = os.path.basename(self.file.name)
            
            ext = self.file.name.split(".")[-1].lower()
            if ext in ALLOWED_IMAGE_FILE_EXTENSIONS:
                try:
                    with Image.open(self.file) as img:
                        self.imageWidth, self.imageHeight = img.size
                except Exception as e:
                    print(f"Error processing image: {e}")
                    self.imageWidth, self.imageHeight = None, None    
            
        super().save(*args, **kwargs)
        
        
@receiver(post_delete, sender=Element)
def delete_element_file(sender, instance, **kwargs):
    if instance.file:
        instance.file.delete(save=False)


# MISCELLANEOUS
class Area(models.Model):   # Only used for datasets of datatype "area"
    label = models.ForeignKey(Label, on_delete=models.CASCADE, related_name="areas", null=True)
    element = models.ForeignKey(Element, on_delete=models.CASCADE, related_name="areas", null=True)
    area_points = models.JSONField(default=list)  # Store as a list of [x, y] points
    
    def __str__(self):
        return "Element: " + self.element.name + ", Label: " + self.label.name + ". Points: " + str(self.area_points)