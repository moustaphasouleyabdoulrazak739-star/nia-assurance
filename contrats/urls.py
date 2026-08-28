from django.urls import path
from .views import (
    ContratListView,
    ContratCreateView,
    ContratDetailView
)

urlpatterns = [
    path('', ContratListView.as_view(), name='contrat_list'),
    path('create/', ContratCreateView.as_view(), name='contrat_create'),
    path('<int:pk>/', ContratDetailView.as_view(), name='contrat_detail'),
]