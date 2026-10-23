import { describe, it, expect } from 'vitest';
import { formaterMontant, formaterNombre } from './format';

describe('formaterMontant', () => {
  it('zéro et petits montants sans séparateur', () => {
    expect(formaterMontant(0)).toBe('0 FCFA');
    expect(formaterMontant(900)).toBe('900 FCFA');
  });

  it('espace normale (U+0020) comme séparateur de milliers, comme le serveur', () => {
    expect(formaterMontant(9000)).toBe('9 000 FCFA');
    expect(formaterMontant(1234567)).toBe('1 234 567 FCFA');
    expect(formaterMontant(9000)).not.toMatch(/[\u202F\u00A0,]/);
  });

  it('chaîne décimale renvoyée par DRF', () => {
    expect(formaterMontant('9000.00')).toBe('9 000 FCFA');
    expect(formaterMontant('150000.00')).toBe('150 000 FCFA');
  });

  it('centimes affichés seulement s\'il y en a, virgule décimale', () => {
    expect(formaterMontant(1234.5)).toBe('1 234,50 FCFA');
    expect(formaterMontant('9000.05')).toBe('9 000,05 FCFA');
    expect(formaterMontant(0.004)).toBe('0 FCFA');
  });

  it('montant négatif', () => {
    expect(formaterMontant(-1500)).toBe('-1 500 FCFA');
  });

  it('valeur absente ou invalide : chaîne vide', () => {
    expect(formaterMontant(null)).toBe('');
    expect(formaterMontant(undefined)).toBe('');
    expect(formaterMontant('')).toBe('');
    expect(formaterMontant('abc')).toBe('');
    expect(formaterMontant(Number.NaN)).toBe('');
    expect(formaterMontant(Infinity)).toBe('');
  });
});

describe('formaterNombre', () => {
  it('sans unité', () => {
    expect(formaterNombre(1234567)).toBe('1 234 567');
    expect(formaterNombre(null)).toBe('');
  });
});
