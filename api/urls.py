from django.urls import path
from .views import ImageDatasetListCreate, ImageDatasetDelete

urlpatterns = [
    path("datasets/", ImageDatasetListCreate.as_view(), name="dataset-list"),
    path("datasets/delete/<int:pk>/", ImageDatasetDelete.as_view(), name="delete-dataset")
]