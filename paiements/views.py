from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Paiement
from .serializers import PaiementSerializer, PaiementCreateSerializer


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


class PaiementDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PaiementSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN' or user.role == 'AGENT':
            return Paiement.objects.all()
        return Paiement.objects.filter(client__user=user)