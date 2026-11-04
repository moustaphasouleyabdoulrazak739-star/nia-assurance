// Logique pure de l'écran Profil et du changement de mot de passe : sans
// import Expo ni React Native, pour pouvoir être testée avec `node --test`
// (mobile/tests/profil.test.mjs).
//
// Miroir du contrat backend et de frontend/src/pages/Profil.jsx :
// - GET/PATCH /api/auth/profile/ : lecture UserSerializer (email, nom,
//   prenom, telephone...), écriture ProfileUpdateSerializer (nom, prenom,
//   telephone ; jamais email ni role). Comme sur le web, seul le téléphone
//   est modifiable ici : nom, prénom et email restent en lecture seule.
// - GET/PATCH /api/clients/me/ : cin, date_naissance, sexe, adresse, ville,
//   profession (ClientCreateSerializer, PATCH partiel). Le GET renvoie aussi
//   profil_complet (Client.profil_complet : cin, date de naissance, sexe,
//   adresse et ville renseignés), exigé avant toute demande de contrat.
// - POST /api/auth/change-password/ : old_password, new_password.
// Les contrôles locaux ne servent qu'au retour immédiat : le serveur reste
// l'autorité.

export const SEXES = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
];

// Champs envoyés à PATCH /api/auth/profile/.
export const CHAMPS_UTILISATEUR = ['telephone'];
// Champs envoyés à PATCH /api/clients/me/.
export const CHAMPS_CLIENT = ['cin', 'date_naissance', 'sexe', 'adresse', 'ville', 'profession'];
export const CHAMPS_MODIFIABLES = [...CHAMPS_UTILISATEUR, ...CHAMPS_CLIENT];

export const LIBELLES_CHAMPS = {
  telephone: 'Téléphone',
  cin: 'CIN',
  date_naissance: 'Date de naissance',
  sexe: 'Sexe',
  adresse: 'Adresse',
  ville: 'Ville',
  profession: 'Profession',
};

// max_length des modèles (users/models.py, clients/models.py).
export const LONGUEURS_MAX = { telephone: 20, cin: 20, ville: 100, profession: 100 };

// Champs exigés par Client.profil_complet, dans l'ordre d'affichage.
export const CHAMPS_REQUIS_PROFIL = ['cin', 'date_naissance', 'sexe', 'adresse', 'ville'];

// Champs du formulaire de mot de passe (new_password2 : confirmation,
// contrôlée seulement côté client, comme sur le web).
export const CHAMPS_MOT_DE_PASSE = ['old_password', 'new_password', 'new_password2'];

export const LONGUEUR_MIN_MOT_DE_PASSE = 8; // MinimumLengthValidator par défaut

export const MESSAGES = {
  trop_long: (max) => `${max} caractères maximum.`,
  date_format: 'Date invalide (format AAAA-MM-JJ).',
  date_future: 'La date de naissance ne peut pas être dans le futur.',
  sexe: 'Choisissez Masculin ou Féminin.',
  mdp_requis: 'Ce champ est obligatoire.',
  mdp_court: `Au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`,
  mdp_numerique: 'Le mot de passe ne peut pas être entièrement numérique.',
  mdp_identique: "Le nouveau mot de passe doit être différent de l'actuel.",
  mdp_confirmation: 'Les nouveaux mots de passe ne correspondent pas.',
  ancien_incorrect: 'Mot de passe actuel incorrect.',
};

// Valeurs initiales du formulaire (toujours des chaînes) à partir des
// réponses GET /api/auth/profile/ et GET /api/clients/me/.
export function formulaireDepuis(utilisateur, client) {
  const form = {};
  for (const champ of CHAMPS_UTILISATEUR) form[champ] = texte(utilisateur?.[champ]);
  for (const champ of CHAMPS_CLIENT) form[champ] = texte(client?.[champ]);
  return form;
}

function texte(valeur) {
  return valeur == null ? '' : String(valeur);
}

// Valeur saisie nettoyée : espaces de bord retirés ; espaces internes
// supprimés pour le téléphone et le CIN (identifiants).
export function nettoyer(champ, valeur) {
  const brut = texte(valeur).trim();
  if (champ === 'telephone' || champ === 'cin') return brut.replace(/\s+/g, '');
  return brut;
}

// Valeur envoyée au serveur. cin vide -> null : la colonne est unique et
// nullable, deux CIN "" entreraient en conflit. date_naissance vide -> null
// (un DateField refuse la chaîne vide).
export function valeurPourEnvoi(champ, valeurNettoyee) {
  if ((champ === 'cin' || champ === 'date_naissance') && valeurNettoyee === '') return null;
  return valeurNettoyee;
}

// Payloads PATCH avec uniquement les champs réellement modifiés (comparés
// une fois nettoyés). Renvoie {utilisateur, client} ; un objet vide
// signifie qu'aucun appel n'est nécessaire pour cette ressource.
export function construirePayloads(initial, form) {
  const utilisateur = {};
  const client = {};
  for (const champ of CHAMPS_MODIFIABLES) {
    const avant = nettoyer(champ, initial?.[champ]);
    const apres = nettoyer(champ, form?.[champ]);
    if (avant === apres) continue;
    const cible = CHAMPS_UTILISATEUR.includes(champ) ? utilisateur : client;
    cible[champ] = valeurPourEnvoi(champ, apres);
  }
  return { utilisateur, client };
}

export function aDesModifications(initial, form) {
  const { utilisateur, client } = construirePayloads(initial, form);
  return Object.keys(utilisateur).length > 0 || Object.keys(client).length > 0;
}

function dateValide(valeur) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valeur);
  if (!m) return null;
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(annee, mois - 1, jour);
  if (date.getFullYear() !== annee || date.getMonth() !== mois - 1 || date.getDate() !== jour) return null;
  return date;
}

// Contrôles locaux du formulaire profil. Les champs exigés par
// profil_complet ne sont PAS obligatoires pour enregistrer (le serveur
// accepte un profil partiel) : ils sont signalés par le bandeau.
// `aujourdHui` est injectable pour les tests.
export function validerProfil(form, aujourdHui = new Date()) {
  const erreurs = {};
  for (const [champ, max] of Object.entries(LONGUEURS_MAX)) {
    if (nettoyer(champ, form?.[champ]).length > max) erreurs[champ] = MESSAGES.trop_long(max);
  }
  const date = nettoyer('date_naissance', form?.date_naissance);
  if (date) {
    const d = dateValide(date);
    if (!d) erreurs.date_naissance = MESSAGES.date_format;
    else {
      const fin = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), aujourdHui.getDate());
      if (d > fin) erreurs.date_naissance = MESSAGES.date_future;
    }
  }
  const sexe = nettoyer('sexe', form?.sexe);
  if (sexe && !SEXES.some((s) => s.value === sexe)) erreurs.sexe = MESSAGES.sexe;
  return erreurs;
}

// Champs exigés par profil_complet encore vides, sous forme de libellés.
export function champsManquants(source) {
  return CHAMPS_REQUIS_PROFIL.filter((champ) => !nettoyer(champ, source?.[champ])).map(
    (champ) => LIBELLES_CHAMPS[champ],
  );
}

// Le serveur fait foi via profil_complet quand il est fourni (GET
// /api/clients/me/) ; à défaut (réponse d'un PATCH qui ne le renvoie pas),
// on recalcule avec la même règle.
export function estProfilIncomplet(client) {
  if (typeof client?.profil_complet === 'boolean') return !client.profil_complet;
  return champsManquants(client).length > 0;
}

// Contrôles locaux du changement de mot de passe (mêmes règles que les
// validateurs Django qui peuvent être rejoués sans connaître l'utilisateur).
export function validerChangementMotDePasse({ old_password, new_password, new_password2 } = {}) {
  const erreurs = {};
  const ancien = texte(old_password);
  const nouveau = texte(new_password);
  const confirmation = texte(new_password2);
  if (!ancien) erreurs.old_password = MESSAGES.mdp_requis;
  if (!nouveau) erreurs.new_password = MESSAGES.mdp_requis;
  else if (nouveau.length < LONGUEUR_MIN_MOT_DE_PASSE) erreurs.new_password = MESSAGES.mdp_court;
  else if (/^\d+$/.test(nouveau)) erreurs.new_password = MESSAGES.mdp_numerique;
  else if (ancien && nouveau === ancien) erreurs.new_password = MESSAGES.mdp_identique;
  if (!confirmation) erreurs.new_password2 = MESSAGES.mdp_requis;
  else if (nouveau && confirmation !== nouveau) erreurs.new_password2 = MESSAGES.mdp_confirmation;
  return erreurs;
}

function enTexte(valeur) {
  if (Array.isArray(valeur)) return valeur.map(enTexte).filter(Boolean).join(' ');
  if (valeur && typeof valeur === 'object') return Object.values(valeur).map(enTexte).filter(Boolean).join(' ');
  return String(valeur ?? '');
}

function lireEntete(headers, nom) {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') return headers.get(nom);
  return headers[nom.toLowerCase()] ?? headers[nom];
}

// Message d'une réponse 429 (throttle, ex. 'change-password' 8/min), ou null.
export function messageTropDeTentatives(err) {
  if (err?.response?.status !== 429) return null;
  const brut = lireEntete(err.response.headers, 'Retry-After');
  const secondes = /^\s*\d+\s*$/.test(String(brut ?? '')) ? Number(brut) : NaN;
  if (!Number.isFinite(secondes) || secondes <= 0 || secondes === 60) {
    return 'Trop de tentatives. Réessayez dans une minute.';
  }
  if (secondes < 60) return `Trop de tentatives. Réessayez dans ${secondes} seconde${secondes > 1 ? 's' : ''}.`;
  return `Trop de tentatives. Réessayez dans ${Math.ceil(secondes / 60)} minutes.`;
}

// Répartit une réponse d'erreur DRF entre les champs connus et un message
// général. Formes : {champ: ["..."]} (serializer), {error: "..."} (vues),
// {detail: "..."} (401/403/429), {non_field_errors: [...]}. Un corps HTML
// ou trop long (page d'erreur d'un proxy) n'est jamais affiché.
// Renvoie {champs, general}.
export function extraireErreursApi(err, champsConnus = CHAMPS_MODIFIABLES) {
  const trop = messageTropDeTentatives(err);
  if (trop) return { champs: {}, general: trop };
  const data = err?.response?.data;
  const champs = {};
  const generaux = [];
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [cle, valeur] of Object.entries(data)) {
      const message = enTexte(valeur).trim();
      if (!message) continue;
      if (champsConnus.includes(cle)) champs[cle] = message;
      else generaux.push(message);
    }
  } else if (typeof data === 'string' && data.trim() && data.length < 300 && !data.includes('<')) {
    generaux.push(data.trim());
  }
  return { champs, general: generaux.join(' ') };
}

// Erreurs de POST /api/auth/change-password/ : le mauvais ancien mot de
// passe arrive en {error: "Ancien mot de passe incorrect"} (pas de clé de
// champ), on le rattache au champ old_password.
export function extraireErreursMotDePasse(err) {
  const { champs, general } = extraireErreursApi(err, CHAMPS_MOT_DE_PASSE);
  const brut = err?.response?.data?.error;
  if (typeof brut === 'string' && /ancien mot de passe/i.test(brut)) {
    return { champs: { ...champs, old_password: MESSAGES.ancien_incorrect }, general: '' };
  }
  return { champs, general };
}
