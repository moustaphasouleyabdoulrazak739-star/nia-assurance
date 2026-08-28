from django.urls import path
from .views import (
    PaiementListView,
    PaiementCreateView,
    PaiementDetailView
)

urlpatterns = [
    path('', PaiementListView.as_view(), name='paiement_list'),
    path('create/', PaiementCreateView.as_view(), name='paiement_create'),
    path('<int:pk>/', PaiementDetailView.as_view(), name='paiement_detail'),
]