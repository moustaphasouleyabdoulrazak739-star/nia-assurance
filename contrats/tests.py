from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import User
from clients.models import Client
from .models import Contrat


def make_client(email='client@nia.ne'):
    user = User.objects.create_user(email=email, password='Secret123!', nom='A', prenom='B')
    return Client.objects.create(
        user=user, cin=f'CIN-{email}', date_naissance='1990-01-01',
        sexe='F', adresse='Niamey', ville='Niamey',
    )


def make_admin():
    return User.objects.create_user(email='admin@nia.ne', password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)


CONTRAT_PAYLOAD = {
    'type_assurance': 'AUTO',
    'date_debut': '2026-01-01',
    'date_fin': '2027-01-01',
    'montant_prime': '150000.00',
    'statut': 'ACTIF',
}


class ContratCreatePermissionTests(APITestCase):
    def test_client_cannot_create_contrat(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('contrat_create'), {**CONTRAT_PAYLOAD, 'client': client_profile.id})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_contrat(self):
        client_profile = make_client()
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('contrat_create'), {**CONTRAT_PAYLOAD, 'client': client_profile.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNotNone(response.data['id'])

    def test_numero_contrat_is_auto_generated_when_not_provided(self):
        client_profile = make_client()
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('contrat_create'), {**CONTRAT_PAYLOAD, 'client': client_profile.id})
        self.assertTrue(response.data['numero_contrat'].startswith('CTR-'))

    def test_date_fin_before_date_debut_is_rejected(self):
        client_profile = make_client()
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        payload = {**CONTRAT_PAYLOAD, 'client': client_profile.id, 'date_debut': '2027-01-01', 'date_fin': '2026-01-01'}
        response = self.client.post(reverse('contrat_create'), payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ContratScopeTests(APITestCase):
    def test_client_only_sees_own_contrats(self):
        client1 = make_client('c1@nia.ne')
        client2 = make_client('c2@nia.ne')
        Contrat.objects.create(client=client1, numero_contrat='CTR-1', **CONTRAT_PAYLOAD)
        Contrat.objects.create(client=client2, numero_contrat='CTR-2', **CONTRAT_PAYLOAD)

        self.client.force_authenticate(user=client1.user)
        response = self.client.get(reverse('contrat_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['numero_contrat'], 'CTR-1')
