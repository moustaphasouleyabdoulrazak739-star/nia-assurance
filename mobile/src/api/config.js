import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DJANGO_PORT = 8000;

/**
 * En dev, l'appli est chargée depuis le bundler Metro dont l'hôte (IP locale
 * du PC + port Metro, ex. "192.168.1.23:8081") est exposé par Expo. On
 * réutilise cette même IP pour joindre le backend Django (port 8000) : ça
 * fonctionne automatiquement sur un téléphone/émulateur réel connecté au
 * même réseau, sans configuration manuelle à chaque changement de machine.
 */
function deviceLanIp() {
  const hostUri =
    Constants.expoConfig?.hostUri || Constants.expoGoConfig?.debuggerHost || '';
  const host = hostUri.split(':')[0];
  return host && host !== 'localhost' ? host : null;
}

function resolveBaseUrl() {
  const lanIp = deviceLanIp();
  if (lanIp) return `http://${lanIp}:${DJANGO_PORT}/api`;

  // Pas d'hôte Metro détecté (ex. build autonome) : repli par plateforme.
  // L'émulateur Android ne voit pas le 127.0.0.1 de la machine hôte, il faut
  // l'alias spécial 10.0.2.2 ; le simulateur iOS peut utiliser localhost.
  return Platform.OS === 'android'
    ? `http://10.0.2.2:${DJANGO_PORT}/api`
    : `http://localhost:${DJANGO_PORT}/api`;
}

export const API_BASE_URL = resolveBaseUrl();
