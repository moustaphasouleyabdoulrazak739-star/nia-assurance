import re
from decimal import Decimal

from django.db import IntegrityError, transaction
from rest_framework import serializers
from .models import (
    CONTRAINTE_UN_PAIEMENT_EN_ATTENTE,
    MESSAGE_PAIEMENT_DEJA_EN_ATTENTE,
    Paiement,
)
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


# Modes mobile money : le champ `reference` porte alors le numero de
# telephone du compte, obligatoire (meme regle que les formulaires web et
# mobile, desormais imposee aussi par le serveur).
METHODES_MOBILE_MONEY = ('MYNITA', 'AMANATA')

# Numero nigerien : 8 chiffres, prefixe international +227 ou 00227
# facultatif ; les espaces sont ignores. [0-9] et non \d, qui accepterait
# aussi des chiffres non latins (ex. arabes-indiens).
TELEPHONE_NIGER_RE = re.compile(r'(?:\+227|00227)?([0-9]{8})')


def normaliser_telephone_niger(valeur):
    """'96 00 00 00', '+227 96000000', '0022796000000' -> '+22796000000'.
    Renvoie None si le format n'est pas reconnu."""
    compact = ''.join((valeur or '').split())
    correspondance = TELEPHONE_NIGER_RE.fullmatch(compact)
    return f'+227{correspondance.group(1)}' if correspondance else None


def formater_fcfa(montant):
    """150000.00 -> '150 000 FCFA' (centimes affiches seulement s'il y en a)."""
    if montant == montant.to_integral_value():
        texte = f'{montant:,.0f}'
    else:
        texte = f'{montant:,.2f}'
    return texte.replace(',', ' ') + ' FCFA'


def a_un_paiement_en_attente(contrat, sauf=None):
    paiements = Paiement.objects.filter(contrat=contrat, statut='EN_ATTENTE')
    if sauf is not None:
        paiements = paiements.exclude(pk=sauf.pk)
    return paiements.exists()


def est_doublon_en_attente(exc, contrat, sauf=None):
    """Vrai si l'IntegrityError vient de la contrainte "un seul paiement
    EN_ATTENTE par contrat". Si PostgreSQL signale d'abord une autre
    contrainte (ex. numero_recu genere en double par la requete
    concurrente), l'existence d'un paiement en attente tranche."""
    return (
        CONTRAINTE_UN_PAIEMENT_EN_ATTENTE in str(exc)
        or a_un_paiement_en_attente(contrat, sauf=sauf)
    )


class PaiementCreateSerializer(serializers.ModelSerializer):
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
        # numero_recu toujours genere par le serveur (cf. create) : une valeur
        # envoyee par le client est ignoree, sinon il pourrait imposer un
        # numero de recu arbitraire (ex. imitant celui d'un autre paiement).
        read_only_fields = ['id', 'numero_recu']

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
        erreurs = {}
        # Apres le controle d'appartenance : on ne revele jamais l'etat des
        # paiements du contrat d'un autre client.
        if a_un_paiement_en_attente(contrat):
            erreurs['contrat'] = MESSAGE_PAIEMENT_DEJA_EN_ATTENTE
        if attrs['montant'] != contrat.montant_prime:
            erreurs['montant'] = (
                'Le montant doit être égal à la prime du contrat '
                f'({formater_fcfa(contrat.montant_prime)}).'
            )
        if attrs['methode'] in METHODES_MOBILE_MONEY:
            reference = attrs.get('reference', '')
            telephone = normaliser_telephone_niger(reference)
            if not reference.strip():
                erreurs['reference'] = 'Le numéro de téléphone est obligatoire pour ce mode de paiement.'
            elif telephone is None:
                erreurs['reference'] = (
                    'Numéro de téléphone invalide : 8 chiffres attendus, '
                    'ex. 96 00 00 00 ou +227 96 00 00 00.'
                )
            else:
                attrs['reference'] = telephone
        if erreurs:
            raise serializers.ValidationError(erreurs)
        return attrs

    def create(self, validated_data):
        # Le client est toujours derive du contrat, jamais fourni par l'appelant :
        # evite tout paiement enregistre au nom d'un autre client (IDOR).
        validated_data['client'] = validated_data['contrat'].client
        # Jamais le montant recu : celui calcule cote serveur.
        validated_data['montant'] = validated_data['contrat'].montant_prime
        validated_data['numero_recu'] = generate_numero(Paiement, 'numero_recu', 'REC')
        try:
            # Savepoint : l'IntegrityError n'invalide pas une transaction
            # englobante, et la verification qui suit reste possible.
            with transaction.atomic():
                return super().create(validated_data)
        except IntegrityError as exc:
            # Deux requetes simultanees ont passe validate() : la contrainte
            # en base a refuse la seconde. Meme 400 que le refus applicatif.
            if est_doublon_en_attente(exc, validated_data['contrat']):
                raise serializers.ValidationError({
                    'contrat': [MESSAGE_PAIEMENT_DEJA_EN_ATTENTE]
                })
            raise


class PaiementReviewSerializer(serializers.ModelSerializer):
    """Utilise par la compagnie (ADMIN/AGENT) pour valider/rejeter un
    paiement : seul le statut est modifiable."""

    class Meta:
        model = Paiement
        fields = ['id', 'statut']
        read_only_fields = ['id']

    def validate_statut(self, statut):
        # Repasser un paiement EN_ATTENTE alors qu'un autre l'est deja pour
        # le meme contrat violerait la contrainte en base : 400, pas 500.
        if (
            statut == 'EN_ATTENTE' and self.instance is not None
            and a_un_paiement_en_attente(self.instance.contrat, sauf=self.instance)
        ):
            raise serializers.ValidationError(MESSAGE_PAIEMENT_DEJA_EN_ATTENTE)
        return statut

    def update(self, instance, validated_data):
        try:
            with transaction.atomic():
                return super().update(instance, validated_data)
        except IntegrityError as exc:
            if est_doublon_en_attente(exc, instance.contrat, sauf=instance):
                raise serializers.ValidationError({
                    'statut': [MESSAGE_PAIEMENT_DEJA_EN_ATTENTE]
                })
            raise
