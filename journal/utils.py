from .models import JournalActivite


def enregistrer_action(utilisateur, action, resume, **objet):
    """Cree une entree de journal d'activite.

    `objet` : contrat=, sinistre=, paiement= ou demande= (un seul rempli,
    selon le type d'action). Appele directement depuis chaque vue concernee
    - pas de signal Django ni de point central existant dans le projet pour
    intercepter ces actions, cf. recherche prealable (aucun signals.py,
    aucun ready() dans les apps.py existants).
    """
    JournalActivite.objects.create(
        utilisateur=utilisateur, action=action, resume=resume, **objet
    )
