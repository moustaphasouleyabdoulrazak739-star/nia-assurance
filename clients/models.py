from django.db import models
from users.models import User


class Client(models.Model):

    SEXE_CHOICES = [
        ('M', 'Masculin'),
        ('F', 'Féminin'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='client')
    cin = models.CharField(max_length=20, unique=True, verbose_name='CIN')
    date_naissance = models.DateField()
    sexe = models.CharField(max_length=1, choices=SEXE_CHOICES)
    adresse = models.TextField()
    ville = models.CharField(max_length=100)
    profession = models.CharField(max_length=100, blank=True)
    photo = models.ImageField(upload_to='clients/photos/', blank=True, null=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.prenom} {self.user.nom}"

    class Meta:
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'