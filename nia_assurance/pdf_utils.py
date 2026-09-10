"""Generation de PDF (attestation de contrat, recu de paiement).

reportlab est choisi plutot que weasyprint/wkhtmltopdf : pur Python, pas de
binaire externe ni de dependance systeme (GTK/cairo) qui posent souvent
probleme sous Windows - juste `pip install`.

Mise en page dessinee au canevas plutot qu'avec les Platypus/Flowables de
reportlab : la mise en page est simple et fixe (un entete de marque, deux
colonnes d'infos, un pied de page), le controle pixel-pres du canevas est
plus direct ici qu'une mise en page a flux.
"""

import io
from django.conf import settings
from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfgen import canvas

# Palette identique aux couleurs de marque extraites du logo (cf.
# frontend/tailwind.config.js) : orange primary-600, vert secondary-700.
COULEUR_PRIMARY = colors.HexColor('#DF5105')
COULEUR_SECONDARY = colors.HexColor('#027901')
COULEUR_NEUTRE = colors.HexColor('#44403C')
COULEUR_NEUTRE_CLAIR = colors.HexColor('#78716C')
COULEUR_BORDURE = colors.HexColor('#E7E5E4')

LOGO_PATH = settings.BASE_DIR / 'frontend' / 'public' / 'logo-nia.png'


def _formater_montant(montant):
    return f"{montant:,.0f}".replace(',', ' ') + ' FCFA'


def _entete(c, titre):
    """Bandeau de marque en haut de page. Renvoie le y ou commencer le corps."""
    largeur, hauteur = A4

    c.setFillColor(COULEUR_PRIMARY)
    c.rect(0, hauteur - 30 * mm, largeur, 30 * mm, fill=1, stroke=0)

    if LOGO_PATH.exists():
        c.drawImage(
            str(LOGO_PATH), 15 * mm, hauteur - 26 * mm,
            width=18 * mm, height=18 * mm,
            preserveAspectRatio=True, mask='auto',
        )

    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 16)
    c.drawString(40 * mm, hauteur - 15 * mm, 'NIA ASSURANCE')
    c.setFont('Helvetica', 8)
    c.drawString(40 * mm, hauteur - 20.5 * mm, "La Nigérienne d'Assurances et de Réassurances")

    c.setFont('Helvetica-Bold', 12)
    c.drawRightString(largeur - 15 * mm, hauteur - 18 * mm, titre)

    return hauteur - 30 * mm


def _pied_de_page(c, reference):
    largeur, _ = A4
    c.setStrokeColor(COULEUR_BORDURE)
    c.setLineWidth(0.5)
    c.line(15 * mm, 17 * mm, largeur - 15 * mm, 17 * mm)

    date_generation = timezone.now().strftime('%d/%m/%Y à %H:%M')
    c.setFillColor(COULEUR_NEUTRE_CLAIR)
    c.setFont('Helvetica', 8)
    c.drawString(15 * mm, 12 * mm, f'Document généré automatiquement le {date_generation}')
    c.drawRightString(largeur - 15 * mm, 12 * mm, f'Référence : {reference}')


def _champ(c, x, y, label, valeur):
    c.setFillColor(COULEUR_NEUTRE_CLAIR)
    c.setFont('Helvetica', 8.5)
    c.drawString(x, y, label)
    c.setFillColor(COULEUR_NEUTRE)
    c.setFont('Helvetica-Bold', 11)
    c.drawString(x, y - 5.5 * mm, valeur)


def generer_attestation_contrat(contrat):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    largeur, _ = A4
    y = _entete(c, "ATTESTATION D'ASSURANCE")

    y -= 18 * mm
    c.setFillColor(COULEUR_NEUTRE)
    c.setFont('Helvetica', 10)
    c.drawString(15 * mm, y, 'La compagnie NIA Assurance atteste que :')

    client = contrat.client
    y -= 14 * mm
    _champ(c, 15 * mm, y, 'Client', f'{client.user.prenom} {client.user.nom}')
    _champ(c, 110 * mm, y, 'CIN', client.cin or '—')

    y -= 16 * mm
    _champ(c, 15 * mm, y, 'Est titulaire du contrat n°', contrat.numero_contrat)
    _champ(c, 110 * mm, y, "Type d'assurance", contrat.get_type_assurance_display())

    y -= 16 * mm
    periode = f'Du {contrat.date_debut.strftime("%d/%m/%Y")} au {contrat.date_fin.strftime("%d/%m/%Y")}'
    _champ(c, 15 * mm, y, 'Période de validité', periode)
    _champ(c, 110 * mm, y, 'Montant de la prime', _formater_montant(contrat.montant_prime))

    y -= 16 * mm
    _champ(c, 15 * mm, y, 'Statut du contrat', contrat.get_statut_display())

    y -= 22 * mm
    c.setStrokeColor(COULEUR_SECONDARY)
    c.setLineWidth(1)
    c.roundRect(15 * mm, y - 16 * mm, largeur - 30 * mm, 16 * mm, 3 * mm, fill=0, stroke=1)
    c.setFillColor(COULEUR_SECONDARY)
    c.setFont('Helvetica-Bold', 9.5)
    c.drawCentredString(
        largeur / 2, y - 9 * mm,
        'Ce document atteste de la couverture active du contrat mentionné ci-dessus.'
    )

    _pied_de_page(c, contrat.numero_contrat)
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def generer_recu_paiement(paiement):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    largeur, _ = A4
    y = _entete(c, 'REÇU DE PAIEMENT')

    client = paiement.client
    y -= 18 * mm
    _champ(c, 15 * mm, y, 'Client', f'{client.user.prenom} {client.user.nom}')
    _champ(c, 110 * mm, y, 'N° de reçu', paiement.numero_recu)

    y -= 16 * mm
    _champ(c, 15 * mm, y, 'Contrat associé', paiement.contrat.numero_contrat)
    _champ(c, 110 * mm, y, 'Méthode de paiement', paiement.get_methode_display())

    y -= 16 * mm
    date_paiement = paiement.date_paiement.strftime('%d/%m/%Y à %H:%M')
    _champ(c, 15 * mm, y, 'Date du paiement', date_paiement)
    _champ(c, 110 * mm, y, 'Référence', paiement.reference or '—')

    y -= 26 * mm
    c.setFillColor(COULEUR_SECONDARY)
    c.setFont('Helvetica-Bold', 22)
    c.drawCentredString(largeur / 2, y, _formater_montant(paiement.montant))
    c.setFillColor(COULEUR_NEUTRE_CLAIR)
    c.setFont('Helvetica', 9)
    c.drawCentredString(largeur / 2, y - 6.5 * mm, f'Montant payé — statut : {paiement.get_statut_display()}')

    _pied_de_page(c, paiement.numero_recu)
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()
