// Petit helper partage (Accueil + Contrats) pour signaler une echeance de
// contrat proche, sans dupliquer le calcul de jours restants a deux endroits.

const MS_PAR_JOUR = 1000 * 60 * 60 * 24;

/** Nombre de jours entre aujourd'hui et une date (negatif si deja passee). */
export function joursAvantEcheance(dateFin) {
  if (!dateFin) return null;
  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  const echeance = new Date(dateFin);
  echeance.setHours(0, 0, 0, 0);
  return Math.round((echeance - aujourdHui) / MS_PAR_JOUR);
}

/** Contrat actif dont la date de fin tombe dans les `seuilJours` a venir. */
export function estEcheanceProche(contrat, seuilJours = 30) {
  if (!contrat || contrat.statut !== 'ACTIF') return false;
  const jours = joursAvantEcheance(contrat.date_fin);
  return jours !== null && jours >= 0 && jours <= seuilJours;
}
