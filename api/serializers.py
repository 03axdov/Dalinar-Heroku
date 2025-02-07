from django.contrib.auth.models import User
from rest_framework import serializers
from .models import *


# MISCELLANEOUS

class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = "__all__"


# PROFILE HANDLING

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = "__all__"


# ELEMENT HANDLING

class ElementSerializer(serializers.ModelSerializer):
    areas = AreaSerializer(many=True, read_only=True)  # Use the related_name for the areas
    
    class Meta:
        model = Element
        fields = "__all__"


class CreateElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Element
        fields = ("dataset", "file", "index")
        
        
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
        fields = ("name", "color", "keybind", "dataset", "index")    # Dataset and Owner provided by view
        
        
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
        fields = ("name", "description", "visibility", "image", "datatype", "keywords", "imageWidth", "imageHeight")    # Not image small as this is added post-creation
        
        
# LAYER HANDLING

class LayerSerializer(serializers.BaseSerializer):
    def to_representation(self, instance):
        if isinstance(instance, DenseLayer):
            return DenseLayerSerializer(instance).data
        return None  # Handles unexpected cases


class DenseLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = DenseLayer
        fields = "__all__"
        
        
# MODEL HANDLING

class ModelSerializer(serializers.ModelSerializer):
    layers = LayerSerializer(many=True, read_only=True)
    
    class Meta:
        model = Model
        fields = "__all__"
        extra_kwargs = {"owner": {"read_only": True}}
        

class CreateModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Model
        fields = ("name", "description", "visibility", "image")