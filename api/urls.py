from django.urls import path
from .views import ImageDatasetListCreate, ImageDatasetDelete, GetCurrentProfile

urlpatterns = [
    path("datasets/", ImageDatasetListCreate.as_view(), name="dataset-list"),
    path("datasets/delete/<int:pk>/", ImageDatasetDelete.as_view(), name="delete-dataset"),
    path("current-profile/", GetCurrentProfile.as_view(), name="current-profile")
]