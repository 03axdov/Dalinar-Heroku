from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers
from api.models import Model
from api.serializers import *


def parse_dimensions(data): # Empty values given as blank strings, must be set to None
    if "input_x" in data.keys() and not data["input_x"]: data["input_x"] = None
    elif "input_x" in data.keys():
        data["input_x"] = int(data["input_x"])
    if "input_y" in data.keys() and not data["input_y"]: data["input_y"] = None
    elif "input_y" in data.keys():
        data["input_y"] = int(data["input_y"])
    if "input_z" in data.keys() and not data["input_z"]: data["input_z"] = None
    elif "input_z" in data.keys():
        data["input_z"] = int(data["input_z"])
        

ALLOWED_TYPES = {
    "dense": CreateDenseLayerSerializer,
    "conv2d": CreateConv2DLayerSerializer,
    "maxpool2d": CreateMaxPool2DLayerSerializer,
    "flatten": CreateFlattenLayerSerializer,
    "dropout": CreateDropoutLayerSerializer,
    "rescaling": CreateRescalingLayerSerializer,
    "randomflip": CreateRandomFlipLayerSerializer,
    "randomrotation": CreateRandomRotationLayerSerializer,
    "resizing": CreateResizingLayerSerializer,
    "textvectorization": CreateTextVectorizationLayerSerializer,
    "embedding": CreateEmbeddingLayerSerializer,
    "globalaveragepooling1d": CreateGlobalAveragePooling1DLayerSerializer,
    "mobilenetv2": CreateMobileNetV2LayerSerializer,
    "mobilenetv2_96x96": CreateMobileNetV2_96x96LayerSerializer,
    "mobilenetv2_32x32": CreateMobileNetV2_32x32LayerSerializer,
}


def create_layer_instance(data, user):
    print(data)
    layer_type = data.get("type")
    if layer_type not in ALLOWED_TYPES:
        raise ValueError(f"Invalid layer type: {layer_type}")
    
    parse_dimensions(data)  # optional, based on your current code

    serializer_class = ALLOWED_TYPES[layer_type]
    serializer = serializer_class(data=data)

    if not serializer.is_valid():
        raise serializers.ValidationError("Invalid layer data")

    try:
        model = Model.objects.get(id=data["model"])
    except ObjectDoesNotExist:
        raise ValueError(f"Model with id {data['model']} not found")

    if not user.is_authenticated:
        raise PermissionError("User must be authenticated to create layers")

    if user.profile != model.owner:
        raise PermissionError("User does not own the model")

    last = model.layers.all().last()
    idx = last.index + 1 if last else 0

    instance = serializer.save(
        model=model,
        layer_type=layer_type,
        index=idx,
        activation_function=data.get("activation_function", "")
    )

    return instance
