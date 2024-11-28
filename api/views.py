from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login
from django.contrib import messages
from rest_framework.response import Response

from .serializers import ImageDatasetSerializer, ProfileSerializer
from .models import ImageDataset


class GetCurrentProfile(APIView):
    serializer_class = ProfileSerializer

    def get(self, request, format=None):
        if request.user.id == None:
            return Response('', status=status.HTTP_200_OK)
        profile = request.user.profile
        profile = ProfileSerializer(profile)
        data = profile.data
        
        return Response(data, status=status.HTTP_200_OK)



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
