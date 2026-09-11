import api from './client';

// GET /api/clients/me/ — profil client du compte connecté (nom, CIN,
// adresse...). Utilisé par l'écran Accueil pour prouver que le token JWT
// stocké au login est bien envoyé sur une requête authentifiée ultérieure.
export async function fetchMe() {
  const response = await api.get('/clients/me/');
  return response.data;
}
