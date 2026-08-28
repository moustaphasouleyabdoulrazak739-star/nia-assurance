from rest_framework import serializers
from .models import Paiement
from clients.serializers import ClientSerializer
from contrats.serializers import ContratSerializer


class PaiementSerializer(serializers.ModelSerializer):
    client = ClientSerializer(read_only=True)
    contrat = ContratSerializer(read_only=True)
    methode_display = serializers.CharField(
        source='get_methode_display', read_only=True
    )
    statut_display = serializers.CharField(
        source='get_statut_display', read_only=True
    )

    class Meta:
        model = Paiement
        fields = [
            'id', 'client', 'contrat', 'numero_recu',
            'montant', 'methode', 'methode_display',
            'statut', 'statut_display', 'reference',
            'date_paiement', 'date_modification'
        ]
        read_only_fields = ['date_paiement', 'date_modification']


class PaiementCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paiement
        fields = [
            'client', 'contrat', 'numero_recu',
            'montant', 'methode', 'reference'
        ]

    def validate(self, attrs):
        contrat = attrs['contrat']
        if contrat.statut != 'ACTIF':
            raise serializers.ValidationError({
                'contrat': 'Ce contrat n\'est pas actif'
            })
        return attrs