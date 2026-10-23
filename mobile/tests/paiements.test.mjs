// Tests de la logique pure de l'écran de paiement (src/utils/paiements.js) :
// message 429 et marquage des contrats ayant déjà un paiement en attente.
// Lanceur intégré de Node (`node --test`), aucune dépendance de test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  idsContratsEnAttente,
  marquerContratEnAttente,
  messageTropDeTentatives,
} from '../src/utils/paiements.js';

const erreur429 = (headers) => ({ response: { status: 429, headers, data: { detail: 'Requête ralentie.' } } });

test('429 sans Retry-After : une minute, la fenêtre du throttle', () => {
  assert.equal(
    messageTropDeTentatives(erreur429({})),
    'Trop de tentatives de paiement. Réessayez dans une minute.',
  );
  assert.equal(
    messageTropDeTentatives(erreur429(undefined)),
    'Trop de tentatives de paiement. Réessayez dans une minute.',
  );
});

test('429 avec Retry-After en secondes (objet simple ou en-têtes avec get)', () => {
  assert.equal(
    messageTropDeTentatives(erreur429({ 'retry-after': '42' })),
    'Trop de tentatives de paiement. Réessayez dans 42 secondes.',
  );
  const avecGet = { get: (nom) => (nom.toLowerCase() === 'retry-after' ? '1' : undefined) };
  assert.equal(
    messageTropDeTentatives(erreur429(avecGet)),
    'Trop de tentatives de paiement. Réessayez dans 1 seconde.',
  );
  assert.match(messageTropDeTentatives(erreur429({ 'Retry-After': '60' })), /dans une minute\.$/);
  assert.match(messageTropDeTentatives(erreur429({ 'retry-after': '61' })), /dans 2 minutes\.$/);
});

test('429 avec Retry-After illisible : une minute', () => {
  for (const valeur of ['Wed, 21 Oct 2026 07:28:00 GMT', '', '-5', '0', 'abc']) {
    assert.match(messageTropDeTentatives(erreur429({ 'retry-after': valeur })), /dans une minute\.$/);
  }
});

test('messageTropDeTentatives : null pour toute autre erreur', () => {
  assert.equal(messageTropDeTentatives({ response: { status: 400, data: {} } }), null);
  assert.equal(messageTropDeTentatives({ code: 'ERR_NETWORK' }), null);
  assert.equal(messageTropDeTentatives(undefined), null);
});

const PAIEMENTS = [
  { id: 1, statut: 'EN_ATTENTE', contrat: { id: 7, numero_contrat: 'CTR-7' } },
  { id: 2, statut: 'VALIDE', contrat: { id: 8 } },
  { id: 3, statut: 'ECHOUE', contrat: { id: 9 } },
  { id: 4, statut: 'EN_ATTENTE', contrat: 10 },
];

test('idsContratsEnAttente : seuls les paiements EN_ATTENTE comptent', () => {
  assert.deepEqual([...idsContratsEnAttente(PAIEMENTS)].sort(), ['10', '7']);
  assert.equal(idsContratsEnAttente(undefined).size, 0);
});

test('marquerContratEnAttente : seuls les contrats concernés sont signalés', () => {
  const ids = idsContratsEnAttente(PAIEMENTS);
  assert.equal(marquerContratEnAttente('CTR-7 - Auto', 7, ids), 'CTR-7 - Auto (paiement en attente)');
  assert.equal(marquerContratEnAttente('CTR-8 - Auto', '8', ids), 'CTR-8 - Auto');
  assert.equal(marquerContratEnAttente('CTR-7 - Auto', 7, undefined), 'CTR-7 - Auto');
});
