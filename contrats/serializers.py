from rest_framework import serializers
from .models import Contrat
from clients.serializers import ClientSerializer
from nia_assurance.utils import generate_numero


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
    numero_contrat = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Contrat
        fields = [
            'id', 'client', 'numero_contrat', 'type_assurance',
            'date_debut', 'date_fin', 'montant_prime',
            'statut', 'description', 'document'
        ]
        read_only_fields = ['id']

    def validate(self, attrs):
        date_debut = attrs.get('date_debut', getattr(self.instance, 'date_debut', None))
        date_fin = attrs.get('date_fin', getattr(self.instance, 'date_fin', None))
        if date_debut and date_fin and date_debut >= date_fin:
            raise serializers.ValidationError({
                'date_fin': 'La date de fin doit être après la date de début'
            })
        return attrs

    def create(self, validated_data):
        if not validated_data.get('numero_contrat'):
            validated_data['numero_contrat'] = generate_numero(Contrat, 'numero_contrat', 'CTR')
        return super().create(validated_data)