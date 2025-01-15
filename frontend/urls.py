from django.urls import path
from .views import index
from .views import index_no_login

urlpatterns = [
    path('', index_no_login),
    path('home/', index),
    path("create-dataset/", index),
    path("edit-dataset/<int:id>", index),
    path("datasets/<int:id>", index_no_login)
]