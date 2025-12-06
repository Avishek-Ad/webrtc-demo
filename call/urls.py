from django.urls import path
from .views import *

urlpatterns = [
    path('', call, name='call'),
]