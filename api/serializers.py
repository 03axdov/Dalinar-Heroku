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
        fields = ("dataset", "file")
        
        
class EditElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Element
        fields = ("label",)
        
# LABEL HANDLING

class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = "__all__"
        
        
class CreateLabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ("name", "color", "keybind", "dataset")    # Dataset and Owner provided by view
        
        
class EditLabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label
        fields = ("name", "color", "keybind")
        
        
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
        fields = ("name", "description", "visibility", "image", "datatype", "keywords")
        
        
# MISCELLANEOUS

class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = "__all__"
        