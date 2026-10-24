import os

from django.core.exceptions import ValidationError

# Validation cote serveur du type/de la taille des fichiers uploades : ne
# jamais se fier au seul controle fait par le frontend (input type="file"
# accept=... est purement indicatif et facilement contourne).
ALLOWED_CONTENT_TYPES = {'application/pdf', 'image/jpeg', 'image/png'}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 Mo

# Format attendu selon l'extension, le type declare et la signature
# (premiers octets) du fichier. Les trois doivent designer le meme format.
FORMAT_PAR_EXTENSION = {'.pdf': 'pdf', '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png'}
FORMAT_PAR_CONTENT_TYPE = {'application/pdf': 'pdf', 'image/jpeg': 'jpeg', 'image/png': 'png'}
SIGNATURES = (
    (b'%PDF-', 'pdf'),
    (b'\xff\xd8\xff', 'jpeg'),
    (b'\x89PNG\r\n\x1a\n', 'png'),
)
TAILLE_EN_TETE = 8

MESSAGE_CONTENU_INVALIDE = 'Le contenu du fichier ne correspond pas à un PDF, JPEG ou PNG valide.'


def validate_document_file(fichier):
    if fichier.size > MAX_UPLOAD_SIZE:
        raise ValidationError('Le fichier dépasse la taille maximale autorisée (5 Mo).')
    content_type = getattr(fichier, 'content_type', None)
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValidationError('Format de fichier non autorisé (PDF, JPG ou PNG uniquement).')


def _lire_en_tete(fichier):
    """Lit les premiers octets puis remet le curseur au debut, pour que
    l'enregistrement du fichier reste complet."""
    fichier.seek(0)
    try:
        return fichier.read(TAILLE_EN_TETE)
    finally:
        fichier.seek(0)


def _format_detecte(en_tete):
    for signature, format_fichier in SIGNATURES:
        if en_tete.startswith(signature):
            return format_fichier
    return None


def validate_document_content(fichier):
    """Verifie le contenu reel du fichier (signature des premiers octets),
    et non le seul Content-Type envoye par le client : un texte renomme en
    .pdf, ou une image renommee avec une autre extension, est refuse.
    A appeler apres validate_document_file (taille et type autorises)."""
    extension = os.path.splitext(getattr(fichier, 'name', '') or '')[1].lower()
    format_extension = FORMAT_PAR_EXTENSION.get(extension)
    format_declare = FORMAT_PAR_CONTENT_TYPE.get(getattr(fichier, 'content_type', None))
    format_reel = _format_detecte(_lire_en_tete(fichier))
    if format_reel is None or not (format_extension == format_declare == format_reel):
        raise ValidationError(MESSAGE_CONTENU_INVALIDE)
