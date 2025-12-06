from django.urls import re_path
from .consumers import SignalingConsumer

websocket_urlpatterns = [
    re_path(r'ws/call/?$', SignalingConsumer.as_asgi()),
]
