import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

export const ACCESS_TOKEN_KEY = 'nia_access_token';
export const REFRESH_TOKEN_KEY = 'nia_refresh_token';

// eslint-disable-next-line import/no-named-as-default-member -- axios par defaut (cf. frontend/src/services/api.js)
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Ajoute le token JWT automatiquement — équivalent mobile de l'intercepteur
// axios du frontend web (frontend/src/services/api.js), même API Django et
// même schéma d'auth, juste AsyncStorage à la place du localStorage.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
