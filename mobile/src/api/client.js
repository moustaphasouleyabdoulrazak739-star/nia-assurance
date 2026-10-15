import axios from 'axios';
import { API_BASE_URL } from './config';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokenStorage';
import { notifyUnauthorized } from './authEvents';
import { DELAI_REQUETE_MS, doitRejouerApresErreurReseau, estErreurReseau } from '../utils/reseau';

const REFRESH_PATH = '/auth/token/refresh/';

// Routes d'authentification elles-memes : un 401 ici est un refus de
// connexion/inscription/deconnexion, jamais un jeton expire. Memes routes
// que frontend/src/services/api.js, meme bug corrige : un mauvais mot de
// passe sur l'ecran de connexion declenchait un rafraichissement (qui
// echoue, faute de jeton a rafraichir) suivi d'une deconnexion.
const ROUTES_SANS_RAFRAICHISSEMENT = ['/auth/login/', '/auth/register/', '/auth/logout/', REFRESH_PATH];

// Délai maximal par défaut : sans lui, une requête partie sur une connexion
// morte laissait l'écran en chargement indéfiniment (voir utils/reseau.js).
// Surchargeable par requête avec l'option axios standard `timeout`, ex.
// api.post(url, data, { timeout: DELAI_ENVOI_FICHIERS_MS }) ; la valeur
// surchargée est conservée lors d'une nouvelle tentative (même config).
// eslint-disable-next-line import/no-named-as-default-member -- axios par defaut (cf. frontend/src/services/api.js)
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DELAI_REQUETE_MS,
  headers: { 'Content-Type': 'application/json' },
});

// Ajoute le token JWT automatiquement — équivalent mobile de l'intercepteur
// axios du frontend web (frontend/src/services/api.js), même API Django et
// même schéma d'auth, juste expo-secure-store à la place du localStorage.
api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Rafraîchissement automatique du jeton d'accès ---
// Même logique que frontend/src/services/api.js (un seul rafraîchissement
// en vol à la fois via refreshPromise, jamais rejouer l'appel de refresh
// lui-même, une requête n'est rejouée qu'une fois), adaptée au stockage
// asynchrone. L'appel de refresh passe par axios "brut", jamais par
// l'instance `api`, pour ne jamais repasser par cet intercepteur.
let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = getRefreshToken()
      .then((refresh) => {
        if (!refresh) {
          throw new Error('Pas de refresh token');
        }
        // Délai obligatoire ici aussi : un refresh sans réponse garderait
        // refreshPromise en attente, et avec lui toutes les requêtes en 401.
        return axios.post(`${API_BASE_URL}${REFRESH_PATH}`, { refresh }, { timeout: DELAI_REQUETE_MS });
      })
      .then(async (response) => {
        await setTokens({ access: response.data.access, refresh: response.data.refresh });
        return response.data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Pour les appels qui ne passent pas par axios (FileSystem.downloadAsync des
// PDF) : même rafraîchissement partagé que l'intercepteur ci-dessous (même
// verrou refreshPromise, jetons écrits uniquement dans SecureStore), et même
// déconnexion si le refresh token est lui-même expiré ou révoqué.
export async function rafraichirJetonOuDeconnecter() {
  try {
    return await refreshAccessToken();
  } catch (refreshError) {
    await deconnecterSaufErreurReseau(refreshError);
    throw refreshError;
  }
}

// Un refresh qui échoue faute de réseau (timeout, Wi-Fi coupé) ne dit rien
// de la validité du refresh token : on garde la session, la prochaine
// requête retentera. Seul un refus du serveur (401...) déconnecte.
async function deconnecterSaufErreurReseau(refreshError) {
  if (estErreurReseau(refreshError)) return;
  await clearTokens();
  notifyUnauthorized();
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Connexion morte ou serveur muet : une seule nouvelle tentative, et
    // seulement pour un GET (jamais un POST/PATCH, cf. utils/reseau.js).
    // axios annule la requête au timeout, ce qui ferme la connexion : la
    // nouvelle tentative part sur une connexion neuve.
    if (doitRejouerApresErreurReseau(originalRequest, error)) {
      originalRequest._nouvelleTentativeReseau = true;
      return api(originalRequest);
    }

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Ni rafraîchissement ni déconnexion : route d'authentification, ou
    // requête qui ne portait même pas de jeton d'accès au départ.
    const estRouteAuth = ROUTES_SANS_RAFRAICHISSEMENT.includes(originalRequest.url);
    const avaitUnJeton = Boolean(originalRequest.headers?.Authorization);
    if (estRouteAuth || !avaitUnJeton) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      await clearTokens();
      notifyUnauthorized();
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    // Seul l'échec du refresh lui-même peut déconnecter : une erreur de la
    // requête rejouée (404, réseau...) remonte telle quelle à l'écran.
    let newAccessToken;
    try {
      newAccessToken = await refreshAccessToken();
    } catch (refreshError) {
      await deconnecterSaufErreurReseau(refreshError);
      return Promise.reject(refreshError);
    }
    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
    return api(originalRequest);
  }
);

export default api;
