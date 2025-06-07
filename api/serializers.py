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
        
    def validate(self, data):
        text = data.get("text")
        file = data.get("file")

        if not text and not file:
            raise serializers.ValidationError("You must provide either a file or text.")

        return data
    
    def create(self, validated_data):
        file = validated_data.get("file")
        text = validated_data.get("text")
        dataset = validated_data.get("dataset")

        if file and not text:
            if dataset.dataset_type.lower() == "text":
                try:
                    content = file.read().decode("utf-8")
                    validated_data["text"] = content
                    file.seek(0)  # Reset so the file can still be saved if needed
                except UnicodeDecodeError:
                    raise serializers.ValidationError("File must be UTF-8 encoded text.")

        return super().create(validated_data)
        
        
class EditElementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Element
        fields = ("label","text")
        
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

class DatasetElementSerializer(serializers.ModelSerializer):
    element_count = serializers.IntegerField()
    label_count = serializers.IntegerField()
    
    class Meta:
        model = Dataset
        fields = ("id", "name", "description", "imageSmall", "dataset_type", "downloaders", "created_at",
                  "keywords", "imageHeight", "imageWidth", "element_count", "label_count", "visibility", "datatype")
        extra_kwargs = {"owner": {"read_only": True}}
        
        
class EditDatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ("id", "name", "description", "imageSmall", "dataset_type", 
                  "keywords", "imageHeight", "imageWidth", "visibility", "datatype")
        extra_kwargs = {"owner": {"read_only": True}}
        

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
        fields = ("id", "name", "description", "visibility", "image", "datatype", "dataset_type", "keywords", "imageWidth", "imageHeight")    # Not image small as this is added post-creation
        
        
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
        elif isinstance(instance, RandomRotationLayer):
            return RandomRotationLayerSerializer(instance).data
        elif isinstance(instance, ResizingLayer):
            return ResizingLayerSerializer(instance).data
        elif isinstance(instance, TextVectorizationLayer):
            return TextVectorizationLayerSerializer(instance).data
        elif isinstance(instance, EmbeddingLayer):
            return EmbeddingLayerSerializer(instance).data
        elif isinstance(instance, GlobalAveragePooling1DLayer):
            return GlobalAveragePooling1DLayerSerializer(instance).data
        elif isinstance(instance, GlobalAveragePooling1DLayer):
            return GlobalAveragePooling1DLayerSerializer(instance).data
        elif isinstance(instance, MobileNetV2Layer):
            return MobileNetV2LayerSerializer(instance).data
        elif isinstance(instance, MobileNetV2_96x96Layer):
            return MobileNetV2_96x96LayerSerializer(instance).data
        elif isinstance(instance, MobileNetV2_32x32Layer):
            return MobileNetV2_32x32LayerSerializer(instance).data
        return None  # Handles unexpected cases
    
    
class CreateLayerSerializer(serializers.BaseSerializer):
    def to_representation(self, instance):
        if isinstance(instance, DenseLayer):
            return CreateDenseLayerSerializer(instance).data
        elif isinstance(instance, Conv2DLayer):
            return CreateConv2DLayerSerializer(instance).data
        elif isinstance(instance, MaxPool2DLayer):
            return CreateMaxPool2DLayerSerializer(instance).data
        elif isinstance(instance, FlattenLayer):
            return CreateFlattenLayerSerializer(instance).data
        elif isinstance(instance, DropoutLayer):
            return CreateDropoutLayerSerializer(instance).data
        elif isinstance(instance, RescalingLayer):
            return CreateRescalingLayerSerializer(instance).data
        elif isinstance(instance, RandomFlipLayer):
            return CreateRandomFlipLayerSerializer(instance).data
        elif isinstance(instance, RandomRotationLayer):
            return CreateRandomRotationLayerSerializer(instance).data
        elif isinstance(instance, ResizingLayer):
            return CreateResizingLayerSerializer(instance).data
        elif isinstance(instance, TextVectorizationLayer):
            return CreateTextVectorizationLayerSerializer(instance).data
        elif isinstance(instance, EmbeddingLayer):
            return CreateEmbeddingLayerSerializer(instance).data
        elif isinstance(instance, GlobalAveragePooling1DLayer):
            return CreateGlobalAveragePooling1DLayerSerializer(instance).data
        elif isinstance(instance, MobileNetV2Layer):
            return CreateMobileNetV2LayerSerializer(instance).data
        elif isinstance(instance, MobileNetV2_96x96Layer):
            return CreateMobileNetV2_96x96LayerSerializer(instance).data
        elif isinstance(instance, MobileNetV2_32x32Layer):
            return CreateMobileNetV2_32x32LayerSerializer(instance).data
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
        fields = ["filters", "kernel_size", "padding", "input_x", "input_y", "input_z"]
        
        
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


class RandomRotationLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = RandomRotationLayer
        fields = "__all__"
class CreateRandomRotationLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = RandomRotationLayer
        fields = ["factor", "input_x", "input_y", "input_z"]     


class ResizingLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResizingLayer
        fields = "__all__"
class CreateResizingLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResizingLayer
        fields = ["input_x", "input_y", "input_z", "output_x", "output_y"]      


class TextVectorizationLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TextVectorizationLayer
        fields = "__all__"
class CreateTextVectorizationLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = TextVectorizationLayer
        fields = ["max_tokens", "standardize", "output_sequence_length"]


class EmbeddingLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmbeddingLayer
        fields = "__all__"
class CreateEmbeddingLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmbeddingLayer
        fields = ["max_tokens", "output_dim"]


class GlobalAveragePooling1DLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalAveragePooling1DLayer
        fields = "__all__"
class CreateGlobalAveragePooling1DLayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalAveragePooling1DLayer
        fields = []


class MobileNetV2LayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileNetV2Layer
        fields = "__all__"
class CreateMobileNetV2LayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileNetV2Layer
        fields = []


class MobileNetV2_96x96LayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileNetV2_96x96Layer
        fields = "__all__"
class CreateMobileNetV2_96x96LayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileNetV2_96x96Layer
        fields = []
        

class MobileNetV2_32x32LayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileNetV2_32x32Layer
        fields = "__all__"
class CreateMobileNetV2_32x32LayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileNetV2_32x32Layer
        fields = []

        
# MODEL HANDLING


class ModelElementSerializer(serializers.ModelSerializer):
    layers = LayerSerializer(many=True, read_only=True)
    class Meta:
        model = Model
        fields = ("id", "name", "model_type", "description", "visibility", "imageSmall", "layers", "downloaders", "model_file", "created_at")


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
        fields = ("name", "model_type", "output_type", "description", "visibility", "image")
        
        
# PROFILE HANDLING

class ProfileSerializer(serializers.ModelSerializer):
    saved_models = ModelElementSerializer(many=True, read_only=True)
    
    class Meta:
        model = Profile
        fields = "__all__"
        
        
class ProfileStatsSerializer(serializers.ModelSerializer):
    model_count = serializers.IntegerField()
    dataset_count = serializers.IntegerField()
    total_downloads = serializers.IntegerField()

    class Meta:
        model = Profile
        fields = ['name', "image", "user", 'model_count', 'dataset_count', 'total_downloads']
        
        
class ProfileExpandedSerializer(serializers.ModelSerializer):
    datasets = DatasetElementSerializer(many=True, read_only=True)
    models = ModelElementSerializer(many=True, read_only=True)
    
    class Meta:
        model = Profile
        fields = "__all__"
        
        
class ProfileImageUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['image']