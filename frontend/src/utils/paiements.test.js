import { describe, it, expect } from 'vitest';
import { AxiosHeaders } from 'axios';
import {
  idsContratsEnAttente,
  libelleMontant,
  marquerContratEnAttente,
  messageTropDeTentatives,
} from './paiements';

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

const erreur429 = (headers) => ({ response: { status: 429, headers, data: { detail: 'Requête ralentie.' } } });

describe('messageTropDeTentatives', () => {
  it('sans Retry-After : une minute, la fenêtre du throttle', () => {
    expect(messageTropDeTentatives(erreur429({}))).toBe(
      'Trop de tentatives de paiement. Réessayez dans une minute.',
    );
    expect(messageTropDeTentatives(erreur429(undefined))).toBe(
      'Trop de tentatives de paiement. Réessayez dans une minute.',
    );
  });

  it('Retry-After en secondes, en-têtes axios (insensibles à la casse)', () => {
    const headers = new AxiosHeaders({ 'Retry-After': '42' });
    expect(messageTropDeTentatives(erreur429(headers))).toBe(
      'Trop de tentatives de paiement. Réessayez dans 42 secondes.',
    );
    expect(messageTropDeTentatives(erreur429({ 'retry-after': '1' }))).toBe(
      'Trop de tentatives de paiement. Réessayez dans 1 seconde.',
    );
    expect(messageTropDeTentatives(erreur429({ 'retry-after': '60' }))).toContain('dans une minute.');
    expect(messageTropDeTentatives(erreur429({ 'retry-after': '61' }))).toContain('dans 2 minutes.');
  });

  it('Retry-After illisible (date HTTP, vide, négatif) : une minute', () => {
    for (const valeur of ['Wed, 21 Oct 2026 07:28:00 GMT', '', '-5', '0', 'abc']) {
      expect(messageTropDeTentatives(erreur429({ 'retry-after': valeur }))).toContain('dans une minute.');
    }
  });

  it('null pour toute autre erreur', () => {
    expect(messageTropDeTentatives({ response: { status: 400, data: {} } })).toBeNull();
    expect(messageTropDeTentatives(new Error('réseau'))).toBeNull();
    expect(messageTropDeTentatives(undefined)).toBeNull();
  });
});

describe('contrats avec un paiement en attente', () => {
  const paiements = [
    { id: 1, statut: 'EN_ATTENTE', contrat: { id: 7, numero_contrat: 'CTR-7' } },
    { id: 2, statut: 'VALIDE', contrat: { id: 8 } },
    { id: 3, statut: 'ECHOUE', contrat: { id: 9 } },
    { id: 4, statut: 'EN_ATTENTE', contrat: 10 },
  ];

  it('seuls les paiements EN_ATTENTE comptent (contrat imbriqué ou id)', () => {
    expect([...idsContratsEnAttente(paiements)].sort()).toEqual(['10', '7']);
    expect(idsContratsEnAttente(undefined).size).toBe(0);
  });

  it('marque le libellé des seuls contrats concernés', () => {
    const ids = idsContratsEnAttente(paiements);
    expect(marquerContratEnAttente('CTR-7 - AUTO', 7, ids)).toBe('CTR-7 - AUTO (paiement en attente)');
    expect(marquerContratEnAttente('CTR-8 - AUTO', '8', ids)).toBe('CTR-8 - AUTO');
    expect(marquerContratEnAttente('CTR-7 - AUTO', 7, undefined)).toBe('CTR-7 - AUTO');
  });
});
