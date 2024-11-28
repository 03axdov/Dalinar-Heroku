from django.contrib.auth.models import User
from rest_framework import serializers
from .models import ImageDataset


class ImageDatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImageDataset
        fields = ["id", "name", "description", "created_at", "owner"]
        extra_kwargs = {"owner": {"read_only": True}}
        
        
class CreateImageDatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImageDataset
        fields = ("name", "description")