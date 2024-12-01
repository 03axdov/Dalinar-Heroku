from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Dataset, Profile

# PROFILE HANDLING

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = "__all__"


# DATASET HANDLING

class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = "__all__"
        extra_kwargs = {"owner": {"read_only": True}}
        
        
class CreateDatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ("name", "description", "visibility", "image", "datasetType")
        
