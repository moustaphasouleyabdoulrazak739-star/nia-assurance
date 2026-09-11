// Mappe chaque statut métier vers un variant sémantique de <Badge/> — miroir
// de frontend/src/components/ui/statusVariants.js, pour rester cohérent avec
// le web. Complété au fil des prochains écrans (sinistres, paiements,
// demandes).

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
