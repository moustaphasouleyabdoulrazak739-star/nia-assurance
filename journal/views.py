from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import JournalActivite
from .serializers import JournalActiviteSerializer


class JournalPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class JournalListView(generics.ListAPIView):
    """GET /api/journal/ — reserve ADMIN/AGENT (403 pour un CLIENT), trie du
    plus recent au plus ancien (ordering du modele), pagine."""

    permission_classes = [IsAuthenticated]
    serializer_class = JournalActiviteSerializer
    pagination_class = JournalPagination
    queryset = JournalActivite.objects.select_related('utilisateur', 'contrat', 'sinistre', 'paiement', 'demande')

    def list(self, request, *args, **kwargs):
        if request.user.role not in ('ADMIN', 'AGENT'):
            return Response({'error': 'Permission refusée'}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)
