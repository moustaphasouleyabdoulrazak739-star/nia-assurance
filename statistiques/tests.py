from datetime import datetime

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from clients.models import Client
from contrats.models import Contrat
from demandes.models import DemandeContrat
from paiements.models import Paiement
from sinistres.models import Sinistre
from users.models import User


def make_client_profile(email='client@nia.ne'):
    user = User.objects.create_user(email=email, password='Secret123!', nom='A', prenom='B')
    return Client.objects.create(
        user=user, cin=f'CIN-{email}', date_naissance='1990-01-01',
        sexe='F', adresse='Niamey', ville='Niamey',
    )


def make_admin(email='admin@nia.ne'):
    return User.objects.create_user(
        email=email, password='Secret123!', nom='Admin', prenom='X',
        role='ADMIN', is_staff=True,
    )


def make_agent(email='agent@nia.ne'):
    return User.objects.create_user(
        email=email, password='Secret123!', nom='Agent', prenom='Y', role='AGENT',
    )


def make_contrat(client_profile, numero='CTR-1', type_assurance='AUTO'):
    return Contrat.objects.create(
        client=client_profile, numero_contrat=numero, type_assurance=type_assurance,
        date_debut='2026-01-01', date_fin='2027-01-01',
        montant_prime='150000.00', statut='ACTIF',
    )


def make_sinistre(contrat, numero, mois):
    """Cree un sinistre puis force sa date de declaration (auto_now_add) au
    15 du mois donne, via un UPDATE qui contourne auto_now_add."""
    sinistre = Sinistre.objects.create(
        contrat=contrat, numero_sinistre=numero, type_sinistre='ACCIDENT',
        date_sinistre='2026-01-10', description='x', montant_reclame='100000.00',
    )
    Sinistre.objects.filter(pk=sinistre.pk).update(
        date_declaration=timezone.make_aware(datetime(mois[0], mois[1], 15, 12, 0)),
    )
    return sinistre


def make_paiement(client_profile, contrat, numero, montant, statut, mois):
    paiement = Paiement.objects.create(
        client=client_profile, contrat=contrat, numero_recu=numero,
        montant=montant, methode='MYNITA', statut=statut,
    )
    Paiement.objects.filter(pk=paiement.pk).update(
        date_paiement=timezone.make_aware(datetime(mois[0], mois[1], 15, 12, 0)),
    )
    return paiement


class StatistiquesAccessTests(APITestCase):
    def test_client_cannot_access_statistiques(self):
        client_profile = make_client_profile()
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.get(reverse('statistiques'))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access_statistiques(self):
        response = self.client.get(reverse('statistiques'))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_can_access_statistiques(self):
        self.client.force_authenticate(user=make_admin())
        response = self.client.get(reverse('statistiques'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('contrats_par_type', response.data)
        self.assertIn('sinistres_par_mois', response.data)
        self.assertIn('paiements_valides_par_mois', response.data)
        self.assertIn('demandes_par_statut', response.data)

    def test_agent_can_access_statistiques(self):
        self.client.force_authenticate(user=make_agent())
        response = self.client.get(reverse('statistiques'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class StatistiquesContenuTests(APITestCase):
    def setUp(self):
        self.admin = make_admin()
        self.client.force_authenticate(user=self.admin)
        self.client_profile = make_client_profile()

    def _get(self):
        return self.client.get(reverse('statistiques')).data

    def test_contrats_par_type_expose_les_quatre_types_meme_a_zero(self):
        make_contrat(self.client_profile, 'CTR-A', 'AUTO')
        make_contrat(self.client_profile, 'CTR-B', 'AUTO')
        make_contrat(self.client_profile, 'CTR-C', 'SANTE')

        data = self._get()['contrats_par_type']
        par_type = {entree['type']: entree['total'] for entree in data}
        self.assertEqual(par_type, {'AUTO': 2, 'SANTE': 1, 'HABITATION': 0, 'VIE': 0})
        # Libelles lisibles fournis pour la legende du camembert.
        self.assertEqual(
            {e['type']: e['label'] for e in data}['AUTO'], 'Assurance Auto',
        )

    def test_sinistres_par_mois_groupes_et_serie_continue(self):
        contrat = make_contrat(self.client_profile, 'CTR-S', 'AUTO')
        make_sinistre(contrat, 'SIN-1', (2026, 1))
        make_sinistre(contrat, 'SIN-2', (2026, 1))
        make_sinistre(contrat, 'SIN-3', (2026, 3))  # fevrier volontairement vide

        serie = self._get()['sinistres_par_mois']
        self.assertEqual(
            serie,
            [
                {'mois': '2026-01', 'valeur': 2},
                {'mois': '2026-02', 'valeur': 0},
                {'mois': '2026-03', 'valeur': 1},
            ],
        )

    def test_paiements_par_mois_somme_les_montants_et_ignore_les_non_valides(self):
        contrat = make_contrat(self.client_profile, 'CTR-P', 'AUTO')
        make_paiement(self.client_profile, contrat, 'REC-1', '100000.00', 'VALIDE', (2026, 1))
        make_paiement(self.client_profile, contrat, 'REC-2', '50000.00', 'VALIDE', (2026, 1))
        make_paiement(self.client_profile, contrat, 'REC-3', '999999.00', 'ECHOUE', (2026, 1))
        make_paiement(self.client_profile, contrat, 'REC-4', '30000.00', 'VALIDE', (2026, 2))

        serie = self._get()['paiements_valides_par_mois']
        self.assertEqual(
            serie,
            [
                {'mois': '2026-01', 'valeur': 150000.0},
                {'mois': '2026-02', 'valeur': 30000.0},
            ],
        )

    def test_demandes_par_statut_expose_les_trois_statuts_meme_a_zero(self):
        DemandeContrat.objects.create(
            client=self.client_profile, numero_demande='DEM-1',
            type_assurance='AUTO', statut='EN_ATTENTE',
        )
        DemandeContrat.objects.create(
            client=self.client_profile, numero_demande='DEM-2',
            type_assurance='SANTE', statut='VALIDEE',
        )
        DemandeContrat.objects.create(
            client=self.client_profile, numero_demande='DEM-3',
            type_assurance='VIE', statut='VALIDEE',
        )

        data = self._get()['demandes_par_statut']
        par_statut = {entree['statut']: entree['total'] for entree in data}
        self.assertEqual(
            par_statut, {'EN_ATTENTE': 1, 'VALIDEE': 2, 'REJETEE': 0},
        )

    def test_series_mensuelles_vides_quand_aucune_donnee(self):
        data = self._get()
        self.assertEqual(data['sinistres_par_mois'], [])
        self.assertEqual(data['paiements_valides_par_mois'], [])
