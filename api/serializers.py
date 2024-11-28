from django.contrib.auth.models import User
from rest_framework import serializers
from .models import ImageDataset, Profile


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = "__all__"


class ImageDatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImageDataset
        fields = ["id", "name", "description", "created_at", "owner"]
        extra_kwargs = {"owner": {"read_only": True}}
        
        
class CreateImageDatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImageDataset
        fields = ("name", "description")