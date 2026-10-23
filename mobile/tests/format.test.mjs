// Tests des formats d'affichage purs (src/utils/format.js et
// src/utils/paiements.js), lanceur intégré de Node (`node --test`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formaterMontant, formaterNombre } from '../src/utils/format.js';
import { libelleMontant } from '../src/utils/paiements.js';

test('formaterMontant : zéro et petits montants sans séparateur', () => {
  assert.equal(formaterMontant(0), '0 FCFA');
  assert.equal(formaterMontant(900), '900 FCFA');
});

test('formaterMontant : espace normale U+0020 entre les milliers, comme le serveur', () => {
  assert.equal(formaterMontant(9000), '9 000 FCFA');
  assert.equal(formaterMontant(1234567), '1 234 567 FCFA');
  assert.doesNotMatch(formaterMontant(1234567), /[\u202F\u00A0,]/);
});

test('formaterMontant : chaîne décimale renvoyée par DRF', () => {
  assert.equal(formaterMontant('9000.00'), '9 000 FCFA');
  assert.equal(formaterMontant('150000.00'), '150 000 FCFA');
});

test('formaterMontant : centimes seulement s\'il y en a, virgule décimale', () => {
  assert.equal(formaterMontant(1234.5), '1 234,50 FCFA');
  assert.equal(formaterMontant('9000.05'), '9 000,05 FCFA');
  assert.equal(formaterMontant(0.004), '0 FCFA');
});

test('formaterMontant : montant négatif', () => {
  assert.equal(formaterMontant(-1500), '-1 500 FCFA');
});

test('formaterMontant : valeur absente ou invalide, chaîne vide', () => {
  for (const valeur of [null, undefined, '', 'abc', Number.NaN, Infinity]) {
    assert.equal(formaterMontant(valeur), '');
  }
});

test('formaterNombre : sans unité', () => {
  assert.equal(formaterNombre(1234567), '1 234 567');
  assert.equal(formaterNombre(null), '');
});

test('libelleMontant : "Montant payé" uniquement pour un paiement validé', () => {
  assert.equal(libelleMontant('VALIDE'), 'Montant payé');
  assert.equal(libelleMontant('EN_ATTENTE'), 'En attente de validation');
  assert.equal(libelleMontant('ECHOUE'), 'Montant (paiement échoué)');
  assert.equal(libelleMontant('REMBOURSE'), 'Montant remboursé');
});

test('libelleMontant : statut inconnu ou absent, libellé neutre', () => {
  for (const statut of ['INCONNU', undefined, null, '']) {
    assert.equal(libelleMontant(statut), 'Montant');
  }
});
