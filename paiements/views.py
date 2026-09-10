from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Paiement
from .serializers import PaiementSerializer, PaiementCreateSerializer, PaiementReviewSerializer
from nia_assurance.pdf_utils import generer_recu_paiement


class PaiementListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PaiementSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN' or user.role == 'AGENT':
            return Paiement.objects.all()
        return Paiement.objects.filter(client__user=user)


class PaiementCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PaiementCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        paiement = serializer.save()
        return Response({
            'paiement': PaiementSerializer(paiement).data,
            'message': 'Paiement effectué avec succès'
        }, status=status.HTTP_201_CREATED)


class PaiementDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return PaiementReviewSerializer
        return PaiementSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN' or user.role == 'AGENT':
            return Paiement.objects.all()
        return Paiement.objects.filter(client__user=user)

    def update(self, request, *args, **kwargs):
        if request.user.role not in ['ADMIN', 'AGENT']:
            return Response({
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)


class PaiementRecuView(APIView):
    """GET /api/paiements/<id>/recu/ - PDF telechargeable, uniquement pour
    un paiement VALIDE. Meme regle de portee IDOR que les autres vues."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        user = request.user
        if user.role in ('ADMIN', 'AGENT'):
            paiement = get_object_or_404(Paiement, pk=pk)
        else:
            paiement = get_object_or_404(Paiement, pk=pk, client__user=user)

        if paiement.statut != 'VALIDE':
            return Response({
                'error': "Le reçu n'est disponible que pour un paiement validé."
            }, status=status.HTTP_400_BAD_REQUEST)

        pdf = generer_recu_paiement(paiement)
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="recu_{paiement.numero_recu}.pdf"'
        return response