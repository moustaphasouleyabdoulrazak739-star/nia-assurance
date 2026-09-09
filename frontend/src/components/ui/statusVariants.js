// Mappe chaque statut métier vers un variant sémantique de <Badge/>,
// centralisé ici pour rester cohérent sur Contrats / Sinistres / Paiements /
// Demandes de contrat.

export const CONTRAT_STATUS_VARIANTS = {
  ACTIF: 'success',
  EXPIRE: 'neutral',
  SUSPENDU: 'warning',
  RESILIE: 'danger',
};

export const SINISTRE_STATUS_VARIANTS = {
  EN_ATTENTE: 'warning',
  EN_COURS: 'info',
  APPROUVE: 'success',
  REJETE: 'danger',
  REGLE: 'neutral',
};

export const PAIEMENT_STATUS_VARIANTS = {
  EN_ATTENTE: 'warning',
  VALIDE: 'success',
  ECHOUE: 'danger',
  REMBOURSE: 'neutral',
};

export const DEMANDE_STATUS_VARIANTS = {
  EN_ATTENTE: 'warning',
  VALIDEE: 'success',
  REJETEE: 'danger',
};
