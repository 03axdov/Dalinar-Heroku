from django.urls import path
from .views import DatasetListCreate, DatasetDelete, GetCurrentProfile

urlpatterns = [
    path("datasets/", DatasetListCreate.as_view(), name="dataset-list"),
    path("datasets/delete/<int:pk>/", DatasetDelete.as_view(), name="delete-dataset"),
    path("current-profile/", GetCurrentProfile.as_view(), name="current-profile")
]