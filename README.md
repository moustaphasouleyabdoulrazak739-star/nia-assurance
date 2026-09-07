# NIA Assurance

Application de gestion d'assurance : back-office et espace client pour gérer
**clients, contrats, sinistres et paiements**. Interface en français, contexte
Niger (fuseau `Africa/Niamey`).

> ✅ **Fonctionnel de bout en bout.** Inscription, complétion du profil,
> création/gestion de contrats, déclaration de sinistres et paiements sont
> opérationnels et couverts par des tests automatisés.

---

## Stack technique

### Backend — API REST
- **Python 3.13** / **Django 6**
- **Django REST Framework** 3.17
- **JWT** via `djangorestframework-simplejwt` (rotation + blacklist des refresh tokens)
- **PostgreSQL** (via `psycopg2-binary`)
- **python-decouple** pour la configuration (fichier `.env`)
- Modèle utilisateur personnalisé (`users.User`, connexion par e-mail, rôles `CLIENT` / `AGENT` / `ADMIN`)
- Upload de fichiers via **Pillow**

Applications Django : `users`, `clients`, `contrats`, `sinistres`, `paiements`.

### Frontend — SPA
- **React 19** + **Vite 5**
- **Tailwind CSS 3**
- **React Router 7**
- **axios** (intercepteur qui injecte le JWT et redirige vers `/login` sur 401)

Pages : `Login`, `Register`, `Dashboard`, `Contrats`, `Sinistres`, `Paiements`, `Profil`.
Les tableaux de bord utilisent des cartes statistiques Tailwind + icônes SVG inline
(pas de librairie de graphiques pour l'instant).

---

## Prérequis

- Python 3.13+
- Node.js 18+
- PostgreSQL 14+ (base `nia_db` à créer)

---

## Installation & lancement — Backend

```bash
# À la racine du projet
python -m venv venv

# Activer le venv
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows (PowerShell/CMD)

pip install -r requirements.txt

# Configuration : copier le modèle et renseigner les valeurs
cp .env.example .env            # (copy .env.example .env sous Windows)
# -> éditer .env : SECRET_KEY, DB_USER, DB_PASSWORD, etc.

# Créer la base PostgreSQL nommée nia_db, puis :
python manage.py migrate
python manage.py createsuperuser

python manage.py runserver      # API sur http://127.0.0.1:8000
```

### Points d'entrée de l'API
| Préfixe | Contenu |
|---|---|
| `/admin/` | Admin Django |
| `/api/auth/` | Inscription, connexion (JWT), refresh, profil |
| `/api/clients/` | Clients |
| `/api/contrats/` | Contrats |
| `/api/sinistres/` | Sinistres |
| `/api/paiements/` | Paiements |

---

## Installation & lancement — Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Le frontend appelle l'API sur `http://127.0.0.1:8000/api` (constante `API_URL`
dans `src/services/api.js`). Adapter cette valeur si l'API tourne ailleurs.

Build de production :

```bash
npm run build                   # génère frontend/dist/
npm run preview
```

---

## Variables d'environnement (backend)

Voir `.env.example`. Le fichier `.env` réel est ignoré par git.

| Variable | Rôle | Exemple |
|---|---|---|
| `SECRET_KEY` | Clé secrète Django | `python -c "import secrets; print(secrets.token_urlsafe(50))"` |
| `DEBUG` | Mode debug | `True` en local, `False` en prod |
| `DB_NAME` | Nom de la base | `nia_db` |
| `DB_USER` | Utilisateur PostgreSQL | `postgres` |
| `DB_PASSWORD` | Mot de passe PostgreSQL | — |
| `DB_HOST` | Hôte de la base | `localhost` |
| `DB_PORT` | Port de la base | `5432` |

---

## Structure du dépôt

```
.
├── manage.py
├── requirements.txt
├── .env.example
├── nia_assurance/         # config du projet (settings, urls, wsgi/asgi)
├── users/                 # modèle User + authentification JWT
├── clients/               # CRUD clients
├── contrats/              # CRUD contrats
├── sinistres/             # CRUD sinistres
├── paiements/             # CRUD paiements
└── frontend/              # SPA React + Vite + Tailwind
```
