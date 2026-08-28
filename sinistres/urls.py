from django.urls import path
from .views import (
    SinistreListView,
    SinistreCreateView,
    SinistreDetailView
)

urlpatterns = [
    path('', SinistreListView.as_view(), name='sinistre_list'),
    path('create/', SinistreCreateView.as_view(), name='sinistre_create'),
    path('<int:pk>/', SinistreDetailView.as_view(), name='sinistre_detail'),
]