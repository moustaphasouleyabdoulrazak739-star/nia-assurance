from rest_framework import serializers
from .models import Contrat
from clients.serializers import ClientSerializer


class ContratSerializer(serializers.ModelSerializer):
    client = ClientSerializer(read_only=True)
    type_assurance_display = serializers.CharField(
        source='get_type_assurance_display', read_only=True
    )
    statut_display = serializers.CharField(
        source='get_statut_display', read_only=True
    )

    class Meta:
        model = Contrat
        fields = [
            'id', 'client', 'numero_contrat',
            'type_assurance', 'type_assurance_display',
            'date_debut', 'date_fin', 'montant_prime',
            'statut', 'statut_display', 'description',
            'document', 'date_creation', 'date_modification'
        ]
        read_only_fields = ['date_creation', 'date_modification']


class ContratCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contrat
        fields = [
            'client', 'numero_contrat', 'type_assurance',
            'date_debut', 'date_fin', 'montant_prime',
            'statut', 'description', 'document'
        ]

    def validate(self, attrs):
        if attrs['date_debut'] >= attrs['date_fin']:
            raise serializers.ValidationError({
                'date_fin': 'La date de fin doit être après la date de début'
            })
        return attrs