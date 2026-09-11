// Miroir de frontend/src/utils/dates.js — même seuil "échéance proche" (30
// jours), pas d'équivalent côté API : le backend ne renvoie pas de champ
// dédié (cf. ContratSerializer), donc calculé ici comme côté web.

const MS_PAR_JOUR = 1000 * 60 * 60 * 24;

/** Nombre de jours entre aujourd'hui et une date (négatif si déjà passée). */
export function joursAvantEcheance(dateFin) {
  if (!dateFin) return null;
  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  const echeance = new Date(dateFin);
  echeance.setHours(0, 0, 0, 0);
  return Math.round((echeance - aujourdHui) / MS_PAR_JOUR);
}

/** Contrat actif dont la date de fin tombe dans les `seuilJours` à venir. */
export function estEcheanceProche(contrat, seuilJours = 30) {
  if (!contrat || contrat.statut !== 'ACTIF') return false;
  const jours = joursAvantEcheance(contrat.date_fin);
  return jours !== null && jours >= 0 && jours <= seuilJours;
}
