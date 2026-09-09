from django.db import models
from clients.models import Client
from contrats.models import Contrat
from .validators import validate_document_file


class DemandeContrat(models.Model):
    """Demande de contrat initiee par un client, traitee ensuite par la
    compagnie (ADMIN/AGENT) qui la valide (creation du Contrat reel) ou la
    rejette (avec motif).

    Cycle rejet -> resoumission : une demande rejetee n'est jamais modifiee
    en place. Le client resoumet en creant une NOUVELLE DemandeContrat liee
    a l'ancienne via `demande_precedente`, ce qui conserve un historique
    complet (motifs de rejet successifs, documents fournis a chaque tentative)
    plutot que d'ecraser une trace utile en cas de litige.
    """

    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente'),
        ('VALIDEE', 'Validée'),
        ('REJETEE', 'Rejetée'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='demandes_contrat')
    numero_demande = models.CharField(max_length=20, unique=True)
    type_assurance = models.CharField(max_length=20, choices=Contrat.TYPE_CHOICES)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_ATTENTE')
    motif_rejet = models.TextField(blank=True)
    contrat = models.OneToOneField(
        Contrat, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='demande_origine',
        help_text='Contrat effectivement cree une fois la demande validee.'
    )
    demande_precedente = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='resoumissions',
        help_text='Demande rejetee que celle-ci resoumet, le cas echeant.'
    )
    date_demande = models.DateTimeField(auto_now_add=True)
    date_traitement = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.numero_demande} - {self.client} ({self.type_assurance})"

    class Meta:
        verbose_name = 'Demande de contrat'
        verbose_name_plural = 'Demandes de contrat'
        ordering = ['-date_demande']


class DocumentDemande(models.Model):
    """Un document joint a une DemandeContrat. Le type determine ce qu'il
    represente (piece d'identite toujours requise, justificatifs variables
    selon le type d'assurance demande - cf. demandes/constants.py)."""

    TYPE_CHOICES = [
        ('PIECE_IDENTITE', "Pièce d'identité"),
        ('CARTE_GRISE', 'Carte grise'),
        ('TITRE_PROPRIETE', 'Titre de propriété'),
        ('BAIL', 'Bail (contrat de location)'),
    ]

    demande = models.ForeignKey(DemandeContrat, on_delete=models.CASCADE, related_name='documents')
    type_document = models.CharField(max_length=20, choices=TYPE_CHOICES)
    fichier = models.FileField(upload_to='demandes/documents/', validators=[validate_document_file])
    date_upload = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_type_document_display()} - {self.demande.numero_demande}"

    class Meta:
        verbose_name = 'Document de demande'
        verbose_name_plural = 'Documents de demande'
        ordering = ['date_upload']
