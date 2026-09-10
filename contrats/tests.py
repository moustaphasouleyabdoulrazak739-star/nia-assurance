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

    def test_cannot_create_contrat_for_client_with_incomplete_profile(self):
        """Regression : un client fraichement inscrit (profil KYC vide) ne
        doit pas pouvoir se voir attribuer un contrat tant qu'il n'a pas
        complete CIN/date de naissance/adresse/ville."""
        user = User.objects.create_user(email='fraich@nia.ne', password='Secret123!', nom='A', prenom='B')
        client_profile = Client.objects.create(user=user)  # profil vide, comme a l'inscription
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('contrat_create'), {**CONTRAT_PAYLOAD, 'client': client_profile.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('client', response.data)


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


class ContratAttestationTests(APITestCase):
    def test_client_can_download_attestation_for_own_active_contrat(self):
        client_profile = make_client()
        contrat = Contrat.objects.create(client=client_profile, numero_contrat='CTR-1', **CONTRAT_PAYLOAD)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.get(reverse('contrat_attestation', args=[contrat.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn('CTR-1', response['Content-Disposition'])
        self.assertTrue(response.content.startswith(b'%PDF'))

    def test_client_cannot_download_attestation_for_others_contrat(self):
        """Regression IDOR : un client ne doit jamais pouvoir telecharger
        l'attestation du contrat d'un autre client."""
        victime = make_client('victime@nia.ne')
        attaquant = make_client('attaquant@nia.ne')
        contrat_victime = Contrat.objects.create(client=victime, numero_contrat='CTR-V', **CONTRAT_PAYLOAD)

        self.client.force_authenticate(user=attaquant.user)
        response = self.client.get(reverse('contrat_attestation', args=[contrat_victime.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_download_attestation_for_inactive_contrat(self):
        client_profile = make_client()
        contrat = Contrat.objects.create(
            client=client_profile, numero_contrat='CTR-1',
            **{**CONTRAT_PAYLOAD, 'statut': 'EXPIRE'},
        )
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.get(reverse('contrat_attestation', args=[contrat.id]))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_download_any_contrat_attestation(self):
        client_profile = make_client()
        contrat = Contrat.objects.create(client=client_profile, numero_contrat='CTR-1', **CONTRAT_PAYLOAD)
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('contrat_attestation', args=[contrat.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_cannot_download_attestation(self):
        client_profile = make_client()
        contrat = Contrat.objects.create(client=client_profile, numero_contrat='CTR-1', **CONTRAT_PAYLOAD)
        response = self.client.get(reverse('contrat_attestation', args=[contrat.id]))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
