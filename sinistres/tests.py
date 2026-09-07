from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import User
from clients.models import Client
from contrats.models import Contrat
from .models import Sinistre


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


SINISTRE_PAYLOAD = {
    'type_sinistre': 'VOL',
    'date_sinistre': '2026-06-01',
    'description': 'Vol du vehicule',
    'montant_reclame': '500000.00',
}


class SinistreOwnershipTests(APITestCase):
    """Regression tests pour la faille IDOR : un client ne doit pouvoir
    declarer un sinistre que sur SES PROPRES contrats."""

    def test_client_can_declare_sinistre_on_own_contrat(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('sinistre_create'), {**SINISTRE_PAYLOAD, 'contrat': contrat.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_client_cannot_declare_sinistre_on_others_contrat(self):
        victime = make_client('victime@nia.ne')
        attaquant = make_client('attaquant@nia.ne')
        contrat_victime = make_contrat(victime)

        self.client.force_authenticate(user=attaquant.user)
        response = self.client.post(reverse('sinistre_create'), {**SINISTRE_PAYLOAD, 'contrat': contrat_victime.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Sinistre.objects.filter(contrat=contrat_victime).exists())

    def test_cannot_declare_sinistre_on_inactive_contrat(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile, statut='SUSPENDU')
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('sinistre_create'), {**SINISTRE_PAYLOAD, 'contrat': contrat.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_numero_sinistre_is_auto_generated(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('sinistre_create'), {**SINISTRE_PAYLOAD, 'contrat': contrat.id})
        self.assertTrue(response.data['sinistre']['numero_sinistre'].startswith('SIN-'))

    def test_admin_can_declare_sinistre_on_any_contrat(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        admin = User.objects.create_user(email='admin@nia.ne', password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('sinistre_create'), {**SINISTRE_PAYLOAD, 'contrat': contrat.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
