// Tests des fonctions réseau pures (src/utils/reseau.js) — lanceur intégré
// de Node (`node --test`), aucune dépendance de test ajoutée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  avecDelai,
  DelaiDepasseError,
  doitRejouerApresErreurReseau,
  estErreurReseau,
  messageErreurChargement,
  messageErreurEnvoi,
  normaliserErreurTelechargement,
} from '../src/utils/reseau.js';

const attendre = (ms, valeur) => new Promise((resoudre) => setTimeout(() => resoudre(valeur), ms));
const jamais = () => new Promise(() => {});

test('avecDelai résout avec la valeur si la promesse arrive à temps', async () => {
  assert.equal(await avecDelai(attendre(5, 'ok'), 200), 'ok');
});

test('avecDelai propage le rejet de la promesse elle-même', async () => {
  await assert.rejects(avecDelai(Promise.reject(new Error('boum')), 200), /boum/);
});

test('avecDelai rejette en DelaiDepasseError et appelle surDepassement', async () => {
  let annule = false;
  await assert.rejects(
    avecDelai(jamais(), 20, async () => {
      annule = true;
    }),
    (err) => err instanceof DelaiDepasseError && err.code === 'ETIMEDOUT',
  );
  assert.equal(annule, true);
});

test('avecDelai rejette même si surDepassement échoue', async () => {
  await assert.rejects(
    avecDelai(jamais(), 20, () => {
      throw new Error('annulation impossible');
    }),
    DelaiDepasseError,
  );
});

test("avecDelai n'appelle pas surDepassement quand la promesse arrive à temps", async () => {
  let annule = false;
  await avecDelai(attendre(5), 50, () => {
    annule = true;
  });
  await attendre(80);
  assert.equal(annule, false);
});

const timeoutAxios = { code: 'ECONNABORTED' };
const pasDeReseau = { code: 'ERR_NETWORK' };

test('estErreurReseau : timeout et absence de réponse oui, réponse HTTP ou annulation non', () => {
  assert.equal(estErreurReseau(timeoutAxios), true);
  assert.equal(estErreurReseau(pasDeReseau), true);
  assert.equal(estErreurReseau(new DelaiDepasseError(10)), true);
  assert.equal(estErreurReseau({ code: 'ERR_BAD_RESPONSE', response: { status: 500 } }), false);
  assert.equal(estErreurReseau({ code: 'ERR_CANCELED' }), false);
  assert.equal(estErreurReseau(undefined), false);
});

test('doitRejouerApresErreurReseau : une seule fois, GET uniquement', () => {
  assert.equal(doitRejouerApresErreurReseau({ method: 'get' }, timeoutAxios), true);
  assert.equal(doitRejouerApresErreurReseau({ method: 'GET' }, pasDeReseau), true);
  assert.equal(doitRejouerApresErreurReseau({}, pasDeReseau), true, 'méthode absente = GET (défaut axios)');
  assert.equal(
    doitRejouerApresErreurReseau({ method: 'get', _nouvelleTentativeReseau: true }, timeoutAxios),
    false,
    'déjà rejouée une fois',
  );
  for (const method of ['post', 'patch', 'put', 'delete']) {
    assert.equal(doitRejouerApresErreurReseau({ method }, timeoutAxios), false, `${method} jamais rejoué`);
  }
  assert.equal(doitRejouerApresErreurReseau({ method: 'get' }, { response: { status: 401 } }), false);
  assert.equal(doitRejouerApresErreurReseau(undefined, timeoutAxios), false);
});

test('messages : timeout, réseau absent, erreur applicative', () => {
  assert.match(messageErreurChargement(timeoutAxios, 'défaut'), /ne répond pas/);
  assert.match(messageErreurChargement(pasDeReseau, 'défaut'), /Connexion au serveur impossible/);
  assert.equal(messageErreurChargement({ response: { status: 500 } }, 'défaut'), 'défaut');
  assert.match(messageErreurEnvoi(timeoutAxios, 'défaut'), /Vérifiez la liste/);
  assert.equal(messageErreurEnvoi({ response: { status: 400 } }, 'défaut'), 'défaut');
});

test("normaliserErreurTelechargement : l'erreur native codée d'Expo devient une erreur réseau", () => {
  // Reproduit le cas constaté sur téléphone : Wi-Fi coupé pendant le
  // téléchargement du reçu, message brut affiché à l'écran.
  const native = Object.assign(new Error('failed to connect to /192.168.20.220 (port 8000)'), {
    code: 'ERR_UNABLE_TO_DOWNLOAD',
  });
  const normalisee = normaliserErreurTelechargement(native);
  assert.equal(estErreurReseau(normalisee), true);
  assert.equal(normalisee.cause, native);
  assert.match(messageErreurChargement(normalisee, 'défaut'), /Connexion au serveur impossible/);
  assert.doesNotMatch(messageErreurChargement(normalisee, 'défaut'), /192\.168/);
});

test('normaliserErreurTelechargement : un délai dépassé reste un délai dépassé', () => {
  const delai = new DelaiDepasseError(30000);
  assert.equal(normaliserErreurTelechargement(delai), delai);
  assert.match(messageErreurChargement(delai, 'défaut'), /ne répond pas/);
});
