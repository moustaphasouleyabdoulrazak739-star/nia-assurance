from decimal import Decimal

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


def formater_fcfa(montant):
    """150000.00 -> '150 000 FCFA' (centimes affiches seulement s'il y en a)."""
    if montant == montant.to_integral_value():
        texte = f'{montant:,.0f}'
    else:
        texte = f'{montant:,.2f}'
    return texte.replace(',', ' ') + ' FCFA'


class PaiementCreateSerializer(serializers.ModelSerializer):
    numero_recu = serializers.CharField(required=False, allow_blank=True)
    # Le montant envoye ne sert que de confirmation du montant affiche au
    # client : il doit etre egal a la prime du contrat (comparaison en
    # Decimal), et c'est toujours la prime, jamais la valeur recue, qui est
    # enregistree (cf. create). Obligatoire : si la prime a change entre
    # l'affichage et l'envoi, le client recoit une erreur au lieu de payer
    # un montant qu'il n'a jamais vu.
    montant = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal('0.01'),
        error_messages={'min_value': 'Le montant doit être positif.'},
    )

    class Meta:
        model = Paiement
        fields = [
            'id', 'contrat', 'numero_recu',
            'montant', 'methode', 'reference'
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
        if attrs['montant'] != contrat.montant_prime:
            raise serializers.ValidationError({
                'montant': (
                    'Le montant doit être égal à la prime du contrat '
                    f'({formater_fcfa(contrat.montant_prime)}).'
                )
            })
        return attrs

    def create(self, validated_data):
        # Le client est toujours derive du contrat, jamais fourni par l'appelant :
        # evite tout paiement enregistre au nom d'un autre client (IDOR).
        validated_data['client'] = validated_data['contrat'].client
        # Jamais le montant recu : celui calcule cote serveur.
        validated_data['montant'] = validated_data['contrat'].montant_prime
        if not validated_data.get('numero_recu'):
            validated_data['numero_recu'] = generate_numero(Paiement, 'numero_recu', 'REC')
        return super().create(validated_data)


class PaiementReviewSerializer(serializers.ModelSerializer):
    """Utilise par la compagnie (ADMIN/AGENT) pour valider/rejeter un
    paiement : seul le statut est modifiable."""

    class Meta:
        model = Paiement
        fields = ['id', 'statut']
        read_only_fields = ['id']