from django.db import models
from clients.models import Client
from contrats.models import Contrat


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