// Formats d'affichage partagés par les écrans paiements — mêmes conventions
// que le web (toLocaleString / toLocaleDateString en fr-FR).

export function formaterMontant(montant) {
  return `${Number(montant).toLocaleString('fr-FR')} FCFA`;
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
