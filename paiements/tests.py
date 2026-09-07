from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import User
from clients.models import Client
from contrats.models import Contrat
from .models import Paiement


def make_client(email='client@nia.ne'):
    user = User.objects.create_user(email=email, password='Secret123!', nom='A', prenom='B')
    return Client.objects.create(
        user=user, cin=f'CIN-{email}', date_naissance='1990-01-01',
        sexe='F', adresse='Niamey', ville='Niamey',
    )


def make_contrat(client_profile, statut='ACTIF', numero='CTR-1'):
    return Contrat.objects.create(
        client=client_profile, numero_contrat=numero, type_assurance='AUTO',
        date_debut='2026-01-01', date_fin='2027-01-01',
        montant_prime='150000.00', statut=statut,
    )


PAIEMENT_PAYLOAD = {
    'montant': '150000.00',
    'methode': 'MYNITA',
    'reference': '',
}


class PaiementOwnershipTests(APITestCase):
    """Regression tests pour la faille IDOR : un client ne doit pouvoir
    payer que sur SES PROPRES contrats, et jamais au nom d'un autre client."""

    def test_client_can_pay_own_contrat(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('paiement_create'), {**PAIEMENT_PAYLOAD, 'contrat': contrat.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_client_cannot_pay_for_others_contrat(self):
        victime = make_client('victime@nia.ne')
        attaquant = make_client('attaquant@nia.ne')
        contrat_victime = make_contrat(victime)

        self.client.force_authenticate(user=attaquant.user)
        response = self.client.post(reverse('paiement_create'), {**PAIEMENT_PAYLOAD, 'contrat': contrat_victime.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Paiement.objects.filter(contrat=contrat_victime).exists())

    def test_client_field_is_always_derived_from_contrat(self):
        """Meme si un ancien client de l'API essaie encore d'envoyer un champ
        'client', il doit etre ignore et derive du contrat cote serveur."""
        victime = make_client('victime@nia.ne')
        attaquant = make_client('attaquant@nia.ne')
        contrat_attaquant = make_contrat(attaquant, numero='CTR-ATT')

        self.client.force_authenticate(user=attaquant.user)
        response = self.client.post(reverse('paiement_create'), {
            **PAIEMENT_PAYLOAD, 'contrat': contrat_attaquant.id, 'client': victime.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        paiement = Paiement.objects.get(contrat=contrat_attaquant)
        self.assertEqual(paiement.client_id, attaquant.id)

    def test_cannot_pay_inactive_contrat(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile, statut='RESILIE')
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('paiement_create'), {**PAIEMENT_PAYLOAD, 'contrat': contrat.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_numero_recu_is_auto_generated(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('paiement_create'), {**PAIEMENT_PAYLOAD, 'contrat': contrat.id})
        self.assertTrue(response.data['paiement']['numero_recu'].startswith('REC-'))
