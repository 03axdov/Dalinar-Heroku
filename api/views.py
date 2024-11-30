from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login
from django.contrib import messages
from rest_framework.response import Response

from .serializers import *
from .models import *


# PROFILE HANDLING

class GetCurrentProfile(APIView):
    serializer_class = ProfileSerializer

    def get(self, request, format=None):
        if request.user.id == None:
            return Response('', status=status.HTTP_200_OK)
        profile = request.user.profile
        profile = ProfileSerializer(profile)
        data = profile.data
        
        return Response(data, status=status.HTTP_200_OK)



# DATASET HANDLING

class DatasetListCreate(generics.ListCreateAPIView):
    serializer_class = DatasetSerializer
    permission_classes  = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Dataset.objects.filter(owner=user)
    
    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(owner=self.request.user)
        else:
            print(serializer.errors)
            

class DatasetDelete(generics.DestroyAPIView):
    serializer_class = DatasetSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        return Dataset.objects.filter(owner=user)


class GetDataset(APIView):
    serializer_class = DatasetSerializer
    lookup_url_kwarg = 'id'
    
    def get(self, request, *args, **kwargs):
        user = self.request.user
        if user.is_authenticated:
            dataset_id = kwargs[self.lookup_url_kwarg]
            if dataset_id != None:
                try:
                    dataset = Dataset.objects.get(id=dataset_id)
                    dataset = DatasetSerializer(dataset)
                    data = dataset.data
                    return Response(data, status=status.HTTP_200_OK)
                    
                except Dataset.DoesNotExist:
                    return Response({'Bad Request': 'No dataset was found with the id ' + dataset_id + '.'}, status=status.HTTP_404_NOT_FOUND)        
            
            else:
                return Response({'Bad Request': 'Name parameter not found in call to GetDataset.'}, status=status.HTTP_400_BAD_REQUEST)
            
        else:
            return Response({'Bad Request': 'Must be logged in to get datasets.'}, status=status.HTTP_401_UNAUTHORIZED)