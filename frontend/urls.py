from django.urls import path
from .views import index, index_no_login, welcome_view

urlpatterns = [
    path('', index_no_login),
    path("welcome/", welcome_view, name="welcome"),
    path('home/', index),
    path('explore/', index_no_login),
    path("guide/", index_no_login),
    path("create-dataset/", index),
    path("create-model/", index),
    path("edit-dataset/<int:id>", index),
    path("edit-model/<int:id>", index),
    path("datasets/<int:id>", index),
    path("datasets/public/<int:id>", index_no_login),
    path("models/<int:id>", index),
    path("models/public/<int:id>", index_no_login),
    path("accounts/", index_no_login)
]