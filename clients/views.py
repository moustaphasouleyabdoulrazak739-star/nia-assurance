from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Client
from .serializers import ClientSerializer, ClientCreateSerializer
from nia_assurance.files import servir_fichier_protege


class ClientListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClientSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN' or user.role == 'AGENT':
            return Client.objects.all()
        return Client.objects.filter(user=user)


class ClientCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ClientCreateSerializer

    def get_serializer_context(self):
        return {'request': self.request}


class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ClientCreateSerializer
        return ClientSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN' or user.role == 'AGENT':
            return Client.objects.all()
        return Client.objects.filter(user=user)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)
class ClientMeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ClientCreateSerializer
        return ClientSerializer

    def get_object(self):
        try:
            return Client.objects.get(user=self.request.user)
        except Client.DoesNotExist:
            # Profil pas encore complete : instance non sauvegardee, servie telle
            # quelle en lecture (champs vides) et creee au premier PATCH.
            return Client(user=self.request.user)

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class ClientPhotoView(APIView):
    """GET /api/clients/<id>/photo/ - photo de profil. Remplace l'ancien
    acces direct et non authentifie via /media/ (audit DevSecOps, constat
    4.1) : meme regle de portee que les autres vues (CLIENT : la sienne
    uniquement, ADMIN/AGENT : toutes)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        if user.role in ('ADMIN', 'AGENT'):
            client = get_object_or_404(Client, pk=pk)
        else:
            client = get_object_or_404(Client, pk=pk, user=user)
        return servir_fichier_protege(client.photo)