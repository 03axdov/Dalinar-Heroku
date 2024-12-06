from django.contrib.auth.models import User
from rest_framework import serializers
from .models import *

# PROFILE HANDLING

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = "__all__"


# ELEMENT HANDLING

class ElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Element
        fields = "__all__"


class CreateElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Element
        fields = ("dataset", "name", "file")
        
        
# LABEL HANDLING

class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = "__all__"
        
        
# DATASET HANDLING

class DatasetSerializer(serializers.ModelSerializer):
    elements = ElementSerializer(many=True, read_only=True)
    labels = LabelSerializer(many=True, read_only=True)
    
    class Meta:
        model = Dataset
        fields = "__all__"
        extra_kwargs = {"owner": {"read_only": True}}
        
        
class CreateDatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ("name", "description", "visibility", "image", "datatype")
        