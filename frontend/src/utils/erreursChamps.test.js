import { describe, it, expect } from 'vitest';
import { extraireErreursChamps } from './erreursChamps';

describe('extraireErreursChamps', () => {
  it('erreur sur "montant" renvoyee par l\'API (montant different de la prime)', () => {
    const err = {
      response: {
        status: 400,
        data: { montant: ['Le montant doit être égal à la prime du contrat (150 000 FCFA).'] },
      },
    };
    expect(extraireErreursChamps(err)).toEqual({
      champs: { montant: 'Le montant doit être égal à la prime du contrat (150 000 FCFA).' },
      general: '',
    });
  });

  it('plusieurs champs en meme temps, messages multiples joints', () => {
    const err = {
      response: {
        status: 400,
        data: {
          montant: ['Un nombre valide est requis.'],
          reference: ['Le numéro de téléphone est obligatoire pour ce mode de paiement.'],
          contrat: ['Message 1.', 'Message 2.'],
        },
      },
    };
    expect(extraireErreursChamps(err).champs).toEqual({
      montant: 'Un nombre valide est requis.',
      reference: 'Le numéro de téléphone est obligatoire pour ce mode de paiement.',
      contrat: 'Message 1. Message 2.',
    });
  });

  it('erreurs sans champ (non_field_errors, detail) separees dans "general"', () => {
    const err = {
      response: { status: 400, data: { non_field_errors: ['Erreur globale.'], montant: 'Texte simple.' } },
    };
    expect(extraireErreursChamps(err)).toEqual({
      champs: { montant: 'Texte simple.' },
      general: 'Erreur globale.',
    });
    expect(extraireErreursChamps({ response: { status: 403, data: { detail: 'Interdit.' } } })).toEqual({
      champs: {},
      general: 'Interdit.',
    });
  });

  it('erreur reseau ou reponse non JSON : aucun champ, le formulaire garde son message generique', () => {
    const vide = { champs: {}, general: '' };
    expect(extraireErreursChamps(new Error('Network Error'))).toEqual(vide);
    expect(extraireErreursChamps({ response: { status: 500, data: '<html>' } })).toEqual(vide);
    expect(extraireErreursChamps({ response: { status: 400, data: ['liste'] } })).toEqual(vide);
    expect(extraireErreursChamps(undefined)).toEqual(vide);
  });
});
