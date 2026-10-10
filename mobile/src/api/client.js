import axios from 'axios';
import { API_BASE_URL } from './config';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokenStorage';
import { notifyUnauthorized } from './authEvents';

const REFRESH_PATH = '/auth/token/refresh/';

// eslint-disable-next-line import/no-named-as-default-member -- axios par defaut (cf. frontend/src/services/api.js)
const api = axios.create({
  baseURL: API_BASE_URL,
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
        return axios.post(`${API_BASE_URL}${REFRESH_PATH}`, { refresh });
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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    if (originalRequest.url === REFRESH_PATH || originalRequest._retry) {
      await clearTokens();
      notifyUnauthorized();
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      await clearTokens();
      notifyUnauthorized();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
