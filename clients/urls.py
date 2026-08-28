from django.urls import path
from .views import (
    ClientListView,
    ClientCreateView,
    ClientDetailView,
    ClientMeView,
)

urlpatterns = [
    path('', ClientListView.as_view(), name='client_list'),
    path('create/', ClientCreateView.as_view(), name='client_create'),
    path('me/', ClientMeView.as_view(), name='client_me'),
    path('<int:pk>/', ClientDetailView.as_view(), name='client_detail'),
]