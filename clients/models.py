from django.db import models
from users.models import User


class Client(models.Model):

    SEXE_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='client')
    # Profil cree (vide) des l'inscription ; ces champs KYC ne sont
    # renseignes qu'ensuite via "Mon profil", d'ou blank/null=True.
    cin = models.CharField(max_length=20, unique=True, verbose_name='CIN', blank=True, null=True)
    date_naissance = models.DateField(blank=True, null=True)
    sexe = models.CharField(max_length=1, choices=SEXE_CHOICES, blank=True)
    adresse = models.TextField(blank=True)
    ville = models.CharField(max_length=100, blank=True)
    profession = models.CharField(max_length=100, blank=True)
    photo = models.ImageField(upload_to='clients/photos/', blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.prenom} {self.user.nom}"

    @property
    def profil_complet(self):
        """KYC minimal requis avant de pouvoir signer un contrat."""
        return bool(self.cin and self.date_naissance and self.sexe and self.adresse and self.ville)

    class Meta:
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'