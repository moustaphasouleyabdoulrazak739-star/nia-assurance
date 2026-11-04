// Logique pure de l'écran d'accueil client : sans import Expo ni React
// Native, pour pouvoir être testée avec `node --test`
// (mobile/tests/accueil.test.mjs).
//
// Toutes les valeurs sont calculées côté mobile à partir des listes déjà
// exposées par l'API (contrats, paiements, sinistres, demandes), sans
// endpoint dédié. Convention : une liste `null` signifie "chargement
// échoué" (valeur inconnue, affichée "?"), une liste vide signifie "rien".

import { estEcheanceProche, joursAvantEcheance } from './dates.js';
import { formaterDate, formaterMontant } from './format.js';
import { idsContratsEnAttente } from './paiements.js';
import { libelleStatut, libelleTypeAssurance } from './demandes.js';

export const SEUIL_ECHEANCE_JOURS = 30;
export const NB_ACTIVITES_RECENTES = 3;
// Au-delà, l'accueil deviendrait une liste de contrats : les suivants
// restent visibles (badge "Échéance proche") dans l'onglet Contrats.
export const NB_ECHEANCES_MAX = 3;

// Sinistres encore à traiter par NIA (Sinistre.STATUT_CHOICES).
const STATUTS_SINISTRE_EN_COURS = ['EN_ATTENTE', 'EN_COURS'];

// Les vues de liste utilisées ne paginent pas (pas de pagination DRF
// globale, cf. settings.py) : elles renvoient un tableau. Une réponse
// paginée ({count, results}) est quand même acceptée (première page), et
// toute autre forme est traitée comme un échec de chargement.
export function extraireListe(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return null;
}

// Résultat d'un Promise.allSettled -> liste, ou null si la requête a
// échoué (ou a renvoyé une forme inattendue).
export function listeDepuisResultat(resultat) {
  return resultat?.status === 'fulfilled' ? extraireListe(resultat.value) : null;
}

function compter(liste, filtre) {
  return Array.isArray(liste) ? liste.filter(filtre).length : null;
}

// Les trois cartes de synthèse. La troisième carte suit les sinistres en
// cours plutôt que les demandes : un sinistre ouvert attend une
// indemnisation, c'est ce que le client vient le plus vérifier, alors
// qu'une demande de contrat est ponctuelle (elle apparaît de toute façon
// dans l'activité récente et via l'action rapide).
export function syntheseAccueil({ contrats, paiements, sinistres }) {
  return {
    contratsActifs: compter(contrats, (c) => c?.statut === 'ACTIF'),
    paiementsEnAttente: compter(paiements, (p) => p?.statut === 'EN_ATTENTE'),
    sinistresEnCours: compter(sinistres, (s) => STATUTS_SINISTRE_EN_COURS.includes(s?.statut)),
  };
}

/** Valeur affichée sur une carte : "?" si inconnue (chargement échoué). */
export function valeurCarte(nombre) {
  return Number.isInteger(nombre) ? String(nombre) : '?';
}

// Contrats ACTIF dont la fin tombe dans les 30 jours (même règle que le
// badge "Échéance proche" de l'onglet Contrats, utils/dates.js), le plus
// proche d'abord. `paiementEnAttente` : un paiement EN_ATTENTE existe déjà
// pour ce contrat (le serveur refuserait un second paiement). Paiements
// inconnus (null) : false, le serveur garde le dernier mot.
export function echeancesProches(contrats, paiements, reference = new Date()) {
  if (!Array.isArray(contrats)) return [];
  const enAttente = idsContratsEnAttente(Array.isArray(paiements) ? paiements : []);
  return contrats
    .filter((c) => estEcheanceProche(c, SEUIL_ECHEANCE_JOURS, reference))
    .map((contrat) => ({
      contrat,
      jours: joursAvantEcheance(contrat.date_fin, reference),
      paiementEnAttente: enAttente.has(String(contrat.id)),
    }))
    .sort((a, b) => a.jours - b.jours)
    .slice(0, NB_ECHEANCES_MAX);
}

export function titreEcheance(jours) {
  if (jours === 0) return "Échéance aujourd'hui";
  if (jours === 1) return 'Échéance demain';
  return `Échéance dans ${jours} jours`;
}

export function libelleBoutonPrime(contrat) {
  const montant = formaterMontant(contrat?.montant_prime);
  return montant ? `Payer ma prime, ${montant}` : 'Payer ma prime';
}

function dateValide(valeur) {
  if (!valeur) return null;
  const date = new Date(valeur);
  return Number.isNaN(date.getTime()) ? null : date;
}

function evenementPaiement(p) {
  const montant = formaterMontant(p.montant);
  const contrat = p.contrat?.numero_contrat;
  return {
    cle: `paiement-${p.id}`,
    type: 'paiement',
    titre: montant ? `Paiement de ${montant}` : 'Paiement',
    detail: [p.statut_display || p.statut, contrat && `contrat ${contrat}`].filter(Boolean).join(' · '),
    date: p.date_paiement,
    element: p,
  };
}

function evenementSinistre(s) {
  const type = s.type_sinistre_display || s.type_sinistre;
  return {
    cle: `sinistre-${s.id}`,
    type: 'sinistre',
    titre: type ? `Sinistre déclaré : ${type}` : 'Sinistre déclaré',
    detail: [s.numero_sinistre, s.statut_display || s.statut].filter(Boolean).join(' · '),
    date: s.date_declaration,
    element: s,
  };
}

function evenementDemande(d) {
  return {
    cle: `demande-${d.id}`,
    type: 'demande',
    titre: `Demande de contrat : ${libelleTypeAssurance(d)}`,
    detail: [d.numero_demande, libelleStatut(d)].filter(Boolean).join(' · '),
    date: d.date_demande,
    element: d,
  };
}

// Les N derniers événements (paiements, sinistres, demandes), du plus
// récent au plus ancien, d'après leur date de création. Une liste en échec
// (null) est simplement ignorée ; un élément sans date lisible aussi.
export function activiteRecente({ paiements, sinistres, demandes }, limite = NB_ACTIVITES_RECENTES) {
  const evenements = [
    ...(Array.isArray(paiements) ? paiements.map(evenementPaiement) : []),
    ...(Array.isArray(sinistres) ? sinistres.map(evenementSinistre) : []),
    ...(Array.isArray(demandes) ? demandes.map(evenementDemande) : []),
  ];
  return evenements
    .map((e) => ({ ...e, horodatage: dateValide(e.date)?.getTime() }))
    .filter((e) => e.horodatage !== undefined)
    .sort((a, b) => b.horodatage - a.horodatage)
    .slice(0, limite);
}

function debutDuJour(date) {
  const jour = new Date(date);
  jour.setHours(0, 0, 0, 0);
  return jour;
}

// "Aujourd'hui", "Hier", "Il y a N jours" (moins d'une semaine), puis la
// date. Comparaison par jour calendaire local, pas par tranches de 24 h.
// Date future (horloge du téléphone en retard) : "Aujourd'hui" si c'est le
// même jour, sinon la date.
export function dateRelative(valeur, reference = new Date()) {
  const date = dateValide(valeur);
  if (!date) return '';
  const jours = Math.round((debutDuJour(reference) - debutDuJour(date)) / (1000 * 60 * 60 * 24));
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return 'Hier';
  if (jours > 1 && jours < 7) return `Il y a ${jours} jours`;
  return formaterDate(valeur);
}

// Prénom et nom du client : profil GET /api/clients/me/ ({user: {prenom,
// nom}}), à défaut l'utilisateur du contexte d'authentification.
export function nomClient(profil, user) {
  const source = profil?.user || user || {};
  return `${source.prenom ?? ''} ${source.nom ?? ''}`.trim();
}

// Lien d'appel pour Linking.openURL : chiffres et "+" initial seulement,
// '' si aucun numéro n'est configuré (le bloc "Besoin d'aide ?" est alors
// masqué).
export function lienTelephone(numero) {
  const brut = String(numero ?? '').trim();
  const chiffres = brut.replace(/[^\d]/g, '');
  if (!chiffres) return '';
  return `tel:${brut.startsWith('+') ? '+' : ''}${chiffres}`;
}
