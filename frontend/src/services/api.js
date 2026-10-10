import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';
const REFRESH_PATH = '/auth/token/refresh/';

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

    // L'appel de refresh passe par axios "brut" (voir refreshAccessToken),
    // jamais par cette instance `api` : ce garde-fou reste au cas où un
    // appel futur l'invoquerait via `api`, pour ne jamais rejouer un
    // /auth/token/refresh/ en échec (boucle infinie). Une requête n'est
    // par ailleurs rejouée qu'une seule fois (_retry).
    if (originalRequest.url === REFRESH_PATH || originalRequest._retry) {
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
