from django.urls import path
from .views import (
    ContratListView,
    ContratCreateView,
    ContratDetailView,
    ContratAttestationView,
)

urlpatterns = [
    path('', ContratListView.as_view(), name='contrat_list'),
    path('create/', ContratCreateView.as_view(), name='contrat_create'),
    path('<int:pk>/', ContratDetailView.as_view(), name='contrat_detail'),
    path('<int:pk>/attestation/', ContratAttestationView.as_view(), name='contrat_attestation'),
]
