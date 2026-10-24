import io
import os

from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import User
from clients.models import Client
from contrats.models import Contrat
from journal.models import JournalActivite
from PIL import Image
from .models import DemandeContrat, DocumentDemande


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


# Vrais en-tetes : le serveur verifie la signature du fichier, pas seulement
# son Content-Type (voir demandes.validators.validate_document_content).
EN_TETE_PDF = b'%PDF-1.4\n'
EN_TETE_JPEG = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00'
EN_TETE_PNG = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'
EN_TETE_PAR_EXTENSION = {'.pdf': EN_TETE_PDF, '.jpg': EN_TETE_JPEG, '.jpeg': EN_TETE_JPEG, '.png': EN_TETE_PNG}


def fichier(nom='piece.pdf', content_type='application/pdf', taille=100, contenu=None):
    if contenu is None:
        en_tete = EN_TETE_PAR_EXTENSION.get(os.path.splitext(nom)[1].lower(), b'')
        contenu = en_tete + b'x' * max(taille - len(en_tete), 0)
    return SimpleUploadedFile(nom, contenu, content_type=content_type)


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


class DemandeJournalTests(APITestCase):
    """Regression : valider/rejeter une demande doit laisser une trace dans
    le journal d'activite."""

    def test_validating_demande_logs_journal_entry(self):
        client_profile = make_client()
        demande = DemandeContrat.objects.create(
            client=client_profile, numero_demande='DEM-1', type_assurance='AUTO'
        )
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('demande_valider', args=[demande.id]), {
            'date_debut': '2026-01-01', 'date_fin': '2027-01-01', 'montant_prime': '150000.00',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        entree = JournalActivite.objects.get(action='DEMANDE_VALIDEE')
        self.assertEqual(entree.utilisateur, admin)
        self.assertEqual(entree.demande_id, demande.id)
        self.assertIsNotNone(entree.contrat_id)
        self.assertIn('DEM-1', entree.resume)

    def test_rejecting_demande_logs_journal_entry(self):
        client_profile = make_client()
        demande = DemandeContrat.objects.create(
            client=client_profile, numero_demande='DEM-1', type_assurance='AUTO'
        )
        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('demande_rejeter', args=[demande.id]), {
            'motif_rejet': 'Document illisible',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        entree = JournalActivite.objects.get(action='DEMANDE_REJETEE')
        self.assertEqual(entree.utilisateur, admin)
        self.assertEqual(entree.demande_id, demande.id)


class DemandeDocumentFileTests(APITestCase):
    """Regression constat 4.1 : les documents d'une demande (piece
    d'identite, carte grise...) ne sont plus servis en direct et sans
    authentification via /media/, mais via cette vue protegee qui
    verifie la propriete avant de les renvoyer.

    Remplace l'ancien DemandeDocumentUrlTests, qui verifiait que le champ
    `fichier` du serializer exposait une URL /media/ absolue - c'est
    exactement ce que ce fichier a corrige : `fichier` n'est plus qu'un
    indicateur booleen de presence (voir DocumentDemandeSerializer)."""

    def test_fichier_field_is_a_boolean_presence_flag_not_a_media_url(self):
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
        self.assertIs(documents[0]['fichier'], True)

    def test_client_can_download_own_document(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        create_response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier('id.pdf'),
        }, format='multipart')
        doc_id = create_response.data['demande']['documents'][0]['id']

        response = self.client.get(reverse('demande_document', args=[doc_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_client_cannot_download_others_document(self):
        """Reproduit l'IDOR du rapport d'audit, cette fois sur une piece
        jointe de demande de contrat."""
        victime = make_client('victime@nia.ne')
        attaquant = make_client('attaquant@nia.ne')
        self.client.force_authenticate(user=victime.user)
        create_response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier('id.pdf'),
        }, format='multipart')
        doc_id = create_response.data['demande']['documents'][0]['id']

        self.client.force_authenticate(user=attaquant.user)
        response = self.client.get(reverse('demande_document', args=[doc_id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_cannot_download_document(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        create_response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier('id.pdf'),
        }, format='multipart')
        doc_id = create_response.data['demande']['documents'][0]['id']

        self.client.force_authenticate(user=None)
        response = self.client.get(reverse('demande_document', args=[doc_id]))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_download_any_document(self):
        client_profile = make_client()
        self.client.force_authenticate(user=client_profile.user)
        create_response = self.client.post(reverse('demande_create'), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier('id.pdf'),
        }, format='multipart')
        doc_id = create_response.data['demande']['documents'][0]['id']

        admin = make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('demande_document', args=[doc_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


def vrai_fichier(format_pillow):
    """Vrai fichier genere par Pillow (PDF, JPEG ou PNG), pas un simple
    en-tete : prouve que des documents reels passent la verification."""
    tampon = io.BytesIO()
    Image.new('RGB', (4, 4), color=(0, 128, 0)).save(tampon, format_pillow)
    return tampon.getvalue()


class DemandeFileContentTests(APITestCase):
    """Le serveur verifie la signature reelle du fichier : l'extension, le
    type declare et le contenu doivent designer le meme format."""

    def setUp(self):
        self.client_profile = make_client()
        self.client.force_authenticate(user=self.client_profile.user)

    def poster(self, piece):
        return self.client.post(reverse('demande_create'), {
            'type_assurance': 'SANTE',
            'piece_identite': piece,
        }, format='multipart')

    def assert_contenu_refuse(self, response):
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['piece_identite'][0],
            'Le contenu du fichier ne correspond pas à un PDF, JPEG ou PNG valide.',
        )
        self.assertEqual(DemandeContrat.objects.count(), 0)

    def test_texte_renomme_en_pdf_est_refuse(self):
        faux = fichier('id.pdf', contenu=b'Ceci est un simple texte, pas un PDF.')
        self.assert_contenu_refuse(self.poster(faux))

    def test_png_renomme_en_pdf_est_refuse(self):
        png = fichier('id.pdf', content_type='application/pdf', contenu=vrai_fichier('PNG'))
        self.assert_contenu_refuse(self.poster(png))

    def test_pdf_renomme_en_png_est_refuse(self):
        pdf = fichier('id.png', content_type='image/png', contenu=vrai_fichier('PDF'))
        self.assert_contenu_refuse(self.poster(pdf))

    def test_type_declare_different_du_contenu_est_refuse(self):
        pdf = fichier('id.pdf', content_type='image/jpeg', contenu=vrai_fichier('PDF'))
        self.assert_contenu_refuse(self.poster(pdf))

    def test_fichier_sans_extension_est_refuse(self):
        pdf = fichier('id', contenu=vrai_fichier('PDF'))
        self.assert_contenu_refuse(self.poster(pdf))

    def test_vrai_pdf_est_accepte(self):
        response = self.poster(fichier('id.pdf', 'application/pdf', contenu=vrai_fichier('PDF')))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_vrai_jpeg_est_accepte(self):
        response = self.poster(fichier('id.jpg', 'image/jpeg', contenu=vrai_fichier('JPEG')))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_vrai_jpeg_extension_jpeg_est_accepte(self):
        response = self.poster(fichier('id.JPEG', 'image/jpeg', contenu=vrai_fichier('JPEG')))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_vrai_png_est_accepte(self):
        response = self.poster(fichier('id.png', 'image/png', contenu=vrai_fichier('PNG')))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_fichier_enregistre_non_tronque_par_lecture_en_tete(self):
        contenu = vrai_fichier('PDF')
        response = self.poster(fichier('id.pdf', 'application/pdf', contenu=contenu))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        document = DocumentDemande.objects.get(demande_id=response.data['demande']['id'])
        with document.fichier.open('rb') as f:
            self.assertEqual(f.read(), contenu)

    def test_taille_maximale_toujours_verifiee_avec_vrai_en_tete(self):
        gros = fichier('gros.pdf', taille=6 * 1024 * 1024)
        response = self.poster(gros)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('5 Mo', response.data['piece_identite'][0])


class DemandeResoumissionUniqueTests(APITestCase):
    """Une demande rejetee ne peut etre corrigee et renvoyee qu'une fois."""

    def setUp(self):
        self.client_profile = make_client()
        self.ancienne = DemandeContrat.objects.create(
            client=self.client_profile, numero_demande='DEM-OLD', type_assurance='SANTE',
            statut='REJETEE', motif_rejet='Document illisible',
        )
        self.client.force_authenticate(user=self.client_profile.user)

    def resoumettre(self):
        return self.client.post(reverse('demande_resoumettre', args=[self.ancienne.id]), {
            'type_assurance': 'SANTE',
            'piece_identite': fichier(),
        }, format='multipart')

    def test_double_resoumission_refusee(self):
        premiere = self.resoumettre()
        self.assertEqual(premiere.status_code, status.HTTP_201_CREATED)

        seconde = self.resoumettre()
        self.assertEqual(seconde.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(seconde.data['error'], 'Cette demande a déjà été corrigée et renvoyée.')
        self.assertEqual(self.ancienne.resoumissions.count(), 1)
        self.assertEqual(DemandeContrat.objects.count(), 2)

    def test_resoumission_invalide_ne_consomme_pas_la_correction(self):
        """Un renvoi refuse (document manquant) ne cree rien : le client
        peut encore corriger et renvoyer."""
        invalide = self.client.post(reverse('demande_resoumettre', args=[self.ancienne.id]), {
            'type_assurance': 'SANTE',
        }, format='multipart')
        self.assertEqual(invalide.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(self.ancienne.resoumissions.exists())

        self.assertEqual(self.resoumettre().status_code, status.HTTP_201_CREATED)
