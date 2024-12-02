from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login
from django.contrib import messages
from rest_framework.response import Response
from django.db.models import Q, Count
from rest_framework.parsers import MultiPartParser, FormParser

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

class DatasetListProfile(generics.ListCreateAPIView):
    serializer_class = DatasetSerializer
    permission_classes  = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = user.profile
        datasets = profile.datasets

        return datasets


class GetDataset(APIView):
    serializer_class = DatasetSerializer
    lookup_url_kwarg = 'id'
    
    def get(self, request, *args, **kwargs):
        user = self.request.user
        if user.is_authenticated:
            dataset_id = kwargs[self.lookup_url_kwarg]
                
            if dataset_id != None:
                try:
                    dataset = Dataset.objects.get(Q(id=dataset_id) & Q(Q(visibility = "public") | Q(owner=user.profile)))
                    
                    datasetSerialized = DatasetSerializer(dataset)
                    data = datasetSerialized.data
                    
                    print(dataset.elements)

                    
                    return Response(data, status=status.HTTP_200_OK)
                    
                except Dataset.DoesNotExist:
                    return Response({'Not found': 'No public dataset or dataset belonging to you was found with the id ' + str(dataset_id) + '.'}, status=status.HTTP_404_NOT_FOUND)        
            
            else:
                return Response({'Bad Request': 'Name parameter not found in call to GetDataset.'}, status=status.HTTP_400_BAD_REQUEST)
            
        else:
            return Response({'Unauthorized': 'Must be logged in to get datasets.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        
class CreateDatasetView(APIView):
    serializer_class = CreateDatasetSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, format=None):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save(owner=request.user.profile)

            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response({'Bad Request': 'An error occurred'}, status=status.HTTP_400_BAD_REQUEST)