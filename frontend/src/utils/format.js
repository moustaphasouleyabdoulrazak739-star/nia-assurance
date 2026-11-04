// Format d'affichage des montants, commun à tout le site. Même rendu que
// le serveur (paiements/serializers.py:formater_fcfa) : espace normale
// (U+0020) comme séparateur de milliers, centimes seulement s'il y en a.
// Implémentation pure plutôt que toLocaleString : le rendu d'Intl dépend
// du navigateur (espace fine insécable U+202F en fr-FR, virgule en en-US).

const SEPARATEUR_MILLIERS = ' ';

/** 1234567 -> '1 234 567', 9000.5 -> '9 000,50'. '' si la valeur n'est pas un nombre. */
export function formaterNombre(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return '';
  const nombre = Number(valeur);
  if (!Number.isFinite(nombre)) return '';
  const [entier, centimes] = Math.abs(nombre).toFixed(2).split('.');
  const groupe = entier.replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATEUR_MILLIERS);
  const texte = centimes === '00' ? groupe : `${groupe},${centimes}`;
  return nombre < 0 && texte !== '0' ? `-${texte}` : texte;
}

/**
 * '2026-03-05' -> '05/03/2026'. Une date seule (DateField Django) est
 * reformatee sans passer par new Date(), qui la lirait en UTC et pourrait
 * afficher la veille. Une date-heure est affichee a la date locale.
 * '' si la valeur est vide ou illisible.
 */
export function formaterDate(valeur) {
  if (!valeur) return '';
  const jour = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(valeur));
  if (jour) return `${jour[3]}/${jour[2]}/${jour[1]}`;
  const date = new Date(valeur);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
}

/** 9000 ou '9000.00' -> '9 000 FCFA'. '' si la valeur n'est pas un nombre. */
export function formaterMontant(valeur) {
  const texte = formaterNombre(valeur);
  return texte ? `${texte} FCFA` : '';
}
