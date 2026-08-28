from django.db import models
from clients.models import Client


class Contrat(models.Model):

    TYPE_CHOICES = [
        ('AUTO', 'Assurance Auto'),
        ('SANTE', 'Assurance Santé'),
        ('HABITATION', 'Assurance Habitation'),
        ('VIE', 'Assurance Vie'),
    ]

    STATUT_CHOICES = [
        ('ACTIF', 'Actif'),
        ('EXPIRE', 'Expiré'),
        ('SUSPENDU', 'Suspendu'),
        ('RESILIE', 'Résilié'),
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='contrats')
    numero_contrat = models.CharField(max_length=20, unique=True)
    type_assurance = models.CharField(max_length=20, choices=TYPE_CHOICES)
    date_debut = models.DateField()
    date_fin = models.DateField()
    montant_prime = models.DecimalField(max_digits=10, decimal_places=2)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ACTIF')
    description = models.TextField(blank=True)
    document = models.FileField(upload_to='contrats/documents/', blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.numero_contrat} - {self.client} ({self.type_assurance})"

    class Meta:
        verbose_name = 'Contrat'
        verbose_name_plural = 'Contrats'
        ordering = ['-date_creation']