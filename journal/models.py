from django.conf import settings
from django.db import models
from contrats.models import Contrat
from sinistres.models import Sinistre
from paiements.models import Paiement
from demandes.models import DemandeContrat


class JournalActivite(models.Model):
    """Journal d'activite / audit trail : trace les actions importantes
    effectuees par la compagnie (ADMIN/AGENT) - qui a fait quoi, quand.

    Reference vers l'objet concerne via 4 FK nullables plutot qu'une
    GenericForeignKey : un seul type d'objet par entree, ces FK directes
    sont plus simples a requeter (pas de contenttypes, jointures triviales
    via select_related) et coherentes avec le reste du projet qui n'utilise
    que des FK explicites nulle part de relation generique.
    """

    ACTION_CHOICES = [
        ('DEMANDE_VALIDEE', 'Demande de contrat validée'),
        ('DEMANDE_REJETEE', 'Demande de contrat rejetée'),
        ('CONTRAT_CREE', 'Contrat créé'),
        ('CONTRAT_MODIFIE', 'Contrat modifié'),
        ('SINISTRE_TRAITE', 'Sinistre traité'),
        ('PAIEMENT_VALIDE', 'Paiement validé'),
        ('PAIEMENT_ECHOUE', 'Paiement marqué échoué'),
        ('PAIEMENT_REMBOURSE', 'Paiement remboursé'),
    ]

    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='actions_journal',
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    resume = models.CharField(max_length=255)

    # Un seul de ces 4 champs est renseigne, selon le type d'action.
    contrat = models.ForeignKey(Contrat, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_entries')
    sinistre = models.ForeignKey(Sinistre, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_entries')
    paiement = models.ForeignKey(Paiement, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_entries')
    demande = models.ForeignKey(DemandeContrat, on_delete=models.SET_NULL, null=True, blank=True, related_name='journal_entries')

    date_creation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_action_display()} par {self.utilisateur} le {self.date_creation:%d/%m/%Y %H:%M}"

    class Meta:
        verbose_name = "Entrée du journal d'activité"
        verbose_name_plural = "Journal d'activité"
        ordering = ['-date_creation']
