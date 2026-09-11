from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import User
from clients.models import Client
from contrats.models import Contrat
from .models import JournalActivite


def make_client(email='client@nia.ne'):
    user = User.objects.create_user(email=email, password='Secret123!', nom='A', prenom='B')
    return Client.objects.create(
        user=user, cin=f'CIN-{email}', date_naissance='1990-01-01',
        sexe='F', adresse='Niamey', ville='Niamey',
    )


def make_admin(email='admin@nia.ne'):
    return User.objects.create_user(email=email, password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)


def make_agent(email='agent@nia.ne'):
    return User.objects.create_user(email=email, password='Secret123!', nom='Agent', prenom='Y', role='AGENT')


def make_contrat(client_profile, numero='CTR-1'):
    return Contrat.objects.create(
        client=client_profile, numero_contrat=numero, type_assurance='AUTO',
        date_debut='2026-01-01', date_fin='2027-01-01',
        montant_prime='150000.00', statut='ACTIF',
    )


class JournalAccessTests(APITestCase):
    def test_client_cannot_access_journal(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.get(reverse('journal_list'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access_journal(self):
        response = self.client.get(reverse('journal_list'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_access_journal(self):
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('journal_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_agent_can_access_journal(self):
        agent = make_agent()
        self.client.force_authenticate(user=agent)
        response = self.client.get(reverse('journal_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class JournalContentTests(APITestCase):
    def test_entries_ordered_most_recent_first(self):
        admin = make_admin()
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        JournalActivite.objects.create(
            utilisateur=admin, action='CONTRAT_CREE', resume='Premier', contrat=contrat,
        )
        JournalActivite.objects.create(
            utilisateur=admin, action='CONTRAT_MODIFIE', resume='Second', contrat=contrat,
        )

        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('journal_list'))
        resultats = response.data['results']
        self.assertEqual(resultats[0]['resume'], 'Second')
        self.assertEqual(resultats[1]['resume'], 'Premier')

    def test_response_is_paginated(self):
        admin = make_admin()
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        for i in range(3):
            JournalActivite.objects.create(
                utilisateur=admin, action='CONTRAT_MODIFIE', resume=f'Entrée {i}', contrat=contrat,
            )

        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('journal_list'))
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertEqual(response.data['count'], 3)

    def test_utilisateur_nom_and_action_display_are_exposed(self):
        admin = make_admin()
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        JournalActivite.objects.create(
            utilisateur=admin, action='CONTRAT_CREE', resume='Test', contrat=contrat,
        )

        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('journal_list'))
        entree = response.data['results'][0]
        self.assertEqual(entree['utilisateur_nom'], 'X Admin')
        self.assertEqual(entree['action_display'], 'Contrat créé')
