import api from './client';
import { telechargerEtPartagerPdf } from './telechargement';

// GET /api/paiements/ — le backend filtre déjà par rôle (un CLIENT ne voit
// que ses propres paiements, cf. paiements/views.py:PaiementListView).
export async function fetchPaiements() {
  const response = await api.get('/paiements/');
  return response.data;
}

// GET /api/paiements/<id>/ — même portée que la liste (404 pour le paiement
// d'un autre client, cf. PaiementDetailView.get_queryset).
export async function fetchPaiement(id) {
  const response = await api.get(`/paiements/${id}/`);
  return response.data;
}

// Modes de paiement (Paiement.METHODE_CHOICES côté backend) — pas d'endpoint
// dédié, donc dupliqués ici comme côté web (frontend/src/pages/Paiements.jsx).
export const METHODES_PAIEMENT = [
  { value: 'MYNITA', label: 'MyNITA' },
  { value: 'AMANATA', label: 'AmanaTa' },
  { value: 'ESPECES', label: 'Espèces' },
  { value: 'VIREMENT', label: 'Virement bancaire' },
];

// Modes mobile money : le web exige alors le numéro de téléphone du compte
// dans le champ `reference` (champ requis du formulaire web).
export const METHODES_MOBILE_MONEY = ['MYNITA', 'AMANATA'];

export function libelleMethode(paiement) {
  return (
    paiement.methode_display ||
    METHODES_PAIEMENT.find((m) => m.value === paiement.methode)?.label ||
    paiement.methode
  );
}

// POST /api/paiements/create/ — champs attendus par PaiementCreateSerializer :
// contrat, montant, methode, reference (numero_recu généré et client dérivé
// du contrat côté serveur, statut EN_ATTENTE jusqu'à validation par un
// agent). Aucune vraie API de paiement n'est appelée, comme sur le web.
export async function creerPaiement(payload) {
  const response = await api.post('/paiements/create/', payload);
  return response.data;
}

// Messages lisibles pour les statuts renvoyés par PaiementRecuView (400 :
// paiement pas VALIDE, 401 : session expirée, 403/404 : paiement
// inaccessible ou introuvable — même portée IDOR que côté web).
const MESSAGES_RECU = {
  400: "Le reçu n'est disponible que pour un paiement validé.",
  401: 'Votre session a expiré, reconnectez-vous.',
  403: "Vous n'avez pas accès à ce paiement.",
  404: 'Paiement introuvable.',
};

export function telechargerRecu(paiement) {
  return telechargerEtPartagerPdf({
    chemin: `/paiements/${paiement.id}/recu/`,
    nomFichier: `recu_${paiement.numero_recu}.pdf`,
    messages: MESSAGES_RECU,
    messageParDefaut: 'Impossible de télécharger le reçu.',
  });
}
