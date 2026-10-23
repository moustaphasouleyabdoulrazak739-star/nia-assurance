from decimal import Decimal
from unittest import mock

from django.core.cache import cache
from django.db import IntegrityError, connection, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from users.models import User
from clients.models import Client
from contrats.models import Contrat
from journal.models import JournalActivite
from .models import (
    CONTRAINTE_UN_PAIEMENT_EN_ATTENTE,
    MESSAGE_PAIEMENT_DEJA_EN_ATTENTE,
    Paiement,
)


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


PAIEMENT_PAYLOAD = {
    'montant': '150000.00',
    'methode': 'MYNITA',
    'reference': '96000000',
}


class PaiementOwnershipTests(APITestCase):
    """Regression tests pour la faille IDOR : un client ne doit pouvoir
    payer que sur SES PROPRES contrats, et jamais au nom d'un autre client."""

    def test_client_can_pay_own_contrat(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('paiement_create'), {**PAIEMENT_PAYLOAD, 'contrat': contrat.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_client_cannot_pay_for_others_contrat(self):
        victime = make_client('victime@nia.ne')
        attaquant = make_client('attaquant@nia.ne')
        contrat_victime = make_contrat(victime)

        self.client.force_authenticate(user=attaquant.user)
        response = self.client.post(reverse('paiement_create'), {**PAIEMENT_PAYLOAD, 'contrat': contrat_victime.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Paiement.objects.filter(contrat=contrat_victime).exists())

    def test_client_field_is_always_derived_from_contrat(self):
        """Meme si un ancien client de l'API essaie encore d'envoyer un champ
        'client', il doit etre ignore et derive du contrat cote serveur."""
        victime = make_client('victime@nia.ne')
        attaquant = make_client('attaquant@nia.ne')
        contrat_attaquant = make_contrat(attaquant, numero='CTR-ATT')

        self.client.force_authenticate(user=attaquant.user)
        response = self.client.post(reverse('paiement_create'), {
            **PAIEMENT_PAYLOAD, 'contrat': contrat_attaquant.id, 'client': victime.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        paiement = Paiement.objects.get(contrat=contrat_attaquant)
        self.assertEqual(paiement.client_id, attaquant.id)

    def test_cannot_pay_inactive_contrat(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile, statut='RESILIE')
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('paiement_create'), {**PAIEMENT_PAYLOAD, 'contrat': contrat.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_numero_recu_is_auto_generated(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('paiement_create'), {**PAIEMENT_PAYLOAD, 'contrat': contrat.id})
        self.assertTrue(response.data['paiement']['numero_recu'].startswith('REC-'))

    def test_numero_recu_envoye_par_le_client_est_ignore(self):
        """numero_recu est en lecture seule : un client ne peut pas imposer
        son propre numero de recu (ni imiter celui d'un autre paiement)."""
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.post(reverse('paiement_create'), {
            **PAIEMENT_PAYLOAD, 'contrat': contrat.id, 'numero_recu': 'REC-FAUX-0001',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        numero = response.data['paiement']['numero_recu']
        self.assertNotEqual(numero, 'REC-FAUX-0001')
        self.assertRegex(numero, r'^REC-\d{4}-\d{4}$')
        self.assertEqual(Paiement.objects.get(contrat=contrat).numero_recu, numero)
        self.assertFalse(Paiement.objects.filter(numero_recu='REC-FAUX-0001').exists())


class PaiementMontantTests(APITestCase):
    """Le backend ne fait jamais confiance au montant envoye : il doit etre
    egal a la prime du contrat (comparaison en Decimal), et c'est la prime
    calculee cote serveur qui est enregistree."""

    def setUp(self):
        self.client_profile = make_client()
        self.contrat = make_contrat(self.client_profile)  # prime : 150000.00
        self.client.force_authenticate(user=self.client_profile.user)

    def payer(self, **champs):
        payload = {**PAIEMENT_PAYLOAD, 'contrat': self.contrat.id, **champs}
        return self.client.post(reverse('paiement_create'), payload, format='json')

    def assertRefuseSurMontant(self, response):
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('montant', response.data)
        self.assertFalse(Paiement.objects.filter(contrat=self.contrat).exists())

    def test_montant_egal_a_la_prime_est_accepte(self):
        response = self.payer(montant='150000.00')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        paiement = Paiement.objects.get(contrat=self.contrat)
        self.assertEqual(paiement.montant, Decimal('150000.00'))
        self.contrat.refresh_from_db()
        self.assertEqual(paiement.montant, self.contrat.montant_prime)

    def test_montant_sans_decimales_ou_en_nombre_json_est_accepte(self):
        """Egalite en Decimal : 150000, 150000.0 et 150000.00 sont la meme
        valeur, sans passer par un float."""
        for montant in ('150000', 150000, 150000.0):
            with self.subTest(montant=montant):
                Paiement.objects.all().delete()
                response = self.payer(montant=montant)
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                self.assertEqual(Paiement.objects.get().montant, Decimal('150000.00'))

    def test_montant_inferieur_a_la_prime_est_refuse(self):
        response = self.payer(montant='1.00')
        self.assertRefuseSurMontant(response)
        self.assertIn('150 000 FCFA', str(response.data['montant']))

    def test_montant_superieur_a_la_prime_est_refuse(self):
        self.assertRefuseSurMontant(self.payer(montant='150000.01'))

    def test_montant_absent_est_refuse(self):
        """Obligatoire : c'est la confirmation du montant affiche au client."""
        payload = {**PAIEMENT_PAYLOAD, 'contrat': self.contrat.id}
        del payload['montant']
        response = self.client.post(reverse('paiement_create'), payload, format='json')
        self.assertRefuseSurMontant(response)

    def test_montant_au_mauvais_format_est_refuse(self):
        for montant in ('abc', '', '-150000', '0', '150000.001'):
            with self.subTest(montant=montant):
                self.assertRefuseSurMontant(self.payer(montant=montant))

    def test_montant_negatif_a_un_message_clair(self):
        response = self.payer(montant='-150000')
        self.assertIn('positif', str(response.data['montant']))

    def test_prime_avec_centimes_comparee_exactement(self):
        self.contrat.montant_prime = Decimal('150000.50')
        self.contrat.save()
        self.assertRefuseSurMontant(self.payer(montant='150000.5000001'))
        self.assertRefuseSurMontant(self.payer(montant='150000.00'))
        response = self.payer(montant='150000.5')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Paiement.objects.get().montant, Decimal('150000.50'))

    def test_prime_d_un_autre_client_jamais_revelee(self):
        """Le controle d'appartenance passe avant la comparaison : un client
        ne peut pas decouvrir la prime du contrat d'un autre via le message."""
        autre = make_client('autre@nia.ne')
        contrat_autre = make_contrat(autre, numero='CTR-AUTRE')
        response = self.payer(contrat=contrat_autre.id, montant='1.00')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('montant', response.data)
        self.assertNotIn('150 000', str(response.data))


class PaiementTelephoneTests(APITestCase):
    """MyNITA/AmanaTa : numero de telephone nigerien obligatoire dans
    `reference`, controle et normalise (+227XXXXXXXX) par le serveur."""

    def setUp(self):
        self.client_profile = make_client()
        self.contrat = make_contrat(self.client_profile)
        self.client.force_authenticate(user=self.client_profile.user)

    def payer(self, **champs):
        payload = {**PAIEMENT_PAYLOAD, 'contrat': self.contrat.id, **champs}
        return self.client.post(reverse('paiement_create'), payload, format='json')

    def assertRefuseSurReference(self, response):
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('reference', response.data)
        self.assertFalse(Paiement.objects.filter(contrat=self.contrat).exists())

    def test_telephone_absent_est_refuse_pour_le_mobile_money(self):
        for methode in ('MYNITA', 'AMANATA'):
            for reference in ('', '   '):
                with self.subTest(methode=methode, reference=reference):
                    response = self.payer(methode=methode, reference=reference)
                    self.assertRefuseSurReference(response)
                    self.assertIn('obligatoire', str(response.data['reference']))
        payload = {**PAIEMENT_PAYLOAD, 'contrat': self.contrat.id}
        del payload['reference']
        response = self.client.post(reverse('paiement_create'), payload, format='json')
        self.assertRefuseSurReference(response)

    def test_telephone_au_mauvais_format_est_refuse(self):
        for reference in (
            '9600000', '960000000', 'abcdefgh', '96-00-00-00', '96.00.00.00',
            '+22696000000', '22796000000', '+227 9600000', '0227 96000000',
            '٩٦' + '٠' * 6,  # "96000000" en chiffres arabes-indiens
        ):
            with self.subTest(reference=reference):
                response = self.payer(reference=reference)
                self.assertRefuseSurReference(response)
                self.assertIn('8 chiffres', str(response.data['reference']))

    def test_formats_valides_enregistres_sous_forme_normalisee(self):
        for reference in (
            '96000000', '96 00 00 00', '+22796000000', '+227 96 00 00 00',
            '0022796000000', '00227 96 00 00 00', ' 96000000 ',
        ):
            with self.subTest(reference=reference):
                Paiement.objects.all().delete()
                response = self.payer(reference=reference)
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                self.assertEqual(Paiement.objects.get().reference, '+22796000000')
                self.assertEqual(response.data['paiement']['reference'], '+22796000000')

    def test_amanata_soumis_a_la_meme_regle(self):
        response = self.payer(methode='AMANATA', reference='+227 90 12 34 56')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Paiement.objects.get().reference, '+22790123456')

    def test_reference_libre_et_facultative_pour_especes_et_virement(self):
        for methode, reference in (('ESPECES', ''), ('VIREMENT', 'VIR-2026/123 BOA')):
            with self.subTest(methode=methode):
                Paiement.objects.all().delete()
                response = self.payer(methode=methode, reference=reference)
                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                self.assertEqual(Paiement.objects.get().reference, reference)

    def test_erreurs_montant_et_telephone_remontees_ensemble(self):
        response = self.payer(montant='1.00', reference='')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('montant', response.data)
        self.assertIn('reference', response.data)


class PaiementReviewTests(APITestCase):
    """Tests pour la validation d'un paiement par la compagnie (ADMIN/AGENT),
    endpoint qui n'existait pas du tout auparavant (405)."""

    def make_paiement(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        return Paiement.objects.create(
            client=client_profile, contrat=contrat, numero_recu='REC-1', **PAIEMENT_PAYLOAD,
        )

    def make_admin(self):
        return User.objects.create_user(email='admin@nia.ne', password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)

    def test_admin_can_validate_paiement(self):
        paiement = self.make_paiement()
        admin = self.make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.patch(reverse('paiement_detail', args=[paiement.id]), {'statut': 'VALIDE'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        paiement.refresh_from_db()
        self.assertEqual(paiement.statut, 'VALIDE')

    def test_client_cannot_validate_a_paiement(self):
        paiement = self.make_paiement()
        self.client.force_authenticate(user=paiement.client.user)
        response = self.client.patch(reverse('paiement_detail', args=[paiement.id]), {'statut': 'VALIDE'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PaiementRecuTests(APITestCase):
    def make_paiement(self, client_profile, statut='VALIDE', numero='REC-1'):
        contrat = make_contrat(client_profile, numero=f'CTR-{numero}')
        return Paiement.objects.create(
            client=client_profile, contrat=contrat, numero_recu=numero,
            montant='150000.00', methode='MYNITA', statut=statut,
        )

    def test_client_can_download_recu_for_own_valide_paiement(self):
        client_profile = make_client()
        paiement = self.make_paiement(client_profile)
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.get(reverse('paiement_recu', args=[paiement.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertIn('REC-1', response['Content-Disposition'])
        self.assertTrue(response.content.startswith(b'%PDF'))

    def test_client_cannot_download_recu_for_others_paiement(self):
        """Regression IDOR : un client ne doit jamais pouvoir telecharger le
        recu du paiement d'un autre client."""
        victime = make_client('victime@nia.ne')
        attaquant = make_client('attaquant@nia.ne')
        paiement_victime = self.make_paiement(victime, numero='REC-V')

        self.client.force_authenticate(user=attaquant.user)
        response = self.client.get(reverse('paiement_recu', args=[paiement_victime.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_download_recu_for_non_valide_paiement(self):
        client_profile = make_client()
        paiement = self.make_paiement(client_profile, statut='EN_ATTENTE')
        self.client.force_authenticate(user=client_profile.user)
        response = self.client.get(reverse('paiement_recu', args=[paiement.id]))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_can_download_any_paiement_recu(self):
        client_profile = make_client()
        paiement = self.make_paiement(client_profile)
        admin = User.objects.create_user(email='admin2@nia.ne', password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)
        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse('paiement_recu', args=[paiement.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class PaiementJournalTests(APITestCase):
    """Regression : valider/rejeter/rembourser un paiement doit laisser une
    trace dans le journal d'activite, avec l'action correspondant au statut."""

    def make_paiement(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        return Paiement.objects.create(
            client=client_profile, contrat=contrat, numero_recu='REC-1', **PAIEMENT_PAYLOAD,
        )

    def make_admin(self):
        return User.objects.create_user(email='admin@nia.ne', password='Secret123!', nom='Admin', prenom='X', role='ADMIN', is_staff=True)

    def test_validating_paiement_logs_journal_entry(self):
        paiement = self.make_paiement()
        admin = self.make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.patch(reverse('paiement_detail', args=[paiement.id]), {'statut': 'VALIDE'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        entree = JournalActivite.objects.get(action='PAIEMENT_VALIDE')
        self.assertEqual(entree.utilisateur, admin)
        self.assertEqual(entree.paiement_id, paiement.id)
        self.assertIn('REC-1', entree.resume)

    def test_marking_paiement_echoue_logs_journal_entry(self):
        paiement = self.make_paiement()
        admin = self.make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.patch(reverse('paiement_detail', args=[paiement.id]), {'statut': 'ECHOUE'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(JournalActivite.objects.filter(action='PAIEMENT_ECHOUE', paiement=paiement).exists())

    def test_marking_paiement_rembourse_logs_journal_entry(self):
        paiement = self.make_paiement()
        admin = self.make_admin()
        self.client.force_authenticate(user=admin)
        response = self.client.patch(reverse('paiement_detail', args=[paiement.id]), {'statut': 'REMBOURSE'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(JournalActivite.objects.filter(action='PAIEMENT_REMBOURSE', paiement=paiement).exists())


class PaiementDoublonTests(APITestCase):
    """Au plus un paiement EN_ATTENTE par contrat : refus applicatif (400 sur
    `contrat`), contrainte en base, et IntegrityError concurrente -> 400."""

    def setUp(self):
        cache.clear()  # compteur du throttle 'paiement-create'
        self.client_profile = make_client()
        self.contrat = make_contrat(self.client_profile)
        self.client.force_authenticate(user=self.client_profile.user)

    def tearDown(self):
        cache.clear()

    def payer(self, contrat=None):
        payload = {**PAIEMENT_PAYLOAD, 'contrat': (contrat or self.contrat).id}
        return self.client.post(reverse('paiement_create'), payload, format='json')

    def creer_paiement(self, numero, statut='EN_ATTENTE'):
        return Paiement.objects.create(
            client=self.client_profile, contrat=self.contrat, statut=statut,
            numero_recu=numero, montant='150000.00', methode='ESPECES',
        )

    def assertRefuseCommeDoublon(self, response):
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['contrat'], [MESSAGE_PAIEMENT_DEJA_EN_ATTENTE])

    def test_second_paiement_en_attente_refuse(self):
        self.assertEqual(self.payer().status_code, status.HTTP_201_CREATED)
        self.assertRefuseCommeDoublon(self.payer())
        self.assertEqual(Paiement.objects.filter(contrat=self.contrat).count(), 1)

    def test_paiement_possible_apres_validation_du_precedent(self):
        self.assertEqual(self.payer().status_code, status.HTTP_201_CREATED)
        Paiement.objects.filter(contrat=self.contrat).update(statut='VALIDE')
        self.assertEqual(self.payer().status_code, status.HTTP_201_CREATED)

    def test_paiement_possible_apres_echec_du_precedent(self):
        self.assertEqual(self.payer().status_code, status.HTTP_201_CREATED)
        Paiement.objects.filter(contrat=self.contrat).update(statut='ECHOUE')
        self.assertEqual(self.payer().status_code, status.HTTP_201_CREATED)

    def test_autre_contrat_du_meme_client_non_bloque(self):
        autre_contrat = make_contrat(self.client_profile, numero='CTR-2')
        self.assertEqual(self.payer().status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.payer(autre_contrat).status_code, status.HTTP_201_CREATED)

    def test_doublon_d_un_autre_client_jamais_revele(self):
        """Le controle d'appartenance passe avant : pas de fuite sur l'etat
        des paiements du contrat d'un autre client."""
        self.assertEqual(self.payer().status_code, status.HTTP_201_CREATED)
        attaquant = make_client('attaquant@nia.ne')
        self.client.force_authenticate(user=attaquant.user)
        response = self.payer()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn(MESSAGE_PAIEMENT_DEJA_EN_ATTENTE, str(response.data))

    def test_integrity_error_concurrente_transformee_en_400(self):
        """Simule la course : la requete concurrente a insere son paiement
        entre validate() et l'INSERT, la base leve l'IntegrityError."""
        erreur = IntegrityError(
            'duplicate key value violates unique constraint '
            f'"{CONTRAINTE_UN_PAIEMENT_EN_ATTENTE}"'
        )
        with mock.patch.object(Paiement.objects, 'create', side_effect=erreur):
            response = self.payer()
        self.assertRefuseCommeDoublon(response)
        self.assertFalse(Paiement.objects.exists())

    def test_autre_integrity_error_non_deguisee_en_doublon(self):
        erreur = IntegrityError('violation sans rapport')
        with mock.patch.object(Paiement.objects, 'create', side_effect=erreur):
            with self.assertRaises(IntegrityError):
                self.payer()

    def test_contrainte_appliquee_par_la_base(self):
        self.creer_paiement('REC-A')
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.creer_paiement('REC-B')
        # Hors EN_ATTENTE, plusieurs paiements par contrat restent permis.
        self.creer_paiement('REC-C', 'VALIDE')
        self.creer_paiement('REC-D', 'VALIDE')
        self.creer_paiement('REC-E', 'ECHOUE')
        self.assertEqual(Paiement.objects.filter(contrat=self.contrat).count(), 4)

    def test_contrainte_presente_en_base(self):
        with connection.cursor() as cursor:
            contraintes = connection.introspection.get_constraints(
                cursor, Paiement._meta.db_table,
            )
        self.assertIn(CONTRAINTE_UN_PAIEMENT_EN_ATTENTE, contraintes)
        contrainte = contraintes[CONTRAINTE_UN_PAIEMENT_EN_ATTENTE]
        self.assertTrue(contrainte['unique'])
        self.assertEqual(contrainte['columns'], ['contrat_id'])

    def test_admin_ne_peut_pas_remettre_en_attente_un_second_paiement(self):
        """Cote compagnie : 400 clair, jamais une 500."""
        self.creer_paiement('REC-A')
        echoue = self.creer_paiement('REC-B', 'ECHOUE')
        admin = User.objects.create_user(
            email='admin@nia.ne', password='Secret123!', nom='Admin', prenom='X',
            role='ADMIN', is_staff=True,
        )
        self.client.force_authenticate(user=admin)
        response = self.client.patch(
            reverse('paiement_detail', args=[echoue.id]), {'statut': 'EN_ATTENTE'},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['statut'], [MESSAGE_PAIEMENT_DEJA_EN_ATTENTE])
        echoue.refresh_from_db()
        self.assertEqual(echoue.statut, 'ECHOUE')

