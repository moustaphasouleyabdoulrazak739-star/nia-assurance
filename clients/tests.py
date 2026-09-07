from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import User
from .models import Client


def make_client_user(email='client@nia.ne'):
    return User.objects.create_user(email=email, password='Secret123!', nom='A', prenom='B')


def make_admin_user(email='admin@nia.ne'):
    return User.objects.create_user(email=email, password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)


class ClientMeViewTests(APITestCase):
    """Regression tests pour le crash IntegrityError sur /api/clients/me/."""

    def test_get_me_without_profile_does_not_crash(self):
        user = make_client_user()
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse('client_me'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['id'])
        self.assertFalse(Client.objects.filter(user=user).exists())

    def test_patch_me_without_profile_creates_it(self):
        user = make_client_user()
        self.client.force_authenticate(user=user)
        response = self.client.patch(reverse('client_me'), {
            'cin': 'CIN123',
            'date_naissance': '1990-01-01',
            'sexe': 'F',
            'adresse': 'Niamey',
            'ville': 'Niamey',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Client.objects.filter(user=user, cin='CIN123').exists())

    def test_patch_me_with_existing_profile_updates_it(self):
        user = make_client_user()
        Client.objects.create(
            user=user, cin='OLD', date_naissance='1990-01-01',
            sexe='F', adresse='Niamey', ville='Niamey',
        )
        self.client.force_authenticate(user=user)
        response = self.client.patch(reverse('client_me'), {'ville': 'Zinder'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Client.objects.get(user=user).ville, 'Zinder')
        self.assertEqual(Client.objects.filter(user=user).count(), 1)


class ClientListScopeTests(APITestCase):
    def test_client_only_sees_own_profile(self):
        user1 = make_client_user('c1@nia.ne')
        user2 = make_client_user('c2@nia.ne')
        Client.objects.create(user=user1, cin='C1', date_naissance='1990-01-01', sexe='F', adresse='A', ville='Niamey')
        Client.objects.create(user=user2, cin='C2', date_naissance='1990-01-01', sexe='M', adresse='A', ville='Niamey')

        self.client.force_authenticate(user=user1)
        response = self.client.get(reverse('client_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['cin'], 'C1')

    def test_admin_sees_all_clients(self):
        user1 = make_client_user('c1@nia.ne')
        user2 = make_client_user('c2@nia.ne')
        admin = make_admin_user()
        Client.objects.create(user=user1, cin='C1', date_naissance='1990-01-01', sexe='F', adresse='A', ville='Niamey')
        Client.objects.create(user=user2, cin='C2', date_naissance='1990-01-01', sexe='M', adresse='A', ville='Niamey')

        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('client_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
