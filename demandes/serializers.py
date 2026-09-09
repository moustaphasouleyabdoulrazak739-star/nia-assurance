from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import DemandeContrat, DocumentDemande
from .constants import DOCUMENTS_REQUIS, CHAMP_PAR_TYPE_DOCUMENT
from .validators import validate_document_file
from clients.serializers import ClientSerializer
from contrats.models import Contrat
from contrats.serializers import ContratSerializer
from nia_assurance.utils import generate_numero


class DocumentDemandeSerializer(serializers.ModelSerializer):
    type_document_display = serializers.CharField(
        source='get_type_document_display', read_only=True
    )

    class Meta:
        model = DocumentDemande
        fields = ['id', 'type_document', 'type_document_display', 'fichier', 'date_upload']
        read_only_fields = ['id', 'date_upload']


class DemandeContratSerializer(serializers.ModelSerializer):
    """Lecture (liste/detail), cote client comme cote compagnie."""

    client = ClientSerializer(read_only=True)
    contrat = ContratSerializer(read_only=True)
    documents = DocumentDemandeSerializer(many=True, read_only=True)
    type_assurance_display = serializers.CharField(
        source='get_type_assurance_display', read_only=True
    )
    statut_display = serializers.CharField(
        source='get_statut_display', read_only=True
    )

    class Meta:
        model = DemandeContrat
        fields = [
            'id', 'client', 'numero_demande',
            'type_assurance', 'type_assurance_display',
            'statut', 'statut_display', 'motif_rejet',
            'contrat', 'demande_precedente', 'documents',
            'date_demande', 'date_traitement',
        ]
        read_only_fields = fields


class DemandeContratCreateSerializer(serializers.Serializer):
    """Creation (et resoumission) d'une demande : multipart avec un champ de
    fichier dedie par type de document (cf. constants.CHAMP_PAR_TYPE_DOCUMENT),
    plutot qu'une liste generique - permet une validation precise de ce qui
    est obligatoire pour le type d'assurance choisi."""

    type_assurance = serializers.ChoiceField(choices=Contrat.TYPE_CHOICES)

    def validate(self, attrs):
        request = self.context['request']
        type_assurance = attrs['type_assurance']
        regles = DOCUMENTS_REQUIS.get(type_assurance, {})

        groupes_fournis = set()
        erreurs = {}

        for type_document, champ in CHAMP_PAR_TYPE_DOCUMENT.items():
            fichier = request.FILES.get(champ)
            regle = regles.get(type_document)
            if fichier:
                try:
                    validate_document_file(fichier)
                except DjangoValidationError as exc:
                    erreurs[champ] = ' '.join(exc.messages)
                if isinstance(regle, str) and regle.startswith('un_de:'):
                    groupes_fournis.add(regle.split(':', 1)[1])
            elif regle is True:
                erreurs[champ] = 'Ce document est obligatoire pour ce type d\'assurance.'

        groupes_requis = {
            regle.split(':', 1)[1]
            for regle in regles.values()
            if isinstance(regle, str) and regle.startswith('un_de:')
        }
        for groupe in groupes_requis - groupes_fournis:
            erreurs.setdefault(
                'documents',
                "Au moins un des justificatifs demandés (titre de propriété ou bail) est obligatoire."
            )

        if erreurs:
            raise serializers.ValidationError(erreurs)
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        client = request.user.client
        demande_precedente = validated_data.pop('demande_precedente', None)

        demande = DemandeContrat.objects.create(
            client=client,
            type_assurance=validated_data['type_assurance'],
            numero_demande=generate_numero(DemandeContrat, 'numero_demande', 'DEM'),
            demande_precedente=demande_precedente,
        )

        for type_document, champ in CHAMP_PAR_TYPE_DOCUMENT.items():
            fichier = request.FILES.get(champ)
            if fichier:
                DocumentDemande.objects.create(
                    demande=demande, type_document=type_document, fichier=fichier
                )

        return demande


class DemandeValiderSerializer(serializers.Serializer):
    """Utilise par la compagnie pour valider une demande : cree le Contrat
    reel avec les conditions (dates, prime) qu'elle fixe."""

    date_debut = serializers.DateField()
    date_fin = serializers.DateField()
    montant_prime = serializers.DecimalField(max_digits=10, decimal_places=2)
    description = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        if attrs['date_debut'] >= attrs['date_fin']:
            raise serializers.ValidationError({
                'date_fin': 'La date de fin doit être après la date de début'
            })
        return attrs


class DemandeRejeterSerializer(serializers.Serializer):
    """Utilise par la compagnie pour rejeter une demande : motif obligatoire,
    affiche ensuite au client."""

    motif_rejet = serializers.CharField(allow_blank=False)
