// Logique pure des demandes de contrat : sans import Expo ni React Native,
// pour pouvoir être testée avec `node --test` (mobile/tests/demandes.test.mjs).
//
// Miroir du contrat backend (demandes/constants.py, demandes/validators.py,
// demandes/serializers.py) et de frontend/src/constants/demandes.js. Ces
// contrôles ne servent qu'à donner un retour immédiat à l'utilisateur : le
// serveur refait toutes les vérifications et reste l'autorité.

export const TYPES_ASSURANCE = [
  { value: 'AUTO', label: 'Assurance Auto' },
  { value: 'SANTE', label: 'Assurance Santé' },
  { value: 'HABITATION', label: 'Assurance Habitation' },
  { value: 'VIE', label: 'Assurance Vie' },
];

// Un champ multipart par type de document (CHAMP_PAR_TYPE_DOCUMENT côté
// backend). requis: true -> obligatoire ; 'un_de' -> au moins un des
// champs 'un_de' du type est obligatoire (titre de propriété OU bail).
export const DOCUMENTS_PAR_TYPE = {
  AUTO: [
    { champ: 'piece_identite', label: "Pièce d'identité", requis: true },
    { champ: 'carte_grise', label: 'Carte grise', requis: true },
  ],
  HABITATION: [
    { champ: 'piece_identite', label: "Pièce d'identité", requis: true },
    { champ: 'titre_propriete', label: 'Titre de propriété', requis: 'un_de' },
    { champ: 'bail', label: 'Bail (contrat de location)', requis: 'un_de' },
  ],
  SANTE: [{ champ: 'piece_identite', label: "Pièce d'identité", requis: true }],
  VIE: [{ champ: 'piece_identite', label: "Pièce d'identité", requis: true }],
};

// demandes/validators.py : ALLOWED_CONTENT_TYPES et MAX_UPLOAD_SIZE (5 Mo,
// au sens 5 * 1024 * 1024 octets, limite incluse).
export const TYPES_MIME_AUTORISES = ['application/pdf', 'image/jpeg', 'image/png'];
export const TAILLE_MAX_OCTETS = 5 * 1024 * 1024;

// Même liste que l'attribut accept du formulaire web.
const MIME_PAR_EXTENSION = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};
const EXTENSION_PAR_MIME = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png' };

// Alias rencontrés sur certains appareils pour un vrai JPEG.
const ALIAS_MIME = { 'image/jpg': 'image/jpeg', 'image/pjpeg': 'image/jpeg' };

// MIME génériques qui ne disent rien du contenu : on se rabat alors sur
// l'extension du nom de fichier.
const MIME_GENERIQUES = ['', 'application/octet-stream', 'binary/octet-stream'];

// Messages identiques à ceux du serveur, pour un affichage cohérent que
// l'erreur vienne du contrôle local ou de la réponse API.
export const MESSAGES = {
  tailleMax: 'Le fichier dépasse la taille maximale autorisée (5 Mo).',
  format: 'Format de fichier non autorisé (PDF, JPG ou PNG uniquement).',
  obligatoire: "Ce document est obligatoire pour ce type d'assurance.",
  unDe: 'Au moins un des justificatifs demandés (titre de propriété ou bail) est obligatoire.',
  typeObligatoire: "Choisissez le type d'assurance.",
};

export function documentsPourType(typeAssurance) {
  return DOCUMENTS_PAR_TYPE[typeAssurance] || [];
}

export function extensionDe(nom) {
  const match = /\.([A-Za-z0-9]+)$/.exec(nom || '');
  return match ? match[1].toLowerCase() : '';
}

// Type MIME à annoncer au serveur pour un fichier choisi, ou null s'il
// n'est pas autorisé. Le MIME déclaré par le sélecteur prime ; à défaut (ou
// s'il est générique), on le déduit de l'extension. Un MIME explicite non
// autorisé (ex. image/heic) n'est jamais "corrigé" par l'extension.
export function resoudreTypeMime(fichier) {
  const brut = String(fichier?.mimeType || '').toLowerCase().split(';')[0].trim();
  const mime = ALIAS_MIME[brut] || brut;
  const ext = extensionDe(fichier?.name);
  if (MIME_GENERIQUES.includes(mime)) {
    return MIME_PAR_EXTENSION[ext] || null;
  }
  if (!TYPES_MIME_AUTORISES.includes(mime)) return null;
  // Extension présente mais incohérente avec la liste autorisée (ex.
  // "scan.heic" annoncé image/jpeg) : refusé comme le ferait le web.
  if (ext && !MIME_PAR_EXTENSION[ext]) return null;
  return mime;
}

// Nom envoyé dans la partie multipart : le serveur ne garde que
// l'extension (nom aléatoire, cf. nia_assurance/utils.py), elle doit donc
// correspondre au type annoncé.
export function nomPourEnvoi(fichier, mime) {
  const attendue = EXTENSION_PAR_MIME[mime];
  const nom = (fichier?.name || 'document').replace(/[/\\]/g, '_');
  const ext = extensionDe(nom);
  if (!attendue || MIME_PAR_EXTENSION[ext] === mime) return nom;
  return `${nom}.${attendue}`;
}

// Message d'erreur pour un fichier choisi, ou null s'il est acceptable.
// Taille inconnue : on laisse trancher le serveur plutôt que de bloquer.
export function validerFichier(fichier) {
  if (!fichier) return null;
  if (typeof fichier.size === 'number' && fichier.size > TAILLE_MAX_OCTETS) {
    return MESSAGES.tailleMax;
  }
  if (!resoudreTypeMime(fichier)) return MESSAGES.format;
  return null;
}

// Rejoue DemandeContratCreateSerializer.validate : documents obligatoires,
// groupe "un_de", type et taille de chaque fichier. Renvoie un objet
// {champ: message} (vide si tout est bon), mêmes clés que le serveur.
export function validerDemande(typeAssurance, fichiers = {}) {
  const erreurs = {};
  if (!DOCUMENTS_PAR_TYPE[typeAssurance]) {
    erreurs.type_assurance = MESSAGES.typeObligatoire;
    return erreurs;
  }
  let groupeRequis = false;
  let groupeFourni = false;
  for (const doc of documentsPourType(typeAssurance)) {
    const fichier = fichiers[doc.champ];
    if (doc.requis === 'un_de') {
      groupeRequis = true;
      if (fichier) groupeFourni = true;
    }
    if (fichier) {
      const message = validerFichier(fichier);
      if (message) erreurs[doc.champ] = message;
    } else if (doc.requis === true) {
      erreurs[doc.champ] = MESSAGES.obligatoire;
    }
  }
  if (groupeRequis && !groupeFourni) erreurs.documents = MESSAGES.unDe;
  return erreurs;
}

// Parties du formulaire multipart, dans l'ordre : [nom, valeur]. Seuls les
// documents attendus pour le type choisi sont envoyés (le serveur
// enregistrerait sinon aussi un document hors sujet, ex. une carte grise
// restée sélectionnée avant de passer à "Santé"). Une valeur fichier a la
// forme {uri, name, type} attendue par le FormData de React Native.
export function partiesFormulaire(typeAssurance, fichiers = {}) {
  const parties = [['type_assurance', typeAssurance]];
  for (const doc of documentsPourType(typeAssurance)) {
    const fichier = fichiers[doc.champ];
    if (!fichier) continue;
    const type = resoudreTypeMime(fichier) || fichier.mimeType || 'application/octet-stream';
    parties.push([doc.champ, { uri: fichier.uri, name: nomPourEnvoi(fichier, type), type }]);
  }
  return parties;
}

const CHAMPS_FORMULAIRE = ['type_assurance', 'documents', 'piece_identite', 'carte_grise', 'titre_propriete', 'bail'];

function enTexte(valeur) {
  if (Array.isArray(valeur)) return valeur.map(enTexte).join(' ');
  if (valeur && typeof valeur === 'object') return Object.values(valeur).map(enTexte).join(' ');
  return String(valeur ?? '');
}

// Le serveur (demandes/views.py, _get_client_ou_erreur) refuse une demande
// si le profil client est incomplet, avec un message qui renvoie vers « Mon
// profil » du web. Pas de code d'erreur dédié : on reconnaît ce cas à son
// texte et on oriente vers l'onglet Profil (NouvelleDemandeScreen affiche
// alors un bouton qui l'ouvre).
export const MESSAGE_PROFIL_INCOMPLET =
  "Votre profil est incomplet. Complétez-le dans l'onglet Profil, puis renvoyez votre demande.";

export function estMessageProfilIncomplet(texte) {
  const t = String(texte ?? '').toLowerCase();
  return /compl[eé]tez votre profil/.test(t) || /mon profil/.test(t);
}

export function adapterMessageServeur(texte) {
  return estMessageProfilIncomplet(texte) ? MESSAGE_PROFIL_INCOMPLET : texte;
}

// Répartit une réponse d'erreur API entre les champs du formulaire et un
// message général. Formes possibles côté backend :
// - 400 du serializer : {piece_identite: ["..."], documents: ["..."], ...}
// - 400/403/404 des vues : {error: "..."} (profil incomplet, demande non
//   rejetée, introuvable...) ; 401 : {detail: "..."}.
// - 413 éventuel d'un proxy (corps HTML) : message dédié.
// Renvoie {champs, general} ; general vaut '' si tout est rattaché à un champ.
export function extraireErreursDemande(err) {
  const statut = err?.response?.status;
  const data = err?.response?.data;
  if (statut === 413) {
    return { champs: {}, general: 'Fichiers trop volumineux pour le serveur. Réduisez leur taille puis réessayez.' };
  }
  const champs = {};
  const generaux = [];
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [cle, valeur] of Object.entries(data)) {
      const texte = enTexte(valeur).trim();
      if (!texte) continue;
      if (CHAMPS_FORMULAIRE.includes(cle)) champs[cle] = texte;
      else generaux.push(adapterMessageServeur(texte));
    }
  } else if (typeof data === 'string' && data.trim() && data.length < 300 && !data.includes('<')) {
    generaux.push(data.trim());
  }
  return { champs, general: generaux.join(' ') };
}

// Libellés de statut (DemandeContrat.STATUT_CHOICES), si le serveur ne
// fournit pas statut_display.
const LIBELLES_STATUT = { EN_ATTENTE: 'En attente', VALIDEE: 'Validée', REJETEE: 'Rejetée' };

export function libelleStatut(demande) {
  return demande?.statut_display || LIBELLES_STATUT[demande?.statut] || demande?.statut || '';
}

export function libelleTypeAssurance(demande) {
  return (
    demande?.type_assurance_display ||
    TYPES_ASSURANCE.find((t) => t.value === demande?.type_assurance)?.label ||
    demande?.type_assurance ||
    ''
  );
}

// Ids des demandes rejetées qui ont déjà été resoumises. Le backend
// n'empêche pas une deuxième resoumission de la même demande : on masque
// donc le bouton une fois une resoumission présente dans la liste.
export function idsDejaResoumises(demandes = []) {
  return new Set(demandes.map((d) => d.demande_precedente).filter((id) => id != null));
}

export function peutResoumettre(demande, dejaResoumises = new Set()) {
  return demande?.statut === 'REJETEE' && !dejaResoumises.has(demande.id);
}

// Après un envoi resté sans réponse (coupure réseau, délai dépassé), la
// demande a pu être enregistrée quand même. Avant de proposer un nouvel
// envoi, on la recherche dans la liste rechargée :
// - resoumission : une demande dont demande_precedente vaut l'id rejeté ;
// - création : une demande du même type absente de la liste d'avant envoi.
// Renvoie la demande trouvée, ou null (ou undefined si impossible à dire,
// faute de liste d'avant envoi pour une création).
export function trouverDemandeEnregistree(demandes, { typeAssurance, demandePrecedenteId, idsAvantEnvoi }) {
  if (demandePrecedenteId != null) {
    return demandes.find((d) => d.demande_precedente === demandePrecedenteId) || null;
  }
  if (!idsAvantEnvoi) return undefined;
  return demandes.find((d) => !idsAvantEnvoi.has(d.id) && d.type_assurance === typeAssurance) || null;
}

export function formaterTaille(octets) {
  if (typeof octets !== 'number' || !Number.isFinite(octets)) return '';
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}
