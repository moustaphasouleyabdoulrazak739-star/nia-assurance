from rest_framework import serializers
from .models import Client
from users.serializers import UserSerializer


class ClientSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    profil_complet = serializers.BooleanField(read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'user', 'cin', 'date_naissance',
            'sexe', 'adresse', 'ville', 'profession',
            'photo', 'profil_complet', 'date_creation', 'date_modification'
        ]
        read_only_fields = ['date_creation', 'date_modification']


class ClientCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            'id', 'cin', 'date_naissance', 'sexe',
            'adresse', 'ville', 'profession', 'photo'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        # Chaque inscription cree deja un profil Client vide : cet endpoint
        # doit rester idempotent plutot que de planter sur la contrainte
        # unique(user) si on l'appelle sur un profil deja existant.
        user = self.context['request'].user
        client, _ = Client.objects.update_or_create(user=user, defaults=validated_data)
        return client