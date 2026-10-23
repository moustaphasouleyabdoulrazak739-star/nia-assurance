"""Contenu texte des PDF (recu de paiement, attestation de contrat).

Les PDF etant compresses, on capture les chaines passees aux methodes de
dessin du canevas reportlab plutot que de relire le fichier genere.
"""

from datetime import datetime, timezone as dt_timezone
from unittest import mock

from django.test import TestCase
from reportlab.pdfgen.canvas import Canvas

from contrats.models import Contrat
from paiements.models import Paiement
from paiements.tests import make_client, make_contrat
from .pdf_utils import generer_attestation_contrat, generer_recu_paiement

# 22:31 UTC = 23:31 a Niamey (UTC+1, pas d'heure d'ete).
DATE_PAIEMENT_UTC = datetime(2026, 10, 22, 22, 31, tzinfo=dt_timezone.utc)
# 00:53 UTC le 23 = 01:53 a Niamey.
MAINTENANT_UTC = datetime(2026, 10, 23, 0, 53, tzinfo=dt_timezone.utc)

METHODES_TEXTE = ('drawString', 'drawCentredString', 'drawRightString')


def textes_dessines(generer, objet):
    textes = []

    def enregistreur(original):
        def dessiner(self, x, y, texte, *args, **kwargs):
            textes.append(texte)
            return original(self, x, y, texte, *args, **kwargs)
        return dessiner

    patches = [
        mock.patch.object(Canvas, nom, enregistreur(getattr(Canvas, nom)))
        for nom in METHODES_TEXTE
    ]
    with mock.patch('django.utils.timezone.now', return_value=MAINTENANT_UTC):
        for p in patches:
            p.start()
        try:
            generer(objet)
        finally:
            for p in patches:
                p.stop()
    return textes


class RecuPaiementPdfTests(TestCase):
    def setUp(self):
        client_profile = make_client()
        contrat = make_contrat(client_profile)
        paiement = Paiement.objects.create(
            client=client_profile, contrat=contrat, numero_recu='REC-2026-0007',
            montant='150000.00', methode='ESPECES', statut='VALIDE',
        )
        # auto_now_add ignore la valeur passee a create().
        Paiement.objects.filter(pk=paiement.pk).update(date_paiement=DATE_PAIEMENT_UTC)
        self.paiement = Paiement.objects.get(pk=paiement.pk)

    def test_heures_du_recu_en_heure_du_niger(self):
        textes = textes_dessines(generer_recu_paiement, self.paiement)
        self.assertIn('22/10/2026 à 23:31', textes)
        self.assertIn('Document généré automatiquement le 23/10/2026 à 01:53', textes)
        self.assertNotIn('22/10/2026 à 22:31', textes)

    def test_recu_sans_tiret_cadratin(self):
        textes = textes_dessines(generer_recu_paiement, self.paiement)
        self.assertIn('Montant payé, statut : Validé', textes)
        self.assertIn('Non renseignée', textes)
        for texte in textes:
            self.assertNotIn('—', texte)
            self.assertNotIn('–', texte)


class AttestationContratPdfTests(TestCase):
    def setUp(self):
        # Recharge depuis la base : make_contrat passe les dates en chaines.
        self.contrat = Contrat.objects.get(pk=make_contrat(make_client()).pk)

    def test_heure_de_generation_en_heure_du_niger(self):
        textes = textes_dessines(generer_attestation_contrat, self.contrat)
        self.assertIn('Document généré automatiquement le 23/10/2026 à 01:53', textes)

    def test_attestation_sans_tiret_cadratin(self):
        self.contrat.client.cin = ''
        textes = textes_dessines(generer_attestation_contrat, self.contrat)
        self.assertIn('Non renseigné', textes)
        for texte in textes:
            self.assertNotIn('—', texte)
            self.assertNotIn('–', texte)
