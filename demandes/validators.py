from django.core.exceptions import ValidationError

# Validation cote serveur du type/de la taille des fichiers uploades : ne
# jamais se fier au seul controle fait par le frontend (input type="file"
# accept=... est purement indicatif et facilement contourne).
ALLOWED_CONTENT_TYPES = {'application/pdf', 'image/jpeg', 'image/png'}
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 Mo


def validate_document_file(fichier):
    if fichier.size > MAX_UPLOAD_SIZE:
        raise ValidationError('Le fichier dépasse la taille maximale autorisée (5 Mo).')
    content_type = getattr(fichier, 'content_type', None)
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValidationError('Format de fichier non autorisé (PDF, JPG ou PNG uniquement).')
