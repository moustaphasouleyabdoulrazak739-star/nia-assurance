import { describe, it, expect } from 'vitest';
import { messageErreurConnexion } from './loginErrors';

describe('messageErreurConnexion', () => {
  it('message dedie, delai en secondes, lu depuis Retry-After', () => {
    const err = { response: { status: 429, headers: { 'retry-after': '49' } } };
    expect(messageErreurConnexion(err)).toBe('Trop de tentatives. Réessayez dans 49 secondes.');
  });

  it('message dedie, delai en minutes au pluriel', () => {
    const err = { response: { status: 429, headers: { 'retry-after': '120' } } };
    expect(messageErreurConnexion(err)).toBe('Trop de tentatives. Réessayez dans 2 minutes.');
  });

  it('repli sur "une minute" si Retry-After absent ou invalide', () => {
    expect(messageErreurConnexion({ response: { status: 429, headers: {} } }))
      .toBe('Trop de tentatives. Réessayez dans une minute.');
    expect(messageErreurConnexion({ response: { status: 429, headers: { 'retry-after': 'pas-un-nombre' } } }))
      .toBe('Trop de tentatives. Réessayez dans une minute.');
  });

  it('un 401 (mauvais mot de passe) garde le message habituel, jamais confondu avec le 429', () => {
    expect(messageErreurConnexion({ response: { status: 401 } })).toBe('Email ou mot de passe incorrect');
  });
});
