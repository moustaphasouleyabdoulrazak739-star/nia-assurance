from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import User
from clients.models import Client
from contrats.models import Contrat
from .models import DemandeContrat


def make_client(email='client@nia.ne', profil_complet=True):
    user = User.objects.create_user(email=email, password='Secret123!', nom='A', prenom='B')
    if profil_complet:
        return Client.objects.create(
            user=user, cin=f'CIN-{email}', date_naissance='1990-01-01',
            sexe='F', adresse='Niamey', ville='Niamey',
        )
    return Client.objects.create(user=user)  # profil vide, comme a l'inscription


def make_admin(email='admin@nia.ne'):
    return User.objects.create_user(email=email, password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)


def fichier(nom='piece.pdf', content_type='application/pdf', taille=100):
    return SimpleUploadedFile(nom, b'x' * taille, content_type=content_type)


class DemandeCreatePermissionTests(APITestCase):
    def test_client_can_create_demande_auto_avec_documents_requis(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'AUTO',
            'piece_identite': fichier('id.pdf'),
            'carte_grise': fichier('cg.pdf'),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['demande']['statut'], 'EN_ATTENTE')
        self.assertEqual(len(response.data['demande']['documents']), 2)

    def test_numero_demande_is_auto_generated(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier(),
        }, format='multipart')
        self.assertTrue(response.data['demande']['numero_demande'].startswith('DEM-'))

    def test_admin_cannot_create_demande(self):
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier(),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_client_with_incomplete_profile_cannot_create_demande(self):
        client_profile = make_client(profil_complet=False)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier(),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_piece_identite_is_rejected(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'SANTE',
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('piece_identite', response.data)

    def test_auto_without_carte_grise_is_rejected(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'AUTO',
            'piece_identite': fichier(),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('carte_grise', response.data)

    def test_habitation_requires_titre_propriete_or_bail(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'HABITATION',
            'piece_identite': fichier(),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_habitation_with_bail_only_is_accepted(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'HABITATION',
            'piece_identite': fichier(),
            'bail': fichier('bail.pdf'),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_oversized_file_is_rejected(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        gros_fichier = fichier(taille=6 * 1024 * 1024)  # 6 Mo > limite de 5 Mo
        response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'SANTE',
            'piece_identite': gros_fichier,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_wrong_file_type_is_rejected(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier('script.exe', content_type='application/x-msdownload'),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DemandeScopeTests(APITestCase):
    def test_client_only_sees_own_demandes(self):
        c1 = make_client('c1@nia.ne')
        c2 = make_client('c2@nia.ne')
        DemandeContrat.objects.create(client=c1, numero_demande='DEM-1', type_assurance='SANTE')
        DemandeContrat.objects.create(client=c2, numero_demande='DEM-2', type_assurance='SANTE')

        self.client.force_authenticate(user=c1.user)
        response = self.client.get(reverse('demande_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['numero_demande'], 'DEM-1')

    def test_admin_sees_all_demandes(self):
        c1 = make_client('c1@nia.ne')
        c2 = make_client('c2@nia.ne')
        DemandeContrat.objects.create(client=c1, numero_demande='DEM-1', type_assurance='SANTE')
        DemandeContrat.objects.create(client=c2, numero_demande='DEM-2', type_assurance='SANTE')

        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('demande_list'))
        self.assertEqual(len(response.data), 2)

    def test_admin_can_filter_by_statut(self):
        c1 = make_client('c1@nia.ne')
        DemandeContrat.objects.create(client=c1, numero_demande='DEM-1', type_assurance='SANTE', statut='EN_ATTENTE')
        DemandeContrat.objects.create(client=c1, numero_demande='DEM-2', type_assurance='SANTE', statut='VALIDEE')

        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('demande_list'), {'statut': 'EN_ATTENTE'})
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['numero_demande'], 'DEM-1')

    def test_client_cannot_view_another_clients_demande(self):
        c1 = make_client('c1@nia.ne')
        c2 = make_client('c2@nia.ne')
        demande = DemandeContrat.objects.create(client=c2, numero_demande='DEM-2', type_assurance='SANTE')

        self.client.force_authenticate(user=c1.user)
        response = self.client.get(reverse('demande_detail', args=[demande.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_client_cannot_resoumettre_another_clients_demande(self):
        c1 = make_client('c1@nia.ne')
        c2 = make_client('c2@nia.ne')
        demande = DemandeContrat.objects.create(
            client=c2, numero_demande='DEM-2', type_assurance='SANTE', statut='REJETEE'
        )

        self.client.force_authenticate(user=c1.user)
        response = self.client.post(reverse('demande_resoumettre', args=[demande.id]), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier(),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class DemandeResoumissionTests(APITestCase):
    def test_resoumettre_rejected_demande_creates_new_linked_demande(self):
        client_profile = make_client()
        ancienne = DemandeContrat.objects.create(
            client=client_profile, numero_demande='DEM-OLD', type_assurance='SANTE',
            statut='REJETEE', motif_rejet='Document illisible',
        )

        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('demande_resoumettre', args=[ancienne.id]), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier(),
        }, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        nouvelle_id = response.data['demande']['id']
        self.assertNotEqual(nouvelle_id, ancienne.id)
        self.assertEqual(response.data['demande']['demande_precedente'], ancienne.id)
        self.assertEqual(response.data['demande']['statut'], 'EN_ATTENTE')

        ancienne.refresh_from_db()
        self.assertEqual(ancienne.statut, 'REJETEE')  # jamais modifiee en place

    def test_cannot_resoumettre_a_pending_demande(self):
        client_profile = make_client()
        demande = DemandeContrat.objects.create(
            client=client_profile, numero_demande='DEM-1', type_assurance='SANTE', statut='EN_ATTENTE'
        )
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('demande_resoumettre', args=[demande.id]), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier(),
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DemandeValiderTests(APITestCase):
    def test_admin_can_valider_and_creates_contrat(self):
        client_profile = make_client()
        demande = DemandeContrat.objects.create(
            client=client_profile, numero_demande='DEM-1', type_assurance='AUTO'
        )
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('demande_valider', args=[demande.id]), {
            'date_debut': '2026-01-01',
            'date_fin': '2027-01-01',
            'montant_prime': '150000.00',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['demande']['statut'], 'VALIDEE')
        self.assertIsNotNone(response.data['contrat']['id'])
        self.assertEqual(response.data['contrat']['type_assurance'], 'AUTO')

        demande.refresh_from_db()
        self.assertIsNotNone(demande.contrat)
        self.assertTrue(Contrat.objects.filter(id=demande.contrat_id).exists())

    def test_client_cannot_valider(self):
        client_profile = make_client()
        demande = DemandeContrat.objects.create(
            client=client_profile, numero_demande='DEM-1', type_assurance='AUTO'
        )
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('demande_valider', args=[demande.id]), {
            'date_debut': '2026-01-01', 'date_fin': '2027-01-01', 'montant_prime': '150000.00',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_valider_already_treated_demande(self):
        client_profile = make_client()
        demande = DemandeContrat.objects.create(
            client=client_profile, numero_demande='DEM-1', type_assurance='AUTO', statut='VALIDEE'
        )
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('demande_valider', args=[demande.id]), {
            'date_debut': '2026-01-01', 'date_fin': '2027-01-01', 'montant_prime': '150000.00',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_date_fin_before_date_debut_is_rejected(self):
        client_profile = make_client()
        demande = DemandeContrat.objects.create(
            client=client_profile, numero_demande='DEM-1', type_assurance='AUTO'
        )
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('demande_valider', args=[demande.id]), {
            'date_debut': '2027-01-01', 'date_fin': '2026-01-01', 'montant_prime': '150000.00',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class DemandeRejeterTests(APITestCase):
    def test_admin_can_rejeter_avec_motif(self):
        client_profile = make_client()
        demande = DemandeContrat.objects.create(
            client=client_profile, numero_demande='DEM-1', type_assurance='AUTO'
        )
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('demande_rejeter', args=[demande.id]), {
            'motif_rejet': 'Pièce d\'identité illisible',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['demande']['statut'], 'REJETEE')
        self.assertEqual(response.data['demande']['motif_rejet'], 'Pièce d\'identité illisible')

    def test_rejeter_without_motif_is_rejected(self):
        client_profile = make_client()
        demande = DemandeContrat.objects.create(
            client=client_profile, numero_demande='DEM-1', type_assurance='AUTO'
        )
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('demande_rejeter', args=[demande.id]), {'motif_rejet': ''})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_client_cannot_rejeter(self):
        client_profile = make_client()
        demande = DemandeContrat.objects.create(
            client=client_profile, numero_demande='DEM-1', type_assurance='AUTO'
        )
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('demande_rejeter', args=[demande.id]), {
            'motif_rejet': 'test',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class DemandeDocumentUrlTests(APITestCase):
    """Regression : le frontend prefixait manuellement l'URL du document avec
    l'origine de l'API, alors que le serializer la renvoie deja absolue
    (request.build_absolute_uri) - ce qui produisait un lien casse (double
    prefixe) et un clic silencieusement sans effet. On verifie ici que l'API
    renvoie bien une URL absolue et directement utilisable telle quelle."""

    def test_document_fichier_url_is_absolute_in_demande_detail(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        create_response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier('id.pdf'),
        }, format='multipart')
        demande_id = create_response.data['demande']['id']

        response = self.client.get(reverse('demande_detail', args=[demande_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        documents = response.data['documents']
        self.assertEqual(len(documents), 1)
        url = documents[0]['fichier']
        self.assertTrue(url, 'le champ fichier ne doit pas etre vide')
        self.assertTrue(
            url.startswith('http://') or url.startswith('https://'),
            f"l'URL du document devrait etre absolue, recu : {url}"
        )
        self.assertIn('/media/demandes/documents/', url)
