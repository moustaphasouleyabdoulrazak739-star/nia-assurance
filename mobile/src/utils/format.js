// Formats d'affichage partagés par les écrans (paiements, contrats, sinistres).
//
// Montants : implémentation pure, sans toLocaleString. Hermes sur Android
// n'embarque pas toujours l'ICU complet (rendu variable, voire "9,000"), et
// Intl fr-FR produit une espace fine insécable (U+202F). On produit le même
// texte que le serveur (paiements/serializers.py:formater_fcfa) et que le web
// (frontend/src/utils/format.js) : espace normale U+0020 entre les milliers,
// centimes seulement s'il y en a.

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

/** 9000 ou '9000.00' -> '9 000 FCFA'. '' si la valeur n'est pas un nombre. */
export function formaterMontant(valeur) {
  const texte = formaterNombre(valeur);
  return texte ? `${texte} FCFA` : '';
}

export function formaterDate(dateIso) {
  if (!dateIso) return '';
  return new Date(dateIso).toLocaleDateString('fr-FR');
}

export function formaterDateHeure(dateIso) {
  if (!dateIso) return '';
  const date = new Date(dateIso);
  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${date.toLocaleDateString('fr-FR')} à ${heure}`;
}
