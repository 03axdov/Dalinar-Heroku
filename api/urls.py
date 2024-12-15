from django.urls import path
from .views import *

urlpatterns = [
    # PROFILE HANDLING
    path("current-profile/", GetCurrentProfile.as_view(), name="current-profile"),
    
    # DATASET HANDLING
    path("my-datasets/", DatasetListProfile.as_view(), name="my-datasets"),
    path("datasets/<int:id>", GetDataset.as_view(), name="get-dataset"),
    path("create-dataset/", CreateDatasetView.as_view(), name="create-dataset"),

    # ELEMENT HANDLING
    path("create-element/", CreateElementView.as_view(), name="create-element"),
    path("edit-element/", EditElement.as_view(), name="edit-element"),
    path("remove-element-label/", RemoveElementLabel.as_view(), name="remove-element-label"),
    
    # LABEL HANDLING
    path("create-label/", CreateLabelView.as_view(), name="create-label"),
    path("dataset-labels/", GetDatasetLabels.as_view(), name="dataset-labels")
]