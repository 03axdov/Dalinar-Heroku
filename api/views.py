from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import ImageDatasetSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import ImageDataset
from django.contrib.auth import authenticate, login
from django.contrib import messages



class ImageDatasetListCreate(generics.ListCreateAPIView):
    serializer_class = ImageDatasetSerializer
    permission_classes  = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return ImageDataset.objects.filter(owner=user)
    
    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(owner=self.request.user)
        else:
            print(serializer.errors)
            

class ImageDatasetDelete(generics.DestroyAPIView):
    serializer_class = ImageDatasetSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return ImageDataset.objects.filter(owner=user)
