from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Sinistre
from .serializers import SinistreSerializer, SinistreCreateSerializer


class SinistreListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SinistreSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN' or user.role == 'AGENT':
            return Sinistre.objects.all()
        return Sinistre.objects.filter(contrat__client__user=user)


class SinistreCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SinistreCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sinistre = serializer.save()
        return Response({
            'sinistre': SinistreSerializer(sinistre).data,
            'message': 'Sinistre déclaré avec succès'
        }, status=status.HTTP_201_CREATED)


class SinistreDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return SinistreCreateSerializer
        return SinistreSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN' or user.role == 'AGENT':
            return Sinistre.objects.all()
        return Sinistre.objects.filter(contrat__client__user=user)

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