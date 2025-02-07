from django.urls import path
from .views import *

urlpatterns = [
    # PROFILE HANDLING
    path("current-profile/", GetCurrentProfile.as_view(), name="current-profile"),
    
    # DATASET HANDLING
    path("datasets/", DatasetListPublic.as_view(), name="datasets"),
    path("my-datasets/", DatasetListProfile.as_view(), name="my-datasets"),
    path("datasets/<int:id>", GetDataset.as_view(), name="get-dataset"),
    path("datasets/public/<int:id>", GetDatasetPublic.as_view(), name="get-dataset-public"),
    path("create-dataset/", CreateDataset.as_view(), name="create-dataset"),
    path("edit-dataset/", EditDataset.as_view(), name="edit-dataset"),
    path("download-dataset/", DownloadDataset.as_view(), name="download-dataset"),
    path("delete-dataset/", DeleteDataset.as_view(), name="delete-dataset"),
    path("reorder-dataset-elements/", ReorderDatasetElements.as_view(), name="reorder-dataset-elements"),
    path("reorder-dataset-labels/", ReorderDatasetLabels.as_view(), name="reorder-dataset-labels"),

    # ELEMENT HANDLING
    path("create-element/", CreateElement.as_view(), name="create-element"),
    path("edit-element-label/", EditElementLabel.as_view(), name="edit-element-label"),
    path("edit-element/", EditElement.as_view(), name="edit-element"),
    path("remove-element-label/", RemoveElementLabel.as_view(), name="remove-element-label"),
    path("delete-element/", DeleteElement.as_view(), name="delete-element"),
    path("resize-element-image/", ResizeElementImage.as_view(), name="resize-element-image"),
    
    # LABEL HANDLING
    path("create-label/", CreateLabel.as_view(), name="create-label"),
    path("dataset-labels/", GetDatasetLabels.as_view(), name="dataset-labels"),
    path("edit-label/", EditLabel.as_view(), name="edit-label"),
    path("delete-label/", DeleteLabel.as_view(), name="delete-label"),
    
    # AREA HANDLING
    path("create-area/", CreateArea.as_view(), name="create-area"),
    path("edit-area/", EditArea.as_view(), name="edit-area"),
    path("delete-area/", DeleteArea.as_view(), name="delete-area"),
    
    # MODEL HANDLING
    path("create-model/", CreateModel.as_view(), name="create-model")
]