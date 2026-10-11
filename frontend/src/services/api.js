import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';
const REFRESH_PATH = '/auth/token/refresh/';

// Routes d'authentification elles-memes : un 401 ici est un refus de
// connexion/inscription/deconnexion, jamais un jeton expire - il n'y a
// d'ailleurs aucun jeton en jeu sur login/register. Les exclure evite le
// bug constate : un mauvais mot de passe sur /auth/login/ declenchait un
// rafraichissement (qui echoue, faute de jeton a rafraichir), suivi d'une
// deconnexion qui rechargeait la page de connexion et effacait le message
// d'erreur et le formulaire.
const ROUTES_SANS_RAFRAICHISSEMENT = ['/auth/login/', '/auth/register/', '/auth/logout/', REFRESH_PATH];

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajoute le token JWT automatiquement
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Rafraîchissement automatique du jeton d'accès ---
// Le backend tourne le refresh token à chaque usage (ROTATE_REFRESH_TOKENS)
// et blackliste l'ancien (BLACKLIST_AFTER_ROTATION) : un seul appel à
// /auth/token/refresh/ doit donc être en vol à la fois, sinon la deuxième
// requête à échouer utiliserait un refresh token déjà consommé par la
// première. refreshPromise sert de verrou partagé entre toutes les requêtes
// qui essuient un 401 en même temps.
let refreshPromise = null;

function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  window.location.href = '/login';
}

function refreshAccessToken() {
  if (!refreshPromise) {
    const refresh = localStorage.getItem('refresh_token');
    refreshPromise = (refresh
      ? axios.post(`${API_URL}${REFRESH_PATH}`, { refresh })
      : Promise.reject(new Error('Pas de refresh token')))
      .then((response) => {
        localStorage.setItem('access_token', response.data.access);
        // ROTATE_REFRESH_TOKENS : un nouveau refresh token accompagne
        // toujours la réponse ; on le persiste pour le prochain rafraîchissement.
        if (response.data.refresh) {
          localStorage.setItem('refresh_token', response.data.refresh);
        }
        return response.data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Gère l'expiration du token : rafraîchissement automatique puis rejeu de
// la requête d'origine, déconnexion propre si le rafraîchissement échoue.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    // Ni rafraîchissement ni déconnexion automatique :
    // - sur une route d'authentification elle-même (login/register/logout,
    //   ou l'appel de refresh lui-même rejoué via cette instance) ;
    // - sur une requête qui ne portait même pas de jeton d'accès au départ
    //   (rien à rafraîchir, ce n'est pas une expiration de session).
    // Dans ces deux cas, l'erreur remonte telle quelle à l'appelant (ex :
    // le formulaire de connexion affiche son propre message).
    const estRouteAuth = ROUTES_SANS_RAFRAICHISSEMENT.includes(originalRequest.url);
    const avaitUnJeton = Boolean(originalRequest.headers?.Authorization);
    if (estRouteAuth || !avaitUnJeton) {
      return Promise.reject(error);
    }

    // Une requête (qui avait bien un jeton) n'est rejouée qu'une seule
    // fois : si elle échoue encore après rafraîchissement, déconnexion.
    if (originalRequest._retry) {
      logout();
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      logout();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
