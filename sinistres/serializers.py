from rest_framework import serializers
from .models import Sinistre
from contrats.serializers import ContratSerializer


class SinistreSerializer(serializers.ModelSerializer):
    contrat = ContratSerializer(read_only=True)
    type_sinistre_display = serializers.CharField(
        source='get_type_sinistre_display', read_only=True
    )
    statut_display = serializers.CharField(
        source='get_statut_display', read_only=True
    )

    class Meta:
        model = Sinistre
        fields = [
            'id', 'contrat', 'numero_sinistre',
            'type_sinistre', 'type_sinistre_display',
            'date_sinistre', 'date_declaration',
            'description', 'montant_reclame',
            'montant_indemnite', 'statut', 'statut_display',
            'document', 'commentaire', 'date_modification'
        ]
        read_only_fields = ['date_declaration', 'date_modification']


class SinistreCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sinistre
        fields = [
            'contrat', 'numero_sinistre', 'type_sinistre',
            'date_sinistre', 'description', 'montant_reclame',
            'document'
        ]

    def validate(self, attrs):
        contrat = attrs['contrat']
        if contrat.statut != 'ACTIF':
            raise serializers.ValidationError({
                'contrat': 'Ce contrat n\'est pas actif'
            })
        return attrs