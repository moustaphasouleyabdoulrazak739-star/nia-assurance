from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Serializer de LECTURE (profil, imbrique dans ClientSerializer...).
    Ne jamais l'utiliser pour une ecriture : role n'y est pas protege par
    read_only_fields, volontairement - c'est ProfileUpdateSerializer qui
    sert desormais a ecrire via /api/auth/profile/ (voir plus bas)."""

    class Meta:
        model = User
        fields = ['id', 'email', 'nom', 'prenom', 'telephone', 'role', 'date_creation']
        read_only_fields = ['date_creation']


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer d'ECRITURE pour PATCH/PUT /api/auth/profile/. N'expose
    que ce qu'un utilisateur doit pouvoir modifier lui-meme sur son propre
    compte. role et email en sont absents : les exposer permettait a
    n'importe quel CLIENT de s'auto-promouvoir ADMIN d'un simple PATCH
    (audit DevSecOps, constat 3.1) - le changement de role doit rester un
    geste administratif a part, pas un champ de formulaire self-service."""

    class Meta:
        model = User
        fields = ['nom', 'prenom', 'telephone']


class LoginSerializer(serializers.Serializer):
    """Valide la FORME de la requete de connexion avant tout appel a
    authenticate() : un email/mot de passe du mauvais type (entier, objet)
    levait auparavant une exception non interceptee -> 500 avec la page de
    debug complete au lieu d'un 400 propre (audit DevSecOps, constat 7.1)."""

    email = serializers.CharField()
    password = serializers.CharField()


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