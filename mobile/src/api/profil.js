import api, { rafraichirJetonOuDeconnecter } from './client';
import { getRefreshToken } from './tokenStorage';
import { avecDelai } from '../utils/reseau';

// Délais courts de la déconnexion : elle ne doit jamais faire attendre
// l'utilisateur. Au-delà, on déconnecte localement quand même.
const DELAI_LOGOUT_MS = 5000;
const DELAI_DECONNEXION_TOTAL_MS = 8000;

// Doit rester identique à l'entrée de ROUTES_SANS_RAFRAICHISSEMENT de
// client.js : un 401 sur cette route n'y déclenche aucun rafraîchissement.
const LOGOUT_PATH = '/auth/logout/';

// Profil complet : compte (GET /api/auth/profile/) et fiche client
// (GET /api/clients/me/, qui porte profil_complet).
export async function chargerProfil() {
  const [utilisateur, client] = await Promise.all([api.get('/auth/profile/'), api.get('/clients/me/')]);
  return { utilisateur: utilisateur.data, client: client.data };
}

// Envoie uniquement les payloads non vides (cf. utils/profil.js:
// construirePayloads). Les deux PATCH sont indépendants : renvoie le
// résultat de chacun ({status: 'fulfilled', value} ou {status: 'rejected',
// reason}), ou null si rien n'était à envoyer pour cette ressource.
export async function enregistrerProfil({ utilisateur, client }) {
  const envoyer = (url, payload) =>
    Object.keys(payload || {}).length ? api.patch(url, payload).then((r) => r.data) : null;
  const [resUtilisateur, resClient] = await Promise.allSettled([
    envoyer('/auth/profile/', utilisateur),
    envoyer('/clients/me/', client),
  ]);
  const normaliser = (res) => (res.status === 'fulfilled' && res.value === null ? null : res);
  return { utilisateur: normaliser(resUtilisateur), client: normaliser(resClient) };
}

// POST /api/auth/change-password/ (throttle 'change-password', 8/min).
export async function changerMotDePasse(ancien, nouveau) {
  const response = await api.post('/auth/change-password/', { old_password: ancien, new_password: nouveau });
  return response.data;
}

async function posterLogout() {
  const refresh = await getRefreshToken();
  if (!refresh) return;
  await api.post(LOGOUT_PATH, { refresh }, { timeout: DELAI_LOGOUT_MS });
}

async function revoquerCoteServeur() {
  try {
    await posterLogout();
  } catch (err) {
    // Jeton d'accès expiré (LogoutView exige d'être authentifié) : un
    // rafraîchissement fait tourner le refresh token (l'ancien est
    // blacklisté par BLACKLIST_AFTER_ROTATION), puis on révoque le nouveau.
    if (err?.response?.status !== 401) return;
    await rafraichirJetonOuDeconnecter();
    await posterLogout();
  }
}

// Révocation du refresh token côté serveur (blacklist), au mieux : erreurs
// réseau ou serveur ignorées, durée bornée. L'appelant vide ensuite
// toujours la session locale (useAuth().logout()), même hors ligne.
// Jamais de jeton dans un log ni dans un message d'erreur.
export async function deconnecterServeur() {
  try {
    await avecDelai(revoquerCoteServeur(), DELAI_DECONNEXION_TOTAL_MS);
  } catch {
    // Volontairement ignoré : la déconnexion locale a lieu dans tous les cas.
  }
}
