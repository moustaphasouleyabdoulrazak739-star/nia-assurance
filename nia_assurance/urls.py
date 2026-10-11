from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/', include('users.urls')),

    # Apps
    path('api/clients/', include('clients.urls')),
    path('api/contrats/', include('contrats.urls')),
    path('api/sinistres/', include('sinistres.urls')),
    path('api/paiements/', include('paiements.urls')),
    path('api/demandes/', include('demandes.urls')),
    path('api/journal/', include('journal.urls')),
    path('api/statistiques/', include('statistiques.urls')),

    # Pas de static(settings.MEDIA_URL, ...) ici : les fichiers uploades
    # (pieces d'identite, documents de contrat/sinistre, photos) ne sont
    # plus jamais servis en direct sans authentification (audit DevSecOps,
    # constat 4.1). Chaque fichier passe desormais par une vue protegee,
    # dediee a son modele, qui verifie la propriete avant de le renvoyer :
    # contrats.views.ContratDocumentView, sinistres.views.SinistreDocumentView,
    # clients.views.ClientPhotoView, demandes.views.DocumentDemandeFileView.
    # Fonctionne aussi bien en DEBUG=False qu'en DEBUG=True, contrairement
    # au helper static() qui ne s'active qu'en DEBUG=True.
]
