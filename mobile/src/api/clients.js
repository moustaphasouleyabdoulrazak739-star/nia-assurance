import api from './client';

// GET /api/clients/me/ — profil client du compte connecté (nom, CIN,
// adresse...). Utilisé par l'écran Accueil pour afficher le prénom et le
// nom du client.
export async function fetchMe() {
  const response = await api.get('/clients/me/');
  return response.data;
}
