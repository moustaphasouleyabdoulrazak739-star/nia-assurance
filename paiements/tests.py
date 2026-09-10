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


class PaiementReviewTests(APITestCase):
    """Tests pour la validation d'un paiement par la compagnie (ADMIN/AGENT),
    endpoint qui n'existait pas du tout auparavant (405)."""

    def make_paiement(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        return Paiement.objects.create(
            client=client_profile, contrat=contrat, numero_recu='REC-1', **PAIEMENT_PAYLOAD,
        )

    def make_admin(self):
        return User.objects.create_user(email='admin@nia.ne', password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)

    def test_admin_can_validate_paiement(self):
        paiement = self.make_paiement()
        admin = self.make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.patch(reverse('paiement_detail', args=[paiement.id]), {'statut': 'VALIDE'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        paiement.refresh_from_db()
        self.assertEqual(paiement.statut, 'VALIDE')

    def test_client_cannot_validate_a_paiement(self):
        paiement = self.make_paiement()
        self.client.force_authenticate(user=paiement.client.user)
        response = self.client.patch(reverse('paiement_detail', args=[paiement.id]), {'statut': 'VALIDE'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PaiementRecuTests(APITestCase):
    def make_paiement(self, client_profile, statut='VALIDE', numero='REC-1'):
        contrat = make_contrat(client_profile, numero=f'CTR-{numero}')
        return Paiement.objects.create(
            client=client_profile, contrat=contrat, numero_recu=numero,
            montant='150000.00', methode='MYNITA', statut=statut,
        )

    def test_client_can_download_recu_for_own_valide_paiement(self):
        client_profile = make_client()
        paiement = self.make_paiement(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.get(reverse('paiement_recu', args=[paiement.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('REC-1', response['Content-Disposition'])
        self.assertTrue(response.content.startswith(b'%PDF'))

    def test_client_cannot_download_recu_for_others_paiement(self):
        """Regression IDOR : un client ne doit jamais pouvoir telecharger le
        recu du paiement d'un autre client."""
        victime = make_client('victime@nia.ne')
        attaquant = make_client('attaquant@nia.ne')
        paiement_victime = self.make_paiement(victime, numero='REC-V')

        self.client.force_authenticate(user=attaquant.user)
        response = self.client.get(reverse('paiement_recu', args=[paiement_victime.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_download_recu_for_non_valide_paiement(self):
        client_profile = make_client()
        paiement = self.make_paiement(client_profile, statut='EN_ATTENTE')
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.get(reverse('paiement_recu', args=[paiement.id]))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_download_any_paiement_recu(self):
        client_profile = make_client()
        paiement = self.make_paiement(client_profile)
        admin = User.objects.create_user(email='admin2@nia.ne', password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)
        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('paiement_recu', args=[paiement.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
