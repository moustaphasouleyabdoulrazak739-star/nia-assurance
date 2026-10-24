// Miroir de frontend/src/utils/dates.js — même seuil "échéance proche" (30
// jours), pas d'équivalent côté API : le backend ne renvoie pas de champ
// dédié (cf. ContratSerializer), donc calculé ici comme côté web.

const MS_PAR_JOUR = 1000 * 60 * 60 * 24;

// "AAAA-MM-JJ" (DateField Django) lu comme une date locale : new Date() la
// lirait en UTC, soit la veille dans un fuseau à l'ouest de Greenwich.
function lireDate(valeur) {
  const jour = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valeur));
  if (jour) return new Date(Number(jour[1]), Number(jour[2]) - 1, Number(jour[3]));
  return new Date(valeur);
}

/**
 * Nombre de jours entre aujourd'hui (ou `reference`) et une date (négatif si
 * déjà passée), null si la date est absente ou illisible.
 */
export function joursAvantEcheance(dateFin, reference = new Date()) {
  if (!dateFin) return null;
  const aujourdHui = new Date(reference);
  aujourdHui.setHours(0, 0, 0, 0);
  const echeance = lireDate(dateFin);
  if (Number.isNaN(echeance.getTime())) return null;
  echeance.setHours(0, 0, 0, 0);
  return Math.round((echeance - aujourdHui) / MS_PAR_JOUR);
}

/** Contrat actif dont la date de fin tombe dans les `seuilJours` à venir. */
export function estEcheanceProche(contrat, seuilJours = 30, reference = new Date()) {
  if (!contrat || contrat.statut !== 'ACTIF') return false;
  const jours = joursAvantEcheance(contrat.date_fin, reference);
  return jours !== null && jours >= 0 && jours <= seuilJours;
}
