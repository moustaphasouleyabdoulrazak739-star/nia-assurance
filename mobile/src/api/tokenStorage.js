import * as SecureStore from 'expo-secure-store';

// Les jetons JWT donnent acces au compte : stockes via expo-secure-store
// (Keychain iOS / Keystore Android, chiffre), compatible Expo Go, plutot
// que AsyncStorage qui ecrit en clair sur le disque. AsyncStorage reste la
// bonne solution pour des donnees non sensibles (preferences, brouillons...).
export const ACCESS_TOKEN_KEY = 'nia_access_token';
export const REFRESH_TOKEN_KEY = 'nia_refresh_token';

export function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setTokens({ access, refresh }) {
  await Promise.all([
    access ? SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access) : null,
    refresh ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh) : null,
  ]);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
