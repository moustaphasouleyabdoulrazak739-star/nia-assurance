from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import User
from clients.models import Client


class RegisterLoginTests(APITestCase):
    def setUp(self):
        # Le throttling de /api/auth/login/ (constat 6.1) utilise le cache
        # Django, qui persiste entre les tests d'un meme run : sans ce
        # clear(), les appels a login() d'autres classes de test pourraient
        # faire echouer celle-ci selon l'ordre d'execution.
        cache.clear()

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

    def test_login_with_malformed_payload_returns_400_not_500(self):
        """Regression constat 7.1 : email/password d'un type inattendu
        (entier, objet) faisait planter authenticate() avec une exception
        non interceptee -> 500 et, en DEBUG, la page technique Django
        complete. LoginSerializer doit intercepter ca en amont."""
        response = self.client.post(reverse('login'), {
            'email': 123,
            'password': {'x': 'y'},
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProfileUpdateTests(APITestCase):
    """Regression constat 3.1 : PATCH /api/auth/profile/ laissait passer
    le champ `role`, permettant a n'importe quel CLIENT de s'auto-promouvoir
    ADMIN (et donc d'acceder a /api/journal/, /api/statistiques/, et a la
    liste de tous les clients/contrats/sinistres/paiements/demandes)."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email='victime@nia.ne', password='Secret123!', nom='Souley', prenom='A', role='CLIENT'
        )
        self.client.force_authenticate(user=self.user)

    def test_role_sent_in_profile_patch_is_ignored(self):
        response = self.client.patch(reverse('profile'), {'role': 'ADMIN'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, 'CLIENT')

    def test_escalated_role_never_takes_effect_even_on_admin_only_endpoint(self):
        """Verification de bout en bout, comme reproduit dans l'audit : le
        PATCH ne doit avoir AUCUN effet observable, pas seulement sur le
        champ role lui-meme."""
        self.client.patch(reverse('profile'), {'role': 'ADMIN'})
        response = self.client.get(reverse('journal_list'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_email_sent_in_profile_patch_is_ignored(self):
        response = self.client.patch(reverse('profile'), {'email': 'pirate@nia.ne'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'victime@nia.ne')

    def test_allowed_fields_are_still_writable(self):
        """La restriction ne doit pas casser l'usage legitime (changer son
        telephone, par exemple, depuis la page Profil)."""
        response = self.client.patch(reverse('profile'), {
            'nom': 'Nouveau', 'prenom': 'Prenom', 'telephone': '96000000',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.nom, 'Nouveau')
        self.assertEqual(self.user.telephone, '96000000')


class LoginThrottleTests(APITestCase):
    """Regression constat 6.1 : aucune limite ne protegeait /api/auth/login/
    contre la force brute."""

    def setUp(self):
        cache.clear()
        User.objects.create_user(email='throttle@nia.ne', password='Secret123!', nom='A', prenom='B')

    def test_repeated_failed_logins_are_throttled(self):
        statuses = []
        for _ in range(6):
            response = self.client.post(reverse('login'), {
                'email': 'throttle@nia.ne', 'password': 'MauvaisMotDePasse',
            })
            statuses.append(response.status_code)
        # Throttle par compte vise = 5/min : la 6e tentative doit etre bloquee.
        self.assertEqual(statuses[:5], [status.HTTP_401_UNAUTHORIZED] * 5)
        self.assertEqual(statuses[5], status.HTTP_429_TOO_MANY_REQUESTS)

    def test_single_correct_login_is_never_throttled(self):
        """La limite ne doit jamais genez un usage normal (une tentative)."""
        response = self.client.post(reverse('login'), {
            'email': 'throttle@nia.ne', 'password': 'Secret123!',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ChangePasswordThrottleTests(APITestCase):
    """Regression constat 6.1, meme logique sur /api/auth/change-password/ :
    un attaquant disposant d'un jeton vole pouvait deviner le mot de passe
    actuel sans aucune limite de tentatives."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email='pwthrottle@nia.ne', password='Secret123!', nom='A', prenom='B'
        )
        self.client.force_authenticate(user=self.user)

    def test_repeated_wrong_old_password_attempts_are_throttled(self):
        statuses = []
        for _ in range(9):
            response = self.client.post(reverse('change_password'), {
                'old_password': 'FauxMotDePasse', 'new_password': 'NouveauTest#2026',
            })
            statuses.append(response.status_code)
        # Throttle = 8/min : la 9e tentative doit etre bloquee.
        self.assertEqual(statuses[:8], [status.HTTP_400_BAD_REQUEST] * 8)
        self.assertEqual(statuses[8], status.HTTP_429_TOO_MANY_REQUESTS)


class LogoutTests(APITestCase):
    """Constat 7.3 : LogoutView n'intercepte plus qu'exactement les erreurs
    de jeton attendues (TokenError), plus un except Exception generique."""

    def setUp(self):
        self.user = User.objects.create_user(email='logout@nia.ne', password='Secret123!', nom='A', prenom='B')
        self.client.force_authenticate(user=self.user)

    def test_logout_with_invalid_refresh_returns_clean_400(self):
        response = self.client.post(reverse('logout'), {'refresh': 'pas-un-jwt'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class TokenRefreshTests(APITestCase):
    """Comportement de /api/auth/token/refresh/ attendu par les
    intercepteurs axios web (frontend/src/services/api.js) et mobile
    (mobile/src/api/client.js) : ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION."""

    def setUp(self):
        cache.clear()
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
