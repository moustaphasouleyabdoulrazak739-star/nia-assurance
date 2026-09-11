from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Contrat
from .serializers import ContratSerializer, ContratCreateSerializer
from nia_assurance.pdf_utils import generer_attestation_contrat
from journal.utils import enregistrer_action


class ContratListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContratSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN' or user.role == 'AGENT':
            return Contrat.objects.all()
        return Contrat.objects.filter(client__user=user)


class ContratCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContratCreateSerializer

    def create(self, request, *args, **kwargs):
        if request.user.role not in ['ADMIN', 'AGENT']:
            return Response({
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        contrat = serializer.save()
        enregistrer_action(
            self.request.user, 'CONTRAT_CREE',
            f'Contrat {contrat.numero_contrat} créé pour {contrat.client}',
            contrat=contrat,
        )


class ContratDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ContratCreateSerializer
        return ContratSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN' or user.role == 'AGENT':
            return Contrat.objects.all()
        return Contrat.objects.filter(client__user=user)

    def update(self, request, *args, **kwargs):
        if request.user.role not in ['ADMIN', 'AGENT']:
            return Response({
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        contrat = serializer.save()
        enregistrer_action(
            self.request.user, 'CONTRAT_MODIFIE',
            f'Contrat {contrat.numero_contrat} modifié',
            contrat=contrat,
        )

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)


class ContratAttestationView(APIView):
    """GET /api/contrats/<id>/attestation/ - PDF telechargeable, uniquement
    pour un contrat ACTIF. Meme regle de portee IDOR que les autres vues :
    un client ne peut recuperer que ses propres contrats."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        if user.role in ('ADMIN', 'AGENT'):
            contrat = get_object_or_404(Contrat, pk=pk)
        else:
            contrat = get_object_or_404(Contrat, pk=pk, client__user=user)

        if contrat.statut != 'ACTIF':
            return Response({
                'error': "L'attestation n'est disponible que pour un contrat actif."
            }, status=status.HTTP_400_BAD_REQUEST)

        pdf = generer_attestation_contrat(contrat)
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="attestation_{contrat.numero_contrat}.pdf"'
        return response