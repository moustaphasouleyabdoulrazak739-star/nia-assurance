from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)