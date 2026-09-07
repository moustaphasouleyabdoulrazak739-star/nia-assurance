from rest_framework import serializers
from .models import Paiement
from clients.serializers import ClientSerializer
from contrats.serializers import ContratSerializer
from nia_assurance.utils import generate_numero


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
    numero_recu = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Paiement
        fields = [
            'id', 'contrat', 'numero_recu',
            'montant', 'methode', 'reference'
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        contrat = attrs['contrat']
        if contrat.statut != 'ACTIF':
            raise serializers.ValidationError({
                'contrat': 'Ce contrat n\'est pas actif'
            })
        request = self.context.get('request')
        if request and request.user.role == 'CLIENT' and contrat.client.user_id != request.user.id:
            raise serializers.ValidationError({
                'contrat': 'Ce contrat ne vous appartient pas'
            })
        return attrs

    def create(self, validated_data):
        # Le client est toujours derive du contrat, jamais fourni par l'appelant :
        # evite tout paiement enregistre au nom d'un autre client (IDOR).
        validated_data['client'] = validated_data['contrat'].client
        if not validated_data.get('numero_recu'):
            validated_data['numero_recu'] = generate_numero(Paiement, 'numero_recu', 'REC')
        return super().create(validated_data)