from decimal import Decimal

from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from contrats.models import Contrat
from demandes.models import DemandeContrat
from paiements.models import Paiement
from sinistres.models import Sinistre


def _json_nombre(valeur):
    """Decimal -> float pour la serialisation JSON (montants agreges).
    Les comptages sont deja des int et passent inchanges."""
    if isinstance(valeur, Decimal):
        return float(valeur)
    return valeur or 0


def _serie_mensuelle(lignes, cle_valeur):
    """Transforme des lignes ``{'mois': <date>, <cle_valeur>: <nombre>}``
    (deja triees par mois croissant) en serie continue mois par mois,
    en comblant par 0 les mois sans donnee entre le premier et le dernier
    mois presents.

    Une serie continue evite que la courbe cote frontend "saute" un mois
    vide en reliant directement deux points non consecutifs.
    """
    valeurs = {
        (ligne['mois'].year, ligne['mois'].month): ligne[cle_valeur]
        for ligne in lignes
        if ligne['mois'] is not None
    }
    if not valeurs:
        return []

    (annee, mois), dernier = min(valeurs), max(valeurs)
    serie = []
    while (annee, mois) <= dernier:
        serie.append({
            'mois': f'{annee:04d}-{mois:02d}',
            'valeur': _json_nombre(valeurs.get((annee, mois), 0)),
        })
        annee, mois = (annee + 1, 1) if mois == 12 else (annee, mois + 1)
    return serie


class StatistiquesView(APIView):
    """GET /api/statistiques/ - agregats de pilotage pour l'espace compagnie.

    Reserve ADMIN/AGENT (403 pour un CLIENT), meme regle d'acces que le
    journal d'activite. Toutes les donnees sont groupees/comptees cote
    serveur via l'ORM (aggregate/annotate, pas de dependance externe) :
    le frontend ne fait que tracer les series recues.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('ADMIN', 'AGENT'):
            return Response(
                {'error': 'Permission refusée'},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response({
            'contrats_par_type': self._contrats_par_type(),
            'sinistres_par_mois': self._sinistres_par_mois(),
            'paiements_valides_par_mois': self._paiements_valides_par_mois(),
            'demandes_par_statut': self._demandes_par_statut(),
        })

    def _contrats_par_type(self):
        comptes = {
            ligne['type_assurance']: ligne['total']
            for ligne in Contrat.objects.values('type_assurance').annotate(total=Count('id'))
        }
        # Toujours renvoyer les 4 types, meme a 0 : camembert stable d'un
        # appel a l'autre et legende complete cote frontend.
        return [
            {'type': code, 'label': libelle, 'total': comptes.get(code, 0)}
            for code, libelle in Contrat.TYPE_CHOICES
        ]

    def _sinistres_par_mois(self):
        lignes = (
            Sinistre.objects
            .annotate(mois=TruncMonth('date_declaration'))
            .values('mois')
            .annotate(total=Count('id'))
            .order_by('mois')
        )
        return _serie_mensuelle(list(lignes), 'total')

    def _paiements_valides_par_mois(self):
        lignes = (
            Paiement.objects
            .filter(statut='VALIDE')
            .annotate(mois=TruncMonth('date_paiement'))
            .values('mois')
            .annotate(total=Sum('montant'))
            .order_by('mois')
        )
        return _serie_mensuelle(list(lignes), 'total')

    def _demandes_par_statut(self):
        comptes = {
            ligne['statut']: ligne['total']
            for ligne in DemandeContrat.objects.values('statut').annotate(total=Count('id'))
        }
        return [
            {'statut': code, 'label': libelle, 'total': comptes.get(code, 0)}
            for code, libelle in DemandeContrat.STATUT_CHOICES
        ]
