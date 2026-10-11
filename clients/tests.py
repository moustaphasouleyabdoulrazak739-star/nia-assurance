from django.core.files.uploadedfile import SimpleUploadedFile
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


# PNG 1x1 pixel valide minimal, pour que l'ImageField (qui verifie que le
# contenu est une vraie image decodable par Pillow) l'accepte.
PNG_1X1 = (
    b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
    b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0'
    b'\x00\x00\x03\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82'
)


class ClientPhotoTests(APITestCase):
    """Regression constat 4.1 : la photo de profil n'est plus servie en
    direct et sans authentification via /media/, mais via cette vue
    protegee qui verifie la propriete avant de la renvoyer."""

    def make_client_avec_photo(self, email='client@nia.ne'):
        user = make_client_user(email)
        return Client.objects.create(
            user=user, cin=f'CIN-{email}', date_naissance='1990-01-01', sexe='F', adresse='A', ville='Niamey',
            photo=SimpleUploadedFile('photo.png', PNG_1X1, content_type='image/png'),
        )

    def test_client_can_download_own_photo(self):
        client_profile = self.make_client_avec_photo()
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.get(reverse('client_photo', args=[client_profile.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'image/png')
        self.assertIn('inline', response['Content-Disposition'])

    def test_client_cannot_download_others_photo(self):
        """Reproduit l'IDOR du rapport d'audit, cette fois sur la photo de
        profil d'un autre client."""
        victime = self.make_client_avec_photo('victime@nia.ne')
        attaquant_user = make_client_user('attaquant@nia.ne')
        Client.objects.create(user=attaquant_user, cin='CIN-ATT', date_naissance='1990-01-01', sexe='M', adresse='A', ville='Niamey')

        self.client.force_authenticate(user=attaquant_user)
        response = self.client.get(reverse('client_photo', args=[victime.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_cannot_download_photo(self):
        client_profile = self.make_client_avec_photo()
        response = self.client.get(reverse('client_photo', args=[client_profile.id]))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_download_any_photo(self):
        client_profile = self.make_client_avec_photo()
        admin = make_admin_user()
        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('client_photo', args=[client_profile.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
