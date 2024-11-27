from django.urls import path
from .views import DatasetListCreate, DatasetDelete

urlpatterns = [
    path("datasets/", DatasetListCreate.as_view(), name="dataset-list"),
    path("datasets/delete/<int:pk>/", DatasetDelete.as_view(), name="delete-dataset")
]