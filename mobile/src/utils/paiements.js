// Libellé affiché avec le montant d'un paiement, selon son statut (valeurs
// de paiements/models.py:Paiement.STATUT_CHOICES). Même logique que le web
// (frontend/src/utils/paiements.js). "Montant payé" seulement pour un
// paiement validé : avant, l'argent n'est pas encaissé.

const LIBELLES_MONTANT = {
  VALIDE: 'Montant payé',
  EN_ATTENTE: 'En attente de validation',
  ECHOUE: 'Montant (paiement échoué)',
  REMBOURSE: 'Montant remboursé',
};

export function libelleMontant(statut) {
  return LIBELLES_MONTANT[statut] || 'Montant';
}

// Erreur 429 de POST /api/paiements/create/ (throttle 'paiement-create',
// 5/min par utilisateur) : message clair en français plutôt que le texte
// DRF. L'en-tête Retry-After (en secondes) précise le délai s'il est
// présent ; sinon on annonce une minute, la fenêtre du throttle.
// Renvoie null pour toute autre erreur. Même logique que le web
// (frontend/src/utils/paiements.js).
function lireEntete(headers, nom) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(nom);
  return headers[nom.toLowerCase()] ?? headers[nom];
}

function delaiEnTexte(secondes) {
  if (!Number.isFinite(secondes) || secondes <= 0 || secondes === 60) {
    return 'dans une minute';
  }
  if (secondes < 60) {
    return `dans ${secondes} seconde${secondes > 1 ? 's' : ''}`;
  }
  return `dans ${Math.ceil(secondes / 60)} minutes`;
}

export function messageTropDeTentatives(err) {
  if (err?.response?.status !== 429) return null;
  const brut = lireEntete(err.response.headers, 'Retry-After');
  const secondes = /^\s*\d+\s*$/.test(String(brut ?? '')) ? Number(brut) : NaN;
  return `Trop de tentatives de paiement. Réessayez ${delaiEnTexte(secondes)}.`;
}

// Contrats ayant déjà un paiement EN_ATTENTE, d'après la liste des
// paiements déjà chargée (GET /api/paiements/, contrat imbriqué ou id) :
// le serveur refuse un second paiement en attente sur le même contrat.
export function idsContratsEnAttente(paiements) {
  const ids = new Set();
  for (const paiement of paiements || []) {
    if (paiement?.statut !== 'EN_ATTENTE') continue;
    const id = paiement.contrat?.id ?? paiement.contrat;
    if (id !== undefined && id !== null) ids.add(String(id));
  }
  return ids;
}

export const MENTION_PAIEMENT_EN_ATTENTE = '(paiement en attente)';

export function marquerContratEnAttente(libelle, contratId, idsEnAttente) {
  return idsEnAttente?.has(String(contratId))
    ? `${libelle} ${MENTION_PAIEMENT_EN_ATTENTE}`
    : libelle;
}
