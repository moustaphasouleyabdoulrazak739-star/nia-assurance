// Libellé affiché sous le montant d'un paiement, selon son statut
// (valeurs de paiements/models.py:Paiement.STATUT_CHOICES). "Montant payé"
// seulement pour un paiement validé : avant, l'argent n'est pas encaissé.

const LIBELLES_MONTANT = {
  VALIDE: 'Montant payé',
  EN_ATTENTE: 'En attente de validation',
  ECHOUE: 'Montant (paiement échoué)',
  REMBOURSE: 'Montant remboursé',
};

export function libelleMontant(statut) {
  return LIBELLES_MONTANT[statut] || 'Montant';
}
