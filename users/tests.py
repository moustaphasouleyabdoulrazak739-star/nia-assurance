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


class TokenRefreshTests(APITestCase):
    """Comportement de /api/auth/token/refresh/ attendu par les
    intercepteurs axios web (frontend/src/services/api.js) et mobile
    (mobile/src/api/client.js) : ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='refresh@nia.ne', password='Secret123!', nom='A', prenom='B'
        )

    def _login(self):
        response = self.client.post(reverse('login'), {
            'email': 'refresh@nia.ne',
            'password': 'Secret123!',
        })
        return response.data['refresh']

    def test_refresh_returns_a_new_access_and_a_new_refresh_token(self):
        refresh = self._login()
        response = self.client.post(reverse('token_refresh'), {'refresh': refresh})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertNotEqual(response.data['refresh'], refresh)

    def test_new_access_token_is_immediately_usable(self):
        refresh = self._login()
        refreshed = self.client.post(reverse('token_refresh'), {'refresh': refresh})
        response = self.client.get(
            reverse('profile'), HTTP_AUTHORIZATION=f"Bearer {refreshed.data['access']}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_old_refresh_token_is_rejected_once_rotated(self):
        """Un refresh token deja echange contre un nouveau (cas d'un vol
        suivi d'une reutilisation apres que le client legitime a deja
        tourne) ne doit plus jamais fonctionner."""
        refresh = self._login()
        first = self.client.post(reverse('token_refresh'), {'refresh': refresh})
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        reuse = self.client.post(reverse('token_refresh'), {'refresh': refresh})
        self.assertEqual(reuse.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_with_invalid_token_is_rejected(self):
        response = self.client.post(reverse('token_refresh'), {'refresh': 'pas-un-jwt'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_requires_no_access_token(self):
        """L'endpoint est public (AllowAny) : un client avec un access token
        deja expire doit pouvoir l'appeler sans en-tete Authorization."""
        refresh = self._login()
        response = self.client.post(reverse('token_refresh'), {'refresh': refresh})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
