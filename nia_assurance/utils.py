import os
import uuid
from datetime import date


def generate_numero(model, field_name, prefix):
    """Genere une reference sequentielle du type PREFIX-ANNEE-0001."""
    annee = date.today().year
    base = f"{prefix}-{annee}-"
    count = model.objects.filter(**{f"{field_name}__startswith": base}).count()
    return f"{base}{count + 1:04d}"


def _nom_aleatoire(filename):
    """uuid4 hexadecimal + extension d'origine : jamais le nom choisi par
    l'utilisateur, pour qu'un fichier (CIN, justificatif...) ne soit pas
    deductible d'un nom habituel (audit DevSecOps, constat 4.3)."""
    ext = os.path.splitext(filename)[1].lower()
    return f"{uuid.uuid4().hex}{ext}"


# Une fonction nommee par champ (plutot qu'une fabrique generique) : Django
# serialise l'upload_to d'un FileField par son chemin d'import dans les
# migrations, ce qui exige une fonction de niveau module, pas une closure.
# Changer upload_to ne renomme jamais les fichiers deja stockes - seuls les
# nouveaux uploads passent par ces fonctions.

def upload_photo_client(instance, filename):
    return f"clients/photos/{_nom_aleatoire(filename)}"


def upload_document_contrat(instance, filename):
    return f"contrats/documents/{_nom_aleatoire(filename)}"


def upload_document_sinistre(instance, filename):
    return f"sinistres/documents/{_nom_aleatoire(filename)}"


def upload_document_demande(instance, filename):
    return f"demandes/documents/{_nom_aleatoire(filename)}"
