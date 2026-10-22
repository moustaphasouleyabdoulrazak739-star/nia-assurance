import api from './client';
import { DELAI_ENVOI_FICHIERS_MS } from '../utils/reseau';
import { partiesFormulaire } from '../utils/demandes';

// GET /api/demandes/ : le backend filtre déjà par rôle (un CLIENT ne voit
// que ses propres demandes, cf. demandes/views.py:DemandeListView). Pas de
// pagination côté API.
export async function fetchDemandes() {
  const response = await api.get('/demandes/');
  return response.data;
}

function construireFormData(typeAssurance, fichiers) {
  const formData = new FormData();
  for (const [nom, valeur] of partiesFormulaire(typeAssurance, fichiers)) {
    formData.append(nom, valeur);
  }
  return formData;
}

// L'instance axios envoie du JSON par défaut : avec cet en-tête JSON, axios
// convertirait le FormData en JSON (fichiers perdus). On annonce donc
// multipart/form-data ; axios retire ensuite l'en-tête sous React Native
// pour laisser la couche réseau native poser la bonne frontière (boundary).
// Délai de 120 s (DELAI_ENVOI_FICHIERS_MS) : envoi de pièces jointes sur
// réseau mobile. Jamais rejoué automatiquement sur erreur réseau (POST,
// cf. utils/reseau.js:doitRejouerApresErreurReseau).
function envoyer(url, typeAssurance, fichiers) {
  return api.post(url, construireFormData(typeAssurance, fichiers), {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: DELAI_ENVOI_FICHIERS_MS,
  });
}

// POST /api/demandes/create/ : type_assurance + un champ fichier par
// document (DemandeContratCreateSerializer). Client dérivé du jeton.
export async function creerDemande(typeAssurance, fichiers) {
  const response = await envoyer('/demandes/create/', typeAssurance, fichiers);
  return response.data;
}

// POST /api/demandes/<id>/resoumettre/ : uniquement pour une demande
// REJETEE du client : le serveur crée une NOUVELLE demande liée à
// l'ancienne (demande_precedente), mêmes champs et mêmes pièces exigées
// que la création (les pièces de la demande rejetée ne sont pas reprises).
export async function resoumettreDemande(demandeId, typeAssurance, fichiers) {
  const response = await envoyer(`/demandes/${demandeId}/resoumettre/`, typeAssurance, fichiers);
  return response.data;
}
