from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import User
from clients.models import Client


class RegisterLoginTests(APITestCase):
    def test_register_creates_client_and_returns_tokens(self):
        response = self.client.post(reverse('register'), {
            'email': 'nouveau@nia.ne',
            'password': 'MotDePasse123!',
            'password2': 'MotDePasse123!',
            'nom': 'Souley',
            'prenom': 'Aichatou',
            'telephone': '+22790000000',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], 'CLIENT')

    def test_register_creates_an_empty_client_profile(self):
        """Regression : sans ce profil, un client fraichement inscrit
        n'apparaissait pas dans le selecteur "Nouveau contrat" cote compagnie."""
        response = self.client.post(reverse('register'), {
            'email': 'nouveau2@nia.ne',
            'password': 'MotDePasse123!',
            'password2': 'MotDePasse123!',
            'nom': 'Souley',
            'prenom': 'Aichatou',
        })
        user = User.objects.get(email='nouveau2@nia.ne')
        client = Client.objects.filter(user=user).first()
        self.assertIsNotNone(client)
        self.assertFalse(client.profil_complet)

    def test_register_rejects_mismatched_passwords(self):
        response = self.client.post(reverse('register'), {
            'email': 'nouveau@nia.ne',
            'password': 'MotDePasse123!',
            'password2': 'AutreChose456!',
            'nom': 'Souley',
            'prenom': 'Aichatou',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_correct_credentials(self):
        User.objects.create_user(email='test@nia.ne', password='Secret123!', nom='A', prenom='B')
        response = self.client.post(reverse('login'), {
            'email': 'test@nia.ne',
            'password': 'Secret123!',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_login_with_wrong_password_is_rejected(self):
        User.objects.create_user(email='test@nia.ne', password='Secret123!', nom='A', prenom='B')
        response = self.client.post(reverse('login'), {
            'email': 'test@nia.ne',
            'password': 'MauvaisMotDePasse',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_requires_authentication(self):
        response = self.client.get(reverse('profile'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_returns_authenticated_user(self):
        user = User.objects.create_user(email='test@nia.ne', password='Secret123!', nom='A', prenom='B')
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse('profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'test@nia.ne')
