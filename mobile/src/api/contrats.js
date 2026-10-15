import api from './client';
import { telechargerEtPartagerPdf } from './telechargement';

// GET /api/contrats/ — le backend filtre déjà par rôle (un CLIENT ne voit
// que ses propres contrats, cf. contrats/views.py:ContratListView).
export async function fetchContrats() {
  const response = await api.get('/contrats/');
  return response.data;
}

// Messages lisibles pour les statuts renvoyés par ContratAttestationView
// (400 : contrat pas ACTIF, 401 : token expiré, 403/404 : contrat
// inaccessible ou introuvable — même portée IDOR que côté web).
const MESSAGES_PAR_STATUT = {
  400: "L'attestation n'est disponible que pour un contrat actif.",
  401: 'Votre session a expiré, reconnectez-vous.',
  403: "Vous n'avez pas accès à ce contrat.",
  404: 'Contrat introuvable.',
};

// Télécharge l'attestation PDF d'un contrat ACTIF puis ouvre la feuille de
// partage native. Passe par telechargerEtPartagerPdf (expo-file-system/legacy,
// voir api/telechargement.js) qui rafraîchit le jeton d'accès sur un 401 :
// sans ça, l'attestation échouait en "session expirée" au-delà de 30 min
// d'inactivité alors que le refresh token était encore valide.
export function telechargerAttestation(contrat) {
  return telechargerEtPartagerPdf({
    chemin: `/contrats/${contrat.id}/attestation/`,
    nomFichier: `attestation_${contrat.numero_contrat}.pdf`,
    messages: MESSAGES_PAR_STATUT,
    messageParDefaut: "Impossible de télécharger l'attestation.",
  });
}
