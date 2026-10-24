// Tests de la logique pure de l'accueil client (src/utils/accueil.js) :
// synthèse, échéances, activité récente, date relative.
// Lanceur intégré de Node (`node --test`), aucune dépendance de test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activiteRecente,
  dateRelative,
  echeancesProches,
  extraireListe,
  libelleBoutonPrime,
  lienTelephone,
  listeDepuisResultat,
  nomClient,
  syntheseAccueil,
  titreEcheance,
  valeurCarte,
} from '../src/utils/accueil.js';
import { joursAvantEcheance } from '../src/utils/dates.js';

// Référence fixe (heure locale) : tests indépendants du jour d'exécution.
const REFERENCE = new Date(2026, 9, 24, 15, 30);

// Date "AAAA-MM-JJ" (comme un DateField Django) à N jours de REFERENCE.
function dansJours(n) {
  const d = new Date(REFERENCE);
  d.setDate(d.getDate() + n);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const jj = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${jj}`;
}

// Horodatage ISO à N jours avant REFERENCE, à l'heure donnée (locale).
function ilYa(n, heure = 10) {
  const d = new Date(REFERENCE);
  d.setDate(d.getDate() - n);
  d.setHours(heure, 0, 0, 0);
  return d.toISOString();
}

const contrat = (id, statut, finDansJours, prime = 9000) => ({
  id,
  numero_contrat: `CTR-${id}`,
  type_assurance_display: 'Assurance Auto',
  statut,
  date_fin: dansJours(finDansJours),
  montant_prime: String(prime),
});

test('extraireListe : tableau, réponse paginée, forme inattendue', () => {
  assert.deepEqual(extraireListe([1, 2]), [1, 2]);
  assert.deepEqual(extraireListe({ count: 2, next: null, results: [1, 2] }), [1, 2]);
  assert.equal(extraireListe(undefined), null);
  assert.equal(extraireListe({ detail: 'Erreur' }), null);
  assert.equal(extraireListe('<html>'), null);
});

test('listeDepuisResultat : requête échouée -> null, réussie -> liste', () => {
  assert.deepEqual(listeDepuisResultat({ status: 'fulfilled', value: [] }), []);
  assert.deepEqual(listeDepuisResultat({ status: 'fulfilled', value: { results: [3] } }), [3]);
  assert.equal(listeDepuisResultat({ status: 'rejected', reason: new Error('x') }), null);
});

test('syntheseAccueil : comptes par statut', () => {
  const s = syntheseAccueil({
    contrats: [{ statut: 'ACTIF' }, { statut: 'ACTIF' }, { statut: 'EXPIRE' }, { statut: 'SUSPENDU' }],
    paiements: [{ statut: 'EN_ATTENTE' }, { statut: 'VALIDE' }, { statut: 'ECHOUE' }],
    sinistres: [
      { statut: 'EN_ATTENTE' },
      { statut: 'EN_COURS' },
      { statut: 'APPROUVE' },
      { statut: 'REJETE' },
      { statut: 'REGLE' },
    ],
  });
  assert.deepEqual(s, { contratsActifs: 2, paiementsEnAttente: 1, sinistresEnCours: 2 });
});

test('syntheseAccueil : listes vides -> 0, listes en échec -> null', () => {
  assert.deepEqual(syntheseAccueil({ contrats: [], paiements: [], sinistres: [] }), {
    contratsActifs: 0,
    paiementsEnAttente: 0,
    sinistresEnCours: 0,
  });
  assert.deepEqual(syntheseAccueil({ contrats: null, paiements: [], sinistres: null }), {
    contratsActifs: null,
    paiementsEnAttente: 0,
    sinistresEnCours: null,
  });
});

test('valeurCarte : "?" pour une valeur inconnue, 0 affiché', () => {
  assert.equal(valeurCarte(0), '0');
  assert.equal(valeurCarte(12), '12');
  assert.equal(valeurCarte(null), '?');
  assert.equal(valeurCarte(undefined), '?');
});

test('joursAvantEcheance : date AAAA-MM-JJ lue en heure locale, date illisible', () => {
  assert.equal(joursAvantEcheance(dansJours(0), REFERENCE), 0);
  assert.equal(joursAvantEcheance(dansJours(30), REFERENCE), 30);
  assert.equal(joursAvantEcheance(dansJours(-1), REFERENCE), -1);
  assert.equal(joursAvantEcheance('pas une date', REFERENCE), null);
  assert.equal(joursAvantEcheance(null, REFERENCE), null);
});

test('echeancesProches : seuil 0 et 30 jours inclus, 31 exclu, expiré exclu', () => {
  const contrats = [
    contrat(1, 'ACTIF', 0),
    contrat(2, 'ACTIF', 30),
    contrat(3, 'ACTIF', 31),
    contrat(4, 'ACTIF', -1),
    contrat(5, 'EXPIRE', 10),
    contrat(6, 'SUSPENDU', 5),
  ];
  const ids = echeancesProches(contrats, [], REFERENCE).map((e) => e.contrat.id);
  assert.deepEqual(ids, [1, 2]);
});

test("echeancesProches : la plus proche d'abord, au plus 3", () => {
  const contrats = [contrat(1, 'ACTIF', 20), contrat(2, 'ACTIF', 3), contrat(3, 'ACTIF', 12), contrat(4, 'ACTIF', 7)];
  const resultat = echeancesProches(contrats, [], REFERENCE);
  assert.deepEqual(
    resultat.map((e) => [e.contrat.id, e.jours]),
    [
      [2, 3],
      [4, 7],
      [3, 12],
    ],
  );
});

test('echeancesProches : paiement en attente détecté (contrat imbriqué ou id)', () => {
  const contrats = [contrat(1, 'ACTIF', 5), contrat(2, 'ACTIF', 6), contrat(3, 'ACTIF', 7)];
  const paiements = [
    { statut: 'EN_ATTENTE', contrat: { id: 1 } },
    { statut: 'EN_ATTENTE', contrat: 2 },
    { statut: 'VALIDE', contrat: { id: 3 } },
  ];
  const parId = Object.fromEntries(
    echeancesProches(contrats, paiements, REFERENCE).map((e) => [e.contrat.id, e.paiementEnAttente]),
  );
  assert.deepEqual(parId, { 1: true, 2: true, 3: false });
});

test('echeancesProches : listes vides ou en échec', () => {
  assert.deepEqual(echeancesProches([], [], REFERENCE), []);
  assert.deepEqual(echeancesProches(null, null, REFERENCE), []);
  // Paiements inconnus : le bouton reste proposé, le serveur tranchera.
  const [e] = echeancesProches([contrat(1, 'ACTIF', 5)], null, REFERENCE);
  assert.equal(e.paiementEnAttente, false);
});

test('titreEcheance et libelleBoutonPrime', () => {
  assert.equal(titreEcheance(0), "Échéance aujourd'hui");
  assert.equal(titreEcheance(1), 'Échéance demain');
  assert.equal(titreEcheance(30), 'Échéance dans 30 jours');
  assert.equal(libelleBoutonPrime({ montant_prime: '150000.00' }), 'Payer ma prime, 150 000 FCFA');
  assert.equal(libelleBoutonPrime({}), 'Payer ma prime');
});

test('activiteRecente : tri décroissant tous types confondus, limite à 3', () => {
  const resultat = activiteRecente({
    paiements: [
      { id: 1, montant: '9000', statut_display: 'En attente', contrat: { numero_contrat: 'CTR-1' }, date_paiement: ilYa(5) },
      { id: 2, montant: '5000', statut_display: 'Validé', contrat: { numero_contrat: 'CTR-1' }, date_paiement: ilYa(0) },
    ],
    sinistres: [
      { id: 7, numero_sinistre: 'SIN-7', type_sinistre_display: 'Vol', statut_display: 'En cours', date_declaration: ilYa(2) },
    ],
    demandes: [{ id: 3, numero_demande: 'DEM-3', type_assurance: 'AUTO', statut: 'EN_ATTENTE', date_demande: ilYa(1) }],
  });
  assert.deepEqual(
    resultat.map((e) => e.cle),
    ['paiement-2', 'demande-3', 'sinistre-7'],
  );
  assert.equal(resultat[0].titre, 'Paiement de 5 000 FCFA');
  assert.equal(resultat[0].detail, 'Validé · contrat CTR-1');
  assert.equal(resultat[1].titre, 'Demande de contrat : Assurance Auto');
  assert.equal(resultat[1].detail, 'DEM-3 · En attente');
  assert.equal(resultat[2].titre, 'Sinistre déclaré : Vol');
  assert.equal(resultat[2].detail, 'SIN-7 · En cours');
});

test('activiteRecente : listes vides, en échec, dates absentes ignorées', () => {
  assert.deepEqual(activiteRecente({ paiements: [], sinistres: [], demandes: [] }), []);
  assert.deepEqual(activiteRecente({ paiements: null, sinistres: null, demandes: null }), []);
  const resultat = activiteRecente({
    paiements: null,
    sinistres: [
      { id: 1, date_declaration: null },
      { id: 2, date_declaration: 'n/a' },
    ],
    demandes: [{ id: 4, type_assurance: 'VIE', statut: 'VALIDEE', date_demande: ilYa(3) }],
  });
  assert.deepEqual(
    resultat.map((e) => e.cle),
    ['demande-4'],
  );
});

test("dateRelative : aujourd'hui, hier, il y a N jours, puis la date", () => {
  assert.equal(dateRelative(ilYa(0, 1), REFERENCE), "Aujourd'hui");
  assert.equal(dateRelative(ilYa(1, 23), REFERENCE), 'Hier');
  assert.equal(dateRelative(ilYa(3), REFERENCE), 'Il y a 3 jours');
  assert.equal(dateRelative(ilYa(6), REFERENCE), 'Il y a 6 jours');
  assert.match(dateRelative(ilYa(7), REFERENCE), /^\d{2}\/\d{2}\/\d{4}$/);
  assert.equal(dateRelative(null, REFERENCE), '');
  assert.equal(dateRelative('abc', REFERENCE), '');
});

test("nomClient : profil client, repli sur l'utilisateur connecté", () => {
  assert.equal(nomClient({ user: { prenom: 'Awa', nom: 'Issa' } }, { prenom: 'X', nom: 'Y' }), 'Awa Issa');
  assert.equal(nomClient(null, { prenom: 'Moussa', nom: '' }), 'Moussa');
  assert.equal(nomClient(null, null), '');
});

test('lienTelephone : vide si non configuré, chiffres et + conservés', () => {
  assert.equal(lienTelephone(''), '');
  assert.equal(lienTelephone(undefined), '');
  assert.equal(lienTelephone('+227 20 00 00 00'), 'tel:+22720000000');
  assert.equal(lienTelephone('20 00-00 00'), 'tel:20000000');
});
