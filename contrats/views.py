from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Contrat
from .serializers import ContratSerializer, ContratCreateSerializer


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

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({
                'error': 'Permission refusée'
            }, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)