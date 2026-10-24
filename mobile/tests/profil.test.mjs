// Tests de la logique pure de l'écran Profil et du changement de mot de
// passe (src/utils/profil.js), lanceur intégré de Node (`node --test`).
// Les cas reprennent le contrat backend : users/serializers.py
// (ProfileUpdateSerializer, ChangePasswordSerializer), users/views.py,
// clients/serializers.py et Client.profil_complet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aDesModifications,
  CHAMPS_MODIFIABLES,
  champsManquants,
  construirePayloads,
  estProfilIncomplet,
  extraireErreursApi,
  extraireErreursMotDePasse,
  formulaireDepuis,
  MESSAGES,
  messageTropDeTentatives,
  nettoyer,
  validerChangementMotDePasse,
  validerProfil,
} from '../src/utils/profil.js';

const utilisateur = { id: 1, email: 'awa@exemple.ne', nom: 'Issa', prenom: 'Awa', telephone: '96 00 00 00', role: 'CLIENT' };
const client = {
  id: 3,
  cin: 'AB123',
  date_naissance: '1990-05-12',
  sexe: 'F',
  adresse: 'Quartier Plateau',
  ville: 'Niamey',
  profession: null,
  profil_complet: true,
};
const erreurHttp = (status, data, headers = {}) => ({ response: { status, data, headers } });

test('champs modifiables : ceux du web, jamais email, role, nom ni prénom', () => {
  assert.deepEqual(CHAMPS_MODIFIABLES, ['telephone', 'cin', 'date_naissance', 'sexe', 'adresse', 'ville', 'profession']);
  for (const interdit of ['email', 'role', 'nom', 'prenom', 'photo']) {
    assert.ok(!CHAMPS_MODIFIABLES.includes(interdit), interdit);
  }
});

test('formulaireDepuis : chaînes uniquement, null devient vide', () => {
  assert.deepEqual(formulaireDepuis(utilisateur, client), {
    telephone: '96 00 00 00',
    cin: 'AB123',
    date_naissance: '1990-05-12',
    sexe: 'F',
    adresse: 'Quartier Plateau',
    ville: 'Niamey',
    profession: '',
  });
  const vide = formulaireDepuis(null, undefined);
  assert.ok(Object.values(vide).every((v) => v === ''));
});

test('nettoyer : bords retirés, espaces internes retirés pour téléphone et CIN', () => {
  assert.equal(nettoyer('telephone', ' 96 00 00 00 '), '96000000');
  assert.equal(nettoyer('cin', ' AB 123 '), 'AB123');
  assert.equal(nettoyer('adresse', '  Rue 12, Plateau  '), 'Rue 12, Plateau');
  assert.equal(nettoyer('ville', null), '');
});

test('construirePayloads : seulement les champs modifiés, répartis par ressource', () => {
  const initial = formulaireDepuis(utilisateur, client);
  assert.deepEqual(construirePayloads(initial, { ...initial }), { utilisateur: {}, client: {} });
  assert.equal(aDesModifications(initial, { ...initial }), false);

  // Différence purement d'espaces : pas une modification.
  assert.equal(aDesModifications(initial, { ...initial, ville: ' Niamey ' }), false);
  // Le téléphone initial contient des espaces : sa forme nettoyée est comparée.
  assert.equal(aDesModifications(initial, { ...initial, telephone: '96000000' }), false);

  const form = { ...initial, telephone: '97 11 22 33', ville: ' Zinder ', profession: 'Enseignante' };
  assert.deepEqual(construirePayloads(initial, form), {
    utilisateur: { telephone: '97112233' },
    client: { ville: 'Zinder', profession: 'Enseignante' },
  });
  assert.equal(aDesModifications(initial, form), true);
});

test('construirePayloads : CIN et date vidés envoyés à null, texte vidé envoyé vide', () => {
  const initial = formulaireDepuis(utilisateur, client);
  const form = { ...initial, cin: '  ', date_naissance: '', adresse: '' };
  assert.deepEqual(construirePayloads(initial, form).client, { cin: null, date_naissance: null, adresse: '' });
});

test('validerProfil : longueurs maximales des modèles', () => {
  const ok = formulaireDepuis(utilisateur, client);
  assert.deepEqual(validerProfil(ok), {});
  const erreurs = validerProfil({
    ...ok,
    telephone: '1'.repeat(21),
    cin: 'A'.repeat(21),
    ville: 'v'.repeat(101),
    profession: 'p'.repeat(100),
  });
  assert.deepEqual(Object.keys(erreurs).sort(), ['cin', 'telephone', 'ville']);
  assert.equal(erreurs.telephone, MESSAGES.trop_long(20));
});

test('validerProfil : date de naissance au format AAAA-MM-JJ, réelle, pas future', () => {
  const ok = formulaireDepuis(utilisateur, client);
  const jour = new Date(2026, 9, 24);
  assert.equal(validerProfil({ ...ok, date_naissance: '12/05/1990' }, jour).date_naissance, MESSAGES.date_format);
  assert.equal(validerProfil({ ...ok, date_naissance: '1990-02-30' }, jour).date_naissance, MESSAGES.date_format);
  assert.equal(validerProfil({ ...ok, date_naissance: '2026-10-25' }, jour).date_naissance, MESSAGES.date_future);
  assert.equal(validerProfil({ ...ok, date_naissance: '2026-10-24' }, jour).date_naissance, undefined);
  assert.equal(validerProfil({ ...ok, date_naissance: '' }, jour).date_naissance, undefined, 'vide : autorisé');
});

test('validerProfil : sexe M, F ou vide uniquement', () => {
  const ok = formulaireDepuis(utilisateur, client);
  assert.equal(validerProfil({ ...ok, sexe: 'X' }).sexe, MESSAGES.sexe);
  assert.equal(validerProfil({ ...ok, sexe: 'M' }).sexe, undefined);
  assert.equal(validerProfil({ ...ok, sexe: '' }).sexe, undefined);
});

test('profil incomplet : profil_complet du serveur prioritaire, sinon même règle que le modèle', () => {
  assert.equal(estProfilIncomplet(client), false);
  assert.equal(estProfilIncomplet({ ...client, profil_complet: false }), true);
  // Réponse de PATCH sans profil_complet : recalcul (cin, date, sexe, adresse, ville).
  const sansIndicateur = { ...client };
  delete sansIndicateur.profil_complet;
  assert.equal(estProfilIncomplet(sansIndicateur), false);
  assert.equal(estProfilIncomplet({ ...sansIndicateur, ville: '' }), true);
  assert.equal(estProfilIncomplet({ ...sansIndicateur, profession: '' }), false, 'profession facultative');
  assert.equal(estProfilIncomplet(null), true);
});

test('champsManquants : libellés des champs exigés encore vides, dans l’ordre', () => {
  assert.deepEqual(champsManquants(client), []);
  assert.deepEqual(champsManquants({ cin: null, date_naissance: null, sexe: '', adresse: ' ', ville: 'Niamey' }), [
    'CIN',
    'Date de naissance',
    'Sexe',
    'Adresse',
  ]);
});

test('extraireErreursApi : erreurs DRF champ par champ, le reste en message général', () => {
  const err = erreurHttp(400, {
    cin: ['Un objet Client avec ce champ CIN existe déjà.'],
    date_naissance: ['La date n’a pas le bon format.', 'Autre.'],
    non_field_errors: ['Erreur globale.'],
  });
  assert.deepEqual(extraireErreursApi(err), {
    champs: { cin: 'Un objet Client avec ce champ CIN existe déjà.', date_naissance: 'La date n’a pas le bon format. Autre.' },
    general: 'Erreur globale.',
  });
  assert.deepEqual(extraireErreursApi(erreurHttp(403, { error: 'Permission refusée' })), {
    champs: {},
    general: 'Permission refusée',
  });
  assert.deepEqual(extraireErreursApi(erreurHttp(401, { detail: 'Jeton invalide.' })).general, 'Jeton invalide.');
});

test('extraireErreursApi : corps HTML jamais affiché, réponse absente sans message', () => {
  assert.deepEqual(extraireErreursApi(erreurHttp(502, '<html>Bad gateway</html>')), { champs: {}, general: '' });
  assert.deepEqual(extraireErreursApi({ code: 'ERR_NETWORK' }), { champs: {}, general: '' });
  assert.deepEqual(extraireErreursApi(undefined), { champs: {}, general: '' });
});

test('429 : message clair avec le délai Retry-After', () => {
  assert.equal(messageTropDeTentatives(erreurHttp(400, {})), null);
  assert.equal(messageTropDeTentatives(erreurHttp(429, {}, {})), 'Trop de tentatives. Réessayez dans une minute.');
  assert.equal(
    messageTropDeTentatives(erreurHttp(429, {}, { 'retry-after': '1' })),
    'Trop de tentatives. Réessayez dans 1 seconde.',
  );
  assert.equal(
    messageTropDeTentatives(erreurHttp(429, {}, { 'retry-after': '45' })),
    'Trop de tentatives. Réessayez dans 45 secondes.',
  );
  assert.equal(
    messageTropDeTentatives(erreurHttp(429, {}, { get: () => '125' })),
    'Trop de tentatives. Réessayez dans 3 minutes.',
  );
  assert.deepEqual(extraireErreursMotDePasse(erreurHttp(429, { detail: 'Requête ralentie.' }, {})), {
    champs: {},
    general: 'Trop de tentatives. Réessayez dans une minute.',
  });
});

test('validerChangementMotDePasse : champs obligatoires, longueur, confirmation', () => {
  assert.deepEqual(validerChangementMotDePasse({}), {
    old_password: MESSAGES.mdp_requis,
    new_password: MESSAGES.mdp_requis,
    new_password2: MESSAGES.mdp_requis,
  });
  assert.deepEqual(
    validerChangementMotDePasse({ old_password: 'ancien', new_password: 'court', new_password2: 'court' }),
    { new_password: MESSAGES.mdp_court },
  );
  assert.deepEqual(
    validerChangementMotDePasse({ old_password: 'ancien', new_password: '12345678', new_password2: '12345678' }),
    { new_password: MESSAGES.mdp_numerique },
  );
  assert.deepEqual(
    validerChangementMotDePasse({ old_password: 'Sahel2026!', new_password: 'Sahel2026!', new_password2: 'Sahel2026!' }),
    { new_password: MESSAGES.mdp_identique },
  );
  assert.deepEqual(
    validerChangementMotDePasse({ old_password: 'ancien', new_password: 'Sahel2026!', new_password2: 'Sahel2026?' }),
    { new_password2: MESSAGES.mdp_confirmation },
  );
  assert.deepEqual(
    validerChangementMotDePasse({ old_password: 'ancien', new_password: 'Sahel2026!', new_password2: 'Sahel2026!' }),
    {},
  );
});

test('extraireErreursMotDePasse : ancien mot de passe incorrect rattaché au champ', () => {
  assert.deepEqual(extraireErreursMotDePasse(erreurHttp(400, { error: 'Ancien mot de passe incorrect' })), {
    champs: { old_password: MESSAGES.ancien_incorrect },
    general: '',
  });
  const validateurs = erreurHttp(400, {
    new_password: ['Ce mot de passe est trop courant.', 'Ce mot de passe est entièrement numérique.'],
  });
  assert.deepEqual(extraireErreursMotDePasse(validateurs), {
    champs: { new_password: 'Ce mot de passe est trop courant. Ce mot de passe est entièrement numérique.' },
    general: '',
  });
});
