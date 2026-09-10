from django.urls import path
from .views import (
    PaiementListView,
    PaiementCreateView,
    PaiementDetailView,
    PaiementRecuView,
)

urlpatterns = [
    path('', PaiementListView.as_view(), name='paiement_list'),
    path('create/', PaiementCreateView.as_view(), name='paiement_create'),
    path('<int:pk>/', PaiementDetailView.as_view(), name='paiement_detail'),
    path('<int:pk>/recu/', PaiementRecuView.as_view(), name='paiement_recu'),
]
