from rest_framework import serializers
from .models import Client
from users.serializers import UserSerializer


class ClientSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'user', 'cin', 'date_naissance',
            'sexe', 'adresse', 'ville', 'profession',
            'photo', 'date_creation', 'date_modification'
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
        user = self.context['request'].user
        client = Client.objects.create(user=user, **validated_data)
        return client