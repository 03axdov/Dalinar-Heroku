from django.contrib.auth.models import User
from rest_framework import serializers
from .models import *


# MISCELLANEOUS

class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
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
        fields = ("name", "description", "visibility", "image", "datatype", "dataset_type", "keywords", "imageWidth", "imageHeight")    # Not image small as this is added post-creation
        
        
# LAYER HANDLING

class LayerSerializer(serializers.BaseSerializer):
    def to_representation(self, instance):
        if isinstance(instance, DenseLayer):
            return DenseLayerSerializer(instance).data
        elif isinstance(instance, Conv2DLayer):
            return Conv2DLayerSerializer(instance).data
        elif isinstance(instance, MaxPool2DLayer):
            return MaxPool2DLayerSerializer(instance).data
        elif isinstance(instance, FlattenLayer):
            return FlattenLayerSerializer(instance).data
        elif isinstance(instance, DropoutLayer):
            return DropoutLayerSerializer(instance).data
        elif isinstance(instance, RescalingLayer):
            return RescalingLayerSerializer(instance).data
        elif isinstance(instance, RandomFlipLayer):
            return RandomFlipLayerSerializer(instance).data
        elif isinstance(instance, ResizingLayer):
            return ResizingLayerSerializer(instance).data
        return None  # Handles unexpected cases
    
    
class CreateLayerSerializer(serializers.BaseSerializer):
    def to_representation(self, instance):
        if isinstance(instance, DenseLayer):
            return CreateDenseLayerSerializer(instance).data
        elif isinstance(instance, Conv2DLayer):
            return CreateConv2DLayerSerializer(instance).data
        elif isinstance(instance, MaxPool2DLayer):
            return CreateMaxPool2DLayer(instance).data
        elif isinstance(instance, FlattenLayer):
            return CreateFlattenLayerSerializer(instance).data
        elif isinstance(instance, DropoutLayer):
            return CreateDropoutLayerSerializer(instance).data
        elif isinstance(instance, RescalingLayer):
            return CreateRescalingLayerSerializer(instance).data
        elif isinstance(instance, RandomFlipLayer):
            return CreateRandomFlipLayer(instance).data
        elif isinstance(instance, ResizingLayer):
            return CreateResizingLayerSerializer(instance).data
        return None  # Handles unexpected cases
    

class DenseLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = DenseLayer
        fields = "__all__"   
class CreateDenseLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = DenseLayer
        fields = ["nodes_count", "input_x"]
        
        
class Conv2DLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conv2DLayer
        fields = "__all__"     
class CreateConv2DLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conv2DLayer
        fields = ["filters", "kernel_size", "input_x", "input_y", "input_z"]
        
        
class MaxPool2DLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaxPool2DLayer
        fields = "__all__"     
class CreateMaxPool2DLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaxPool2DLayer
        fields = ["pool_size"]
        
        
class FlattenLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlattenLayer
        fields = "__all__"
class CreateFlattenLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlattenLayer
        fields = ["input_x", "input_y"]
        
        
class DropoutLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = DropoutLayer
        fields = "__all__"
class CreateDropoutLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = DropoutLayer
        fields = ["rate"]        
        
        
class RescalingLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = RescalingLayer
        fields = "__all__" 
class CreateRescalingLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = RescalingLayer
        fields = ["scale", "offset", "input_x", "input_y", "input_z"]       


class RandomFlipLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = RandomFlipLayer
        fields = "__all__"
class CreateRandomFlipLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = RandomFlipLayer
        fields = ["mode", "input_x", "input_y", "input_z"]       


class ResizingLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResizingLayer
        fields = "__all__"
class CreateResizingLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResizingLayer
        fields = ["input_x", "input_y", "input_z", "output_x", "output_y"]      

        
# MODEL HANDLING


class ModelSerializer(serializers.ModelSerializer):
    layers = LayerSerializer(many=True, read_only=True)
    trained_on = DatasetSerializer(read_only=True)
    evaluated_on = DatasetSerializer(read_only=True)
    
    class Meta:
        model = Model
        fields = "__all__"
        extra_kwargs = {"owner": {"read_only": True}}
        
class CreateModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Model
        fields = ("name", "model_type", "description", "visibility", "image")
        
        
# PROFILE HANDLING

class ProfileSerializer(serializers.ModelSerializer):
    saved_datasets = DatasetSerializer(many=True, read_only=True)
    saved_models = ModelSerializer(many=True, read_only=True)
    
    class Meta:
        model = Profile
        fields = "__all__"