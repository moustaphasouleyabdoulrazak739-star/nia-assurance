from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import User
from clients.models import Client
from contrats.models import Contrat
from journal.models import JournalActivite
from .models import Sinistre


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


SINISTRE_PAYLOAD = {
    'type_sinistre': 'VOL',
    'date_sinistre': '2026-06-01',
    'description': 'Vol du vehicule',
    'montant_reclame': '500000.00',
}


class SinistreOwnershipTests(APITestCase):
    """Regression tests pour la faille IDOR : un client ne doit pouvoir
    declarer un sinistre que sur SES PROPRES contrats."""

    def test_client_can_declare_sinistre_on_own_contrat(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('sinistre_create'), {**SINISTRE_PAYLOAD, 'contrat': contrat.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_client_cannot_declare_sinistre_on_others_contrat(self):
        victime = make_client('victime@nia.ne')
        attaquant = make_client('attaquant@nia.ne')
        contrat_victime = make_contrat(victime)

        self.client.force_authenticate(user=attaquant.user)
        response = self.client.post(reverse('sinistre_create'), {**SINISTRE_PAYLOAD, 'contrat': contrat_victime.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Sinistre.objects.filter(contrat=contrat_victime).exists())

    def test_cannot_declare_sinistre_on_inactive_contrat(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile, statut='SUSPENDU')
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('sinistre_create'), {**SINISTRE_PAYLOAD, 'contrat': contrat.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_numero_sinistre_is_auto_generated(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('sinistre_create'), {**SINISTRE_PAYLOAD, 'contrat': contrat.id})
        self.assertTrue(response.data['sinistre']['numero_sinistre'].startswith('SIN-'))

    def test_admin_can_declare_sinistre_on_any_contrat(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        admin = User.objects.create_user(email='admin@nia.ne', password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)
        self.client.force_authenticate(user=admin)
        response = self.client.post(reverse('sinistre_create'), {**SINISTRE_PAYLOAD, 'contrat': contrat.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class SinistreReviewTests(APITestCase):
    """Tests pour le traitement d'un sinistre par la compagnie (ADMIN/AGENT) :
    changement de statut, fixation de l'indemnite, commentaire."""

    def make_sinistre(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        return Sinistre.objects.create(
            contrat=contrat, numero_sinistre='SIN-1', **SINISTRE_PAYLOAD,
        )

    def make_admin(self):
        return User.objects.create_user(email='admin@nia.ne', password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)

    def test_admin_can_approve_with_montant_indemnite(self):
        sinistre = self.make_sinistre()
        admin = self.make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.patch(reverse('sinistre_detail', args=[sinistre.id]), {
            'statut': 'APPROUVE', 'montant_indemnite': '20000.00', 'commentaire': 'Dossier valide',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sinistre.refresh_from_db()
        self.assertEqual(sinistre.statut, 'APPROUVE')
        self.assertEqual(str(sinistre.montant_indemnite), '20000.00')

    def test_approving_without_montant_indemnite_is_rejected(self):
        sinistre = self.make_sinistre()
        admin = self.make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.patch(reverse('sinistre_detail', args=[sinistre.id]), {'statut': 'REGLE'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_client_cannot_review_a_sinistre(self):
        sinistre = self.make_sinistre()
        self.client.force_authenticate(user=sinistre.contrat.client.user)
        response = self.client.patch(reverse('sinistre_detail', args=[sinistre.id]), {
            'statut': 'APPROUVE', 'montant_indemnite': '20000.00',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_review_does_not_alter_original_declaration_fields(self):
        """Le serializer de traitement ne doit exposer que statut/indemnite/
        commentaire : les infos declarees par le client restent en lecture seule."""
        sinistre = self.make_sinistre()
        admin = self.make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.patch(reverse('sinistre_detail', args=[sinistre.id]), {
            'statut': 'APPROUVE', 'montant_indemnite': '20000.00',
            'montant_reclame': '1.00', 'type_sinistre': 'AUTRE',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sinistre.refresh_from_db()
        self.assertEqual(str(sinistre.montant_reclame), '500000.00')
        self.assertEqual(sinistre.type_sinistre, 'VOL')


class SinistreJournalTests(APITestCase):
    """Regression : traiter un sinistre doit laisser une trace dans le
    journal d'activite, avec le montant de l'indemnite dans le resume."""

    def make_sinistre(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        return Sinistre.objects.create(
            contrat=contrat, numero_sinistre='SIN-1', **SINISTRE_PAYLOAD,
        )

    def test_treating_sinistre_logs_journal_entry(self):
        sinistre = self.make_sinistre()
        admin = User.objects.create_user(email='admin@nia.ne', password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)
        self.client.force_authenticate(user=admin)
        response = self.client.patch(reverse('sinistre_detail', args=[sinistre.id]), {
            'statut': 'APPROUVE', 'montant_indemnite': '150000.00',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        entree = JournalActivite.objects.get(action='SINISTRE_TRAITE')
        self.assertEqual(entree.utilisateur, admin)
        self.assertEqual(entree.sinistre_id, sinistre.id)
        self.assertIn('SIN-1', entree.resume)
        self.assertIn('Approuvé', entree.resume)
        self.assertIn('150 000 FCFA', entree.resume)


class SinistreDocumentTests(APITestCase):
    """Regression constat 4.1 : le document d'un sinistre n'est plus servi
    en direct et sans authentification via /media/, mais via cette vue
    protegee qui verifie la propriete avant de le renvoyer."""

    def make_sinistre_avec_document(self, client_profile, numero='SIN-1'):
        contrat = make_contrat(client_profile, numero=f'CTR-{numero}')
        return Sinistre.objects.create(
            contrat=contrat, numero_sinistre=numero, **SINISTRE_PAYLOAD,
            document=SimpleUploadedFile('piece.pdf', b'%PDF-1.4 contenu', content_type='application/pdf'),
        )

    def test_client_can_download_own_sinistre_document(self):
        client_profile = make_client()
        sinistre = self.make_sinistre_avec_document(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.get(reverse('sinistre_document', args=[sinistre.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_client_cannot_download_others_sinistre_document(self):
        """Reproduit l'IDOR du rapport d'audit, cette fois sur un sinistre."""
        victime = make_client('victime@nia.ne')
        attaquant = make_client('attaquant@nia.ne')
        sinistre_victime = self.make_sinistre_avec_document(victime, numero='SIN-V')

        self.client.force_authenticate(user=attaquant.user)
        response = self.client.get(reverse('sinistre_document', args=[sinistre_victime.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_cannot_download_sinistre_document(self):
        """Reproduit le constat central de l'audit (acces /media/ sans
        aucune authentification), cette fois sur un sinistre. Inclut le
        cas de l'upload HTML execute en XSS stocke (constat 4.2) : le
        fichier est desormais inaccessible avant meme de regarder son type."""
        client_profile = make_client()
        sinistre = self.make_sinistre_avec_document(client_profile)
        response = self.client.get(reverse('sinistre_document', args=[sinistre.id]))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_download_any_sinistre_document(self):
        client_profile = make_client()
        sinistre = self.make_sinistre_avec_document(client_profile)
        admin = User.objects.create_user(email='admin@nia.ne', password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)
        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('sinistre_document', args=[sinistre.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class SinistreDocumentUploadValidationTests(APITestCase):
    """Regression constat 4.2 : Sinistre.document n'avait aucun validateur.
    Reproduit precisement l'upload HTML malveillant de l'audit."""

    def test_html_file_with_script_is_rejected(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        fichier_html = SimpleUploadedFile(
            'evil.html', b'<html><script>alert(document.cookie)</script></html>', content_type='text/html',
        )
        response = self.client.post(reverse('sinistre_create'), {
            **SINISTRE_PAYLOAD, 'contrat': contrat.id, 'document': fichier_html,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_document_is_rejected(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        gros_fichier = SimpleUploadedFile(
            'gros.pdf', b'x' * (6 * 1024 * 1024), content_type='application/pdf',
        )
        response = self.client.post(reverse('sinistre_create'), {
            **SINISTRE_PAYLOAD, 'contrat': contrat.id, 'document': gros_fichier,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_pdf_document_is_accepted(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        fichier_pdf = SimpleUploadedFile('ok.pdf', b'%PDF-1.4', content_type='application/pdf')
        response = self.client.post(reverse('sinistre_create'), {
            **SINISTRE_PAYLOAD, 'contrat': contrat.id, 'document': fichier_pdf,
        }, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
