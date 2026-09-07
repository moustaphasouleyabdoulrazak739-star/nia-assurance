from rest_framework import serializers
from .models import Sinistre
from contrats.serializers import ContratSerializer
from nia_assurance.utils import generate_numero


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
    numero_sinistre = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Sinistre
        fields = [
            'id', 'contrat', 'numero_sinistre', 'type_sinistre',
            'date_sinistre', 'description', 'montant_reclame',
            'document'
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        contrat = attrs.get('contrat') or getattr(self.instance, 'contrat', None)
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
        if not validated_data.get('numero_sinistre'):
            validated_data['numero_sinistre'] = generate_numero(Sinistre, 'numero_sinistre', 'SIN')
        return super().create(validated_data)


class SinistreReviewSerializer(serializers.ModelSerializer):
    """Utilise par la compagnie (ADMIN/AGENT) pour traiter un dossier :
    seuls le statut, l'indemnite et un commentaire sont modifiables, jamais
    les informations declarees par le client."""

    class Meta:
        model = Sinistre
        fields = ['id', 'statut', 'montant_indemnite', 'commentaire']
        read_only_fields = ['id']

    def validate(self, attrs):
        statut = attrs.get('statut', getattr(self.instance, 'statut', None))
        montant_indemnite = attrs.get('montant_indemnite', getattr(self.instance, 'montant_indemnite', None))
        if statut in ('APPROUVE', 'REGLE') and not montant_indemnite:
            raise serializers.ValidationError({
                'montant_indemnite': "Le montant de l'indemnité est requis pour ce statut."
            })
        return attrs