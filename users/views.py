from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import (
    UserSerializer, RegisterSerializer, ChangePasswordSerializer,
    ProfileUpdateSerializer, LoginSerializer,
)
from clients.models import Client


class LoginEmailRateThrottle(SimpleRateThrottle):
    """Throttling du login PAR COMPTE VISE, en plus du throttling par IP
    (LoginView.throttle_classes) : sans ca, un attaquant distribue sur
    plusieurs IP pourrait toujours bombarder un seul compte. Pas de cle =
    pas de throttle ici (un email absent/invalide est deja rejete par
    LoginSerializer avant meme d'atteindre la vue)."""

    scope = 'login-email'

    def get_cache_key(self, request, view):
        email = request.data.get('email')
        if not isinstance(email, str) or not email.strip():
            return None
        return self.cache_format % {'scope': self.scope, 'ident': email.strip().lower()}


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Profil client cree immediatement (vide) pour que le compte soit
        # visible cote compagnie des l'inscription ; les infos KYC (CIN,
        # adresse...) sont completees ensuite via "Mon profil".
        Client.objects.create(user=user)
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'message': 'Compte créé avec succès'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    # Deux throttles independants : par IP (scope 'login', defaut DRF -
    # cle = adresse IP) et par compte vise (scope 'login-email' ci-dessus).
    # Les deux doivent passer pour que la requete soit acceptee.
    throttle_classes = [ScopedRateThrottle, LoginEmailRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        # Valide la forme de la requete avant tout traitement : un type
        # invalide (entier, objet) renvoie desormais un 400 propre plutot
        # que de faire planter authenticate() avec un 500 (audit DevSecOps,
        # constat 7.1).
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        user = authenticate(request, username=email, password=password)

        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Connexion réussie'
            })
        return Response({
            'error': 'Email ou mot de passe incorrect'
        }, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({
                'error': 'Token refresh manquant'
            }, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Déconnexion réussie'})
        except TokenError as e:
            # Uniquement les erreurs de jeton attendues (invalide, expire,
            # deja blackliste) : avant, un except Exception nu aurait aussi
            # avale - et renvoye tel quel au client - n'importe quelle
            # autre erreur inattendue (audit DevSecOps, constat 7.3).
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        # Lecture : UserSerializer (inchange). Ecriture : serializer dedie
        # qui n'expose ni role ni email - voir ProfileUpdateSerializer
        # (audit DevSecOps, constat 3.1).
        if self.request.method in ('PUT', 'PATCH'):
            return ProfileUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'change-password'

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.validated_data['old_password']):
                return Response({
                    'error': 'Ancien mot de passe incorrect'
                }, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({'message': 'Mot de passe modifié avec succès'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)