from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Dataset, Profile


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = "__all__"


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ["id", "name", "description", "created_at", "owner"]
        extra_kwargs = {"owner": {"read_only": True}}
        
        
class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ("name", "description")