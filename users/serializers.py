from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'nom', 'prenom', 'telephone', 'role', 'date_creation']
        read_only_fields = ['date_creation']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'nom', 'prenom', 'telephone', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            # "password" est ici la clef du dict d'erreurs DRF (le champ en
            # faute), pas un mot de passe en dur : bandit confond les deux
            # car il ne regarde que la chaine associee a la clef.
            raise serializers.ValidationError({'password': 'Les mots de passe ne correspondent pas'})  # nosec B105
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        return user


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])