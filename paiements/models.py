from django.db import models
from django.db.models import Q
from clients.models import Client
from contrats.models import Contrat

# Partages avec le serializer (refus applicatif et IntegrityError).
CONTRAINTE_UN_PAIEMENT_EN_ATTENTE = 'paiement_unique_en_attente_par_contrat'
MESSAGE_PAIEMENT_DEJA_EN_ATTENTE = (
    'Un paiement est déjà en attente de validation pour ce contrat.'
)


class Paiement(models.Model):

    METHODE_CHOICES = [
        ('MYNITA', 'MyNITA'),
        ('AMANATA', 'AmanaTa'),
        ('ESPECES', 'Espèces'),
        ('VIREMENT', 'Virement bancaire'),
    ]

    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente'),
        ('VALIDE', 'Validé'),
        ('ECHOUE', 'Échoué'),
        ('REMBOURSE', 'Remboursé'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='paiements')
    contrat = models.ForeignKey(Contrat, on_delete=models.CASCADE, related_name='paiements')
    numero_recu = models.CharField(max_length=20, unique=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2)
    methode = models.CharField(max_length=20, choices=METHODE_CHOICES)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_ATTENTE')
    reference = models.CharField(max_length=100, blank=True)
    date_paiement = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.numero_recu} - {self.client} ({self.montant} FCFA)"

    class Meta:
        verbose_name = 'Paiement'
        verbose_name_plural = 'Paiements'
        ordering = ['-date_paiement']
        constraints = [
            # Au plus un paiement EN_ATTENTE par contrat, garanti par la base
            # (index unique partiel PostgreSQL) : le controle applicatif du
            # serializer ne suffit pas face a deux requetes simultanees.
            models.UniqueConstraint(
                fields=['contrat'],
                condition=Q(statut='EN_ATTENTE'),
                name=CONTRAINTE_UN_PAIEMENT_EN_ATTENTE,
                violation_error_message=MESSAGE_PAIEMENT_DEJA_EN_ATTENTE,
            ),
        ]
