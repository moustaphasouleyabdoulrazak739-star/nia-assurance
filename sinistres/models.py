from django.db import models
from contrats.models import Contrat


class Sinistre(models.Model):

    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente'),
        ('EN_COURS', 'En cours'),
        ('APPROUVE', 'Approuvé'),
        ('REJETE', 'Rejeté'),
        ('REGLE', 'Réglé'),
    ]

    TYPE_CHOICES = [
        ('ACCIDENT', 'Accident'),
        ('VOL', 'Vol'),
        ('INCENDIE', 'Incendie'),
        ('MALADIE', 'Maladie'),
        ('DECES', 'Décès'),
        ('AUTRE', 'Autre'),
    ]

    contrat = models.ForeignKey(Contrat, on_delete=models.CASCADE, related_name='sinistres')
    numero_sinistre = models.CharField(max_length=20, unique=True)
    type_sinistre = models.CharField(max_length=20, choices=TYPE_CHOICES)
    date_sinistre = models.DateField()
    date_declaration = models.DateTimeField(auto_now_add=True)
    description = models.TextField()
    montant_reclame = models.DecimalField(max_digits=10, decimal_places=2)
    montant_indemnite = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_ATTENTE')
    document = models.FileField(upload_to='sinistres/documents/', blank=True, null=True)
    commentaire = models.TextField(blank=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.numero_sinistre} - {self.contrat.client} ({self.type_sinistre})"

    class Meta:
        verbose_name = 'Sinistre'
        verbose_name_plural = 'Sinistres'
        ordering = ['-date_declaration']