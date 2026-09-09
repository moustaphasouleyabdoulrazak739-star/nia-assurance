from django.urls import path
from .views import (
    DemandeListView,
    DemandeCreateView,
    DemandeDetailView,
    DemandeResoumettreView,
    DemandeValiderView,
    DemandeRejeterView,
)

urlpatterns = [
    path('', DemandeListView.as_view(), name='demande_list'),
    path('create/', DemandeCreateView.as_view(), name='demande_create'),
    path('<int:pk>/', DemandeDetailView.as_view(), name='demande_detail'),
    path('<int:pk>/resoumettre/', DemandeResoumettreView.as_view(), name='demande_resoumettre'),
    path('<int:pk>/valider/', DemandeValiderView.as_view(), name='demande_valider'),
    path('<int:pk>/rejeter/', DemandeRejeterView.as_view(), name='demande_rejeter'),
]
