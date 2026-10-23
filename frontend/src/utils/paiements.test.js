import { describe, it, expect } from 'vitest';
import { libelleMontant } from './paiements';

describe('libelleMontant', () => {
  it('"Montant payé" uniquement pour un paiement validé', () => {
    expect(libelleMontant('VALIDE')).toBe('Montant payé');
  });

  it('libellés des autres statuts', () => {
    expect(libelleMontant('EN_ATTENTE')).toBe('En attente de validation');
    expect(libelleMontant('ECHOUE')).toBe('Montant (paiement échoué)');
    expect(libelleMontant('REMBOURSE')).toBe('Montant remboursé');
  });

  it('statut inconnu ou absent : libellé neutre', () => {
    for (const statut of ['INCONNU', undefined, null, '']) {
      expect(libelleMontant(statut)).toBe('Montant');
      expect(libelleMontant(statut)).not.toBe('Montant payé');
    }
  });
});
