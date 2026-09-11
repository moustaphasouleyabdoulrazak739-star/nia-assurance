# NIA Assurance — App mobile (Expo)

App mobile React Native (Expo SDK 57) pour l'espace **client** de NIA
Assurance. Projet séparé du frontend web (`frontend/`), même backend Django.

## Étape 1 (actuelle)

- Écran de connexion (email / mot de passe) branché sur `POST /api/auth/login/`
- Stockage du JWT (access + refresh) via `AsyncStorage`
- Écran "Accueil" minimal qui appelle `GET /api/clients/me/` avec le token
  stocké, pour prouver que l'auth JWT fonctionne sur une requête suivante
- Palette de marque (orange `#DF5105` / vert `#027901`) et logo appliqués

Les autres écrans (contrats, sinistres, paiements, demandes, profil)
viendront dans les étapes suivantes.

## Structure

```
mobile/
  App.js                     # point d'entrée : providers + navigation
  src/
    api/
      config.js               # URL de base de l'API (détection auto de l'IP LAN)
      client.js                # instance axios + intercepteur JWT
      auth.js                  # login(), fetchProfile()
      clients.js               # fetchMe()
    context/
      AuthContext.js           # équivalent mobile de frontend/src/context/AuthContext.jsx
    navigation/
      RootNavigator.js         # Login <-> Home selon l'état d'auth
    screens/
      LoginScreen.js
      HomeScreen.js
    theme/
      colors.js                # palette de marque (miroir de tailwind.config.js)
  assets/
    logo-nia.png                # copié depuis frontend/public/logo-nia.png
```

## Lancer en dev

1. Backend Django — **doit écouter sur toutes les interfaces**, pas
   seulement `127.0.0.1`, pour être joignable depuis un téléphone/émulateur :
   ```
   python manage.py runserver 0.0.0.0:8000
   ```
2. App mobile :
   ```
   cd mobile
   npm start
   ```
3. Scanner le QR code avec l'app **Expo Go** (Android/iOS), téléphone sur le
   **même réseau Wi-Fi** que le PC — ou taper l'URL affichée dans Expo Go
   ("Enter URL manually"). Pour un émulateur Android : touche `a` dans le
   terminal Expo (nécessite Android Studio/SDK installés sur la machine).

### Résolution automatique de l'URL de l'API

`src/api/config.js` déduit l'IP du PC à partir de l'hôte Metro exposé par
Expo (`Constants.expoConfig.hostUri`, ex. `192.168.1.23:8081`) et construit
`http://192.168.1.23:8000/api`. Ça fonctionne sans rien configurer sur un
téléphone/émulateur réel connecté au même réseau que le PC qui lance
`expo start`. Repli si aucun hôte Metro n'est détecté (ex. build autonome) :
`10.0.2.2` pour l'émulateur Android, `localhost` pour le simulateur iOS.

## Vérifications backend faites avant de coder cette étape

- **CORS** : la liste `CORS_ALLOWED_ORIGINS` (`nia_assurance/settings.py`) ne
  concerne que les requêtes émises par un vrai navigateur (Origin + preflight).
  Une app native Android/iOS n'est pas soumise à ce mécanisme — elle
  fonctionne sans y être listée. Ajouté quand même `localhost:8081` /
  `127.0.0.1:8081` pour couvrir le cas `expo start --web`.
- **JWT indépendant du frontend web** : `LoginView`/`RegisterView` utilisent
  `authenticate()` + `RefreshToken.for_user()` sans session ni cookie ;
  `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES` ne contient que
  `JWTAuthentication` (pas de `SessionAuthentication`), et DRF exempte ses
  vues du CSRF Django par défaut — confirmé par une recherche de
  `SessionAuthentication`/`request.session`/`csrf_exempt` dans le code métier
  (aucune occurrence). Testé en conditions réelles via `curl` : login +
  requête authentifiée suivante (`/api/clients/me/`) avec uniquement le
  header `Authorization: Bearer <token>`, aucun cookie.
