import api from './client';

// GET /api/sinistres/ — le backend filtre déjà par rôle (un CLIENT ne voit
// que les sinistres de ses propres contrats, cf.
// sinistres/views.py:SinistreListView, même logique que les contrats).
export async function fetchSinistres() {
  const response = await api.get('/sinistres/');
  return response.data;
}

// Types de sinistre (Sinistre.TYPE_CHOICES côté backend) — pas d'endpoint
// dédié pour les récupérer, donc dupliqués ici comme côté web
// (frontend/src/pages/Sinistres.jsx).
export const TYPES_SINISTRE = [
  { value: 'ACCIDENT', label: 'Accident' },
  { value: 'VOL', label: 'Vol' },
  { value: 'INCENDIE', label: 'Incendie' },
  { value: 'MALADIE', label: 'Maladie' },
  { value: 'DECES', label: 'Décès' },
  { value: 'AUTRE', label: 'Autre' },
];

// POST /api/sinistres/create/ — champs attendus par SinistreCreateSerializer :
// contrat, type_sinistre, date_sinistre, description, montant_reclame (le
// numero_sinistre et le statut sont générés/gérés côté serveur). Le backend
// rejette déjà (400) un contrat non ACTIF ou n'appartenant pas au client
// (SinistreCreateSerializer.validate) ; l'écran de déclaration filtre en
// plus la liste proposée aux seuls contrats ACTIF pour éviter une
// soumission vouée à l'échec.
export async function creerSinistre(payload) {
  const response = await api.post('/sinistres/create/', payload);
  return response.data;
}

// Aplatit les erreurs de validation DRF ({champ: [messages]}) en un objet
// {champ: 'message'} affichable directement sous chaque champ du
// formulaire, plutôt qu'un unique message générique.
export function extraireErreursChamps(err) {
  const data = err?.response?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const erreurs = {};
    for (const [champ, valeur] of Object.entries(data)) {
      erreurs[champ] = Array.isArray(valeur) ? valeur.join(' ') : String(valeur);
    }
    return erreurs;
  }
  return {};
}
