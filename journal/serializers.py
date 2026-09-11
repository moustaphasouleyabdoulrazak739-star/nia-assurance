from rest_framework import serializers
from .models import JournalActivite


class JournalActiviteSerializer(serializers.ModelSerializer):
    utilisateur_nom = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = JournalActivite
        fields = [
            'id', 'utilisateur_nom', 'action', 'action_display', 'resume',
            'contrat', 'sinistre', 'paiement', 'demande', 'date_creation',
        ]
        read_only_fields = fields

    def get_utilisateur_nom(self, obj):
        if obj.utilisateur:
            return f'{obj.utilisateur.prenom} {obj.utilisateur.nom}'
        return 'Utilisateur supprimé'
