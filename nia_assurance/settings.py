from pathlib import Path
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

# Pas de valeur par defaut ici : une cle manquante doit faire echouer le
# demarrage plutot que de retomber silencieusement sur une valeur connue.
# Voir .env.example pour generer une cle avec get_random_secret_key().
SECRET_KEY = config('SECRET_KEY')

# Defaut a False : un .env absent ou incomplet doit se comporter comme de la
# production (fermee), jamais comme du dev (ouvert) par accident.
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='localhost,127.0.0.1',
    cast=lambda v: [h.strip() for h in v.split(',') if h.strip()],
)

if DEBUG:
    # L'app mobile Expo (mobile/src/api/config.js) joint le backend via l'IP
    # LAN de la machine de dev, qui change a chaque reseau/redemarrage et ne
    # peut donc pas etre listee a l'avance. On reste permissif uniquement en
    # DEBUG (reseau local de dev) ; ALLOWED_HOSTS ci-dessus (liste explicite,
    # fermee par defaut) est ce qui s'applique reellement en production.
    ALLOWED_HOSTS = ['*']

# Applications
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
]

LOCAL_APPS = [
    'users',
    'clients',
    'contrats',
    'sinistres',
    'paiements',
    'demandes',
    'journal',
    'statistiques',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'nia_assurance.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'nia_assurance.wsgi.application'

# Base de données PostgreSQL
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='nia_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default=''),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# Authentification
AUTH_USER_MODEL = 'users.User'

# JWT Configuration
from datetime import timedelta
SIMPLE_JWT = {
    # 30 min d'acces : assez court pour limiter la fenetre d'exploitation
    # d'un jeton vole, assez long pour qu'une session active ne declenche
    # pas un rafraichissement a chaque requete. Le rafraichissement est
    # transparent (intercepteurs web/mobile), donc invisible pour l'usager.
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    # Sans ceci, ROTATE_REFRESH_TOKENS renvoie un nouveau refresh token a
    # chaque rafraichissement mais laisse l'ancien valide jusqu'a sa propre
    # expiration : un refresh token vole reste exploitable meme apres que le
    # client legitime en a deja obtenu un nouveau. BLACKLIST_AFTER_ROTATION
    # invalide l'ancien des qu'il est echange (app rest_framework_simplejwt.
    # token_blacklist, deja installee).
    'BLACKLIST_AFTER_ROTATION': True,
}

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    # Throttling cible (login, changement de mot de passe) plutot que
    # global : voir users/views.py pour les vues qui declarent
    # throttle_classes/throttle_scope. Pas de limite ailleurs par defaut.
    # Cache en memoire du process (pas de CACHES configure) : suffisant
    # pour un seul process ; a revoir si le projet passe en multi-process
    # (le compteur ne serait alors plus partage entre workers).
    'DEFAULT_THROTTLE_RATES': {
        'login': '10/min',
        'login-email': '5/min',
        'change-password': '8/min',
        # Creation de paiement (paiements/views.py), par utilisateur.
        # Cache local garde volontairement pour l'instant : Redis (cache
        # partage entre workers) viendra au deploiement.
        'paiement-create': '5/min',
    },
}

# CORS
# Note pour l'app mobile Expo (mobile/) : les requetes natives (Android/iOS)
# ne passent PAS par le mecanisme CORS des navigateurs (pas d'Origin, pas de
# preflight) - cette liste ne les concerne pas, seul JWTAuthentication (sans
# session/cookie) suffit. Elle ne compte que si l'app est ouverte via le
# preview web d'Expo (`expo start --web`, servi sur localhost:8081) dans un
# vrai navigateur.
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://localhost:8081',
    'http://127.0.0.1:8081',
]

# Lisible par le JavaScript du web (requete cross-origin) : sans cela le
# navigateur masque Retry-After et le message 429 du paiement ne peut pas
# indiquer le delai exact (frontend/src/utils/paiements.js).
CORS_EXPOSE_HEADERS = ['Retry-After']

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Securite HTTPS / cookies (audit DevSecOps, etape 2)
# Desactives en dev (DEBUG=True) pour ne rien casser sur http://localhost.
# Actives automatiquement en production (DEBUG=False) : rien a retenir a
# activer manuellement au moment du deploiement.
SECURE_SSL_REDIRECT = not DEBUG
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

# HSTS : volontairement PAS lie a DEBUG seul. Un HSTS mal configure (duree
# trop longue, active avant que le HTTPS soit stable) est difficile a
# annuler cote navigateur. Reste a 0 (desactive) jusqu'a activation
# explicite via la variable d'environnement, une fois le HTTPS en place.
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=0, cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = SECURE_HSTS_SECONDS > 0
SECURE_HSTS_PRELOAD = SECURE_HSTS_SECONDS > 0

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Niamey'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'