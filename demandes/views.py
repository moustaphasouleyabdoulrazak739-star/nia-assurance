from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import DemandeContrat
from .serializers import (
    DemandeContratSerializer,
    DemandeContratCreateSerializer,
    DemandeValiderSerializer,
    DemandeRejeterSerializer,
)
from contrats.models import Contrat
from contrats.serializers import ContratSerializer
from nia_assurance.utils import generate_numero
from journal.utils import enregistrer_action


class DemandeListView(generics.ListAPIView):
    """GET /api/demandes/ — le client ne voit que ses demandes, la
    compagnie les voit toutes. Filtre optionnel ?statut=EN_ATTENTE (c'est
    ce filtre, plutot qu'une route dediee, que la sidebar compagnie utilise
    pour son compteur : la liste des demandes reste un endpoint a part
    entiere, jamais melangee a /api/contrats/)."""

    permission_classes = [IsAuthenticated]
    serializer_class = DemandeContratSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ('ADMIN', 'AGENT'):
            qs = DemandeContrat.objects.all()
        else:
            qs = DemandeContrat.objects.filter(client__user=user)
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        return qs.select_related('client__user', 'contrat').prefetch_related('documents')


class DemandeDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DemandeContratSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ('ADMIN', 'AGENT'):
            return DemandeContrat.objects.all()
        return DemandeContrat.objects.filter(client__user=user)


def _get_client_ou_erreur(request):
    """Le client est toujours derive de request.user, jamais accepte dans le
    payload : evite qu'un client cree/resoumette une demande au nom d'un
    autre (IDOR), comme deja fait pour Paiements/Sinistres."""
    if request.user.role != 'CLIENT':
        return None, Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
    client = getattr(request.user, 'client', None)
    if client is None:
        return None, Response({'error': 'Profil client introuvable.'}, status=status.HTTP_400_BAD_REQUEST)
    if not client.profil_complet:
        return None, Response({
            'error': "Complétez votre profil (CIN, date de naissance, adresse, ville) "
                     "depuis \"Mon profil\" avant de demander un contrat."
        }, status=status.HTTP_400_BAD_REQUEST)
    return client, None


class DemandeCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DemandeContratCreateSerializer

    def create(self, request, *args, **kwargs):
        client, erreur = _get_client_ou_erreur(request)
        if erreur:
            return erreur

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        demande = serializer.save()
        return Response({
            'demande': DemandeContratSerializer(demande, context={'request': request}).data,
            'message': 'Demande envoyée avec succès'
        }, status=status.HTTP_201_CREATED)


class DemandeResoumettreView(generics.CreateAPIView):
    """POST /api/demandes/<pk>/resoumettre/ — cree une NOUVELLE demande liee
    a celle-ci via demande_precedente. Uniquement possible si la demande
    d'origine est REJETEE et appartient bien au client authentifie."""

    permission_classes = [IsAuthenticated]
    serializer_class = DemandeContratCreateSerializer

    def create(self, request, *args, **kwargs):
        client, erreur = _get_client_ou_erreur(request)
        if erreur:
            return erreur

        try:
            ancienne = DemandeContrat.objects.get(pk=kwargs['pk'], client=client)
        except DemandeContrat.DoesNotExist:
            return Response({'error': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if ancienne.statut != 'REJETEE':
            return Response({
                'error': 'Seule une demande rejetée peut être resoumise.'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        demande = serializer.save(demande_precedente=ancienne)
        return Response({
            'demande': DemandeContratSerializer(demande, context={'request': request}).data,
            'message': 'Demande resoumise avec succès'
        }, status=status.HTTP_201_CREATED)


class DemandeValiderView(APIView):
    """POST /api/demandes/<pk>/valider/ — reserve a la compagnie. Cree le
    Contrat reel avec les conditions fournies (dates, prime) et fait passer
    la demande a VALIDEE."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ('ADMIN', 'AGENT'):
            return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
        try:
            demande = DemandeContrat.objects.get(pk=pk)
        except DemandeContrat.DoesNotExist:
            return Response({'error': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if demande.statut != 'EN_ATTENTE':
            return Response({'error': 'Cette demande a déjà été traitée.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = DemandeValiderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        contrat = Contrat.objects.create(
            client=demande.client,
            numero_contrat=generate_numero(Contrat, 'numero_contrat', 'CTR'),
            type_assurance=demande.type_assurance,
            date_debut=data['date_debut'],
            date_fin=data['date_fin'],
            montant_prime=data['montant_prime'],
            statut='ACTIF',
            description=data.get('description', ''),
        )
        demande.statut = 'VALIDEE'
        demande.contrat = contrat
        demande.date_traitement = timezone.now()
        demande.save()

        enregistrer_action(
            request.user, 'DEMANDE_VALIDEE',
            f"Demande {demande.numero_demande} validée, contrat {contrat.numero_contrat} créé",
            demande=demande, contrat=contrat,
        )

        return Response({
            'demande': DemandeContratSerializer(demande, context={'request': request}).data,
            'contrat': ContratSerializer(contrat).data,
            'message': 'Demande validée, contrat créé avec succès'
        }, status=status.HTTP_200_OK)


class DemandeRejeterView(APIView):
    """POST /api/demandes/<pk>/rejeter/ — reserve a la compagnie. Motif
    obligatoire, visible ensuite par le client sur sa demande."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ('ADMIN', 'AGENT'):
            return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
        try:
            demande = DemandeContrat.objects.get(pk=pk)
        except DemandeContrat.DoesNotExist:
            return Response({'error': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if demande.statut != 'EN_ATTENTE':
            return Response({'error': 'Cette demande a déjà été traitée.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = DemandeRejeterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        demande.statut = 'REJETEE'
        demande.motif_rejet = serializer.validated_data['motif_rejet']
        demande.date_traitement = timezone.now()
        demande.save()

        enregistrer_action(
            request.user, 'DEMANDE_REJETEE',
            f"Demande {demande.numero_demande} rejetée",
            demande=demande,
        )

        return Response({
            'demande': DemandeContratSerializer(demande, context={'request': request}).data,
            'message': 'Demande rejetée'
        }, status=status.HTTP_200_OK)
