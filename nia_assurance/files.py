import mimetypes
import os

from django.http import FileResponse, Http404

# Types affiches directement dans le navigateur (PDF, images) ; tout le
# reste est force en telechargement (attachment) plutot que tente d'etre
# affiche "inline", ce qui serait risque pour un type HTML/executable
# (audit DevSecOps, constat 4.2 : XSS stocke via upload non valide).
TYPES_AFFICHABLES_EN_LIGNE = {'application/pdf', 'image/jpeg', 'image/png', 'image/jpg'}


def servir_fichier_protege(fichier):
    """Renvoie un FileField/ImageField deja uploade en reponse HTTP.

    A appeler seulement APRES que la vue appelante a verifie les droits
    d'acces (scope par propriete, role) : ce helper ne fait aucune
    verification d'autorisation lui-meme, il se contente de servir le
    contenu - comme ContratAttestationView/PaiementRecuView le font deja
    pour des PDF generes a la volee, generalise ici a un fichier deja
    stocke sur disque.
    """
    if not fichier:
        raise Http404("Aucun fichier.")
    nom = os.path.basename(fichier.name)
    content_type, _ = mimetypes.guess_type(nom)
    content_type = content_type or 'application/octet-stream'
    disposition = 'inline' if content_type in TYPES_AFFICHABLES_EN_LIGNE else 'attachment'
    reponse = FileResponse(fichier.open('rb'), content_type=content_type)
    reponse['Content-Disposition'] = f'{disposition}; filename="{nom}"'
    return reponse
