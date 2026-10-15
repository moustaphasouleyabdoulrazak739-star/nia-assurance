// Délais et nouvelle tentative réseau — fonctions pures, sans import Expo ni
// React Native, pour pouvoir être testées avec `node --test`
// (mobile/tests/reseau.test.mjs).
//
// Pourquoi : sans délai maximal, une requête partie sur une connexion
// persistante morte (Wi-Fi du téléphone en économie d'énergie, pare-feu du
// PC qui a oublié la connexion...) n'échoue qu'après de longues minutes de
// retransmissions TCP, et l'écran reste en chargement indéfiniment.

// Délai par défaut de toute requête API (instance axios de client.js et
// appel de rafraîchissement du jeton). Surchargeable par requête avec
// l'option axios standard, ex. api.post(url, data, { timeout: DELAI_ENVOI_FICHIERS_MS }).
export const DELAI_REQUETE_MS = 15000;

// Délai d'un téléchargement PDF (attestation, reçu) : le PDF est généré à
// la volée côté serveur, plus long qu'une simple lecture JSON.
export const DELAI_TELECHARGEMENT_MS = 30000;

// Réservé aux envois de pièces jointes (écran des demandes de contrat, à
// venir) — pas encore utilisé.
export const DELAI_ENVOI_FICHIERS_MS = 120000;

export const CODE_DELAI_DEPASSE = 'ETIMEDOUT';

export class DelaiDepasseError extends Error {
  constructor(ms) {
    super(`Délai de ${ms} ms dépassé`);
    this.name = 'DelaiDepasseError';
    this.code = CODE_DELAI_DEPASSE;
  }
}

// Rejette avec DelaiDepasseError si `promesse` n'est pas réglée en `ms`
// millisecondes, après avoir appelé `surDepassement` (ex. annuler le
// téléchargement en cours : un Promise.race seul le laisserait continuer en
// arrière-plan). Le minuteur est toujours nettoyé.
export function avecDelai(promesse, ms, surDepassement) {
  let minuteur;
  const depassement = new Promise((_, rejeter) => {
    minuteur = setTimeout(async () => {
      try {
        await surDepassement?.();
      } catch {
        // Annulation impossible (tâche déjà terminée...) : sans incidence,
        // c'est le dépassement de délai qui est signalé à l'appelant.
      }
      rejeter(new DelaiDepasseError(ms));
    }, ms);
  });
  return Promise.race([promesse, depassement]).finally(() => clearTimeout(minuteur));
}

// Codes d'erreur axios : ECONNABORTED (timeout, comportement par défaut),
// ETIMEDOUT (timeout avec transitional.clarifyTimeoutError), ERR_NETWORK
// (pas de réponse du tout). ERR_CANCELED (annulation volontaire) n'est
// jamais une erreur réseau à rejouer.
const CODES_DELAI = ['ECONNABORTED', CODE_DELAI_DEPASSE];

export function estDelaiDepasse(erreur) {
  return CODES_DELAI.includes(erreur?.code);
}

export function estErreurReseau(erreur) {
  if (!erreur || erreur.response || erreur.code === 'ERR_CANCELED') return false;
  return estDelaiDepasse(erreur) || erreur.code === 'ERR_NETWORK';
}

// Erreur levée par une tâche de téléchargement expo-file-system. Celle-ci
// résout avec un statut HTTP dès que le serveur répond (même 401/404) : une
// exception signifie donc toujours qu'aucune réponse n'a été reçue (Wi-Fi
// coupé, serveur injoignable). L'erreur native porte son propre code (ex.
// UnableToDownloadException) et un message technique ("failed to connect
// to /<ip>:8000") à ne jamais afficher tel quel : on la convertit en erreur
// réseau, en gardant l'originale dans `cause` pour le débogage.
export function normaliserErreurTelechargement(erreur) {
  if (estDelaiDepasse(erreur)) return erreur;
  const reseau = new Error('Téléchargement impossible : aucune réponse du serveur', { cause: erreur });
  reseau.code = 'ERR_NETWORK';
  return reseau;
}

// Une seule nouvelle tentative automatique, uniquement pour une lecture
// (GET) : rejouer un POST/PATCH/PUT/DELETE dont la réponse s'est perdue
// risquerait un paiement ou un sinistre enregistré en double.
export function doitRejouerApresErreurReseau(config, erreur) {
  if (!config || config._nouvelleTentativeReseau) return false;
  const methode = (config.method || 'get').toLowerCase();
  return methode === 'get' && estErreurReseau(erreur);
}

// Message affichable pour une erreur de chargement : distingue le serveur
// qui ne répond pas / l'absence de réseau d'une erreur applicative.
export function messageErreurChargement(erreur, messageParDefaut) {
  if (estDelaiDepasse(erreur)) {
    return 'Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.';
  }
  if (estErreurReseau(erreur)) {
    return 'Connexion au serveur impossible. Vérifiez votre connexion internet.';
  }
  return messageParDefaut;
}

// Même chose pour un envoi (POST) jamais rejoué automatiquement : la
// requête a pu être enregistrée même si la réponse s'est perdue, d'où
// l'invitation à vérifier la liste avant de recommencer.
export function messageErreurEnvoi(erreur, messageParDefaut) {
  if (estErreurReseau(erreur)) {
    return "Le serveur n'a pas répondu. Vérifiez la liste avant de réessayer : l'envoi a peut-être été enregistré.";
  }
  return messageParDefaut;
}
