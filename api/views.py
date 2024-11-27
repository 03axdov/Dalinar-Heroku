from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, DatasetSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Dataset
from django.contrib.auth import authenticate, login
from django.contrib import messages



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


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]