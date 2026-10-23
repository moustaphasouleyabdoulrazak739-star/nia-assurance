// Tests de la logique pure des demandes de contrat (src/utils/demandes.js),
// lanceur intégré de Node (`node --test`), aucune dépendance de test ajoutée.
// Les cas reprennent le contrat backend : demandes/constants.py,
// demandes/validators.py et DemandeContratCreateSerializer.validate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  adapterMessageServeur,
  documentsPourType,
  estMessageProfilIncomplet,
  extraireErreursDemande,
  formaterTaille,
  idsDejaResoumises,
  libelleStatut,
  libelleTypeAssurance,
  MESSAGE_PROFIL_INCOMPLET,
  MESSAGES,
  nomPourEnvoi,
  partiesFormulaire,
  peutResoumettre,
  resoudreTypeMime,
  TAILLE_MAX_OCTETS,
  trouverDemandeEnregistree,
  validerDemande,
  validerFichier,
} from '../src/utils/demandes.js';

const pdf = (nom = 'cin.pdf', size = 1000) => ({ uri: `file:///cache/${nom}`, name: nom, mimeType: 'application/pdf', size });
const jpeg = (nom = 'photo.jpg', size = 1000) => ({ uri: `file:///cache/${nom}`, name: nom, mimeType: 'image/jpeg', size });

test('pièces exigées par type, mêmes champs multipart que le backend', () => {
  const champs = (type) => documentsPourType(type).map((d) => `${d.champ}:${d.requis}`);
  assert.deepEqual(champs('AUTO'), ['piece_identite:true', 'carte_grise:true']);
  assert.deepEqual(champs('HABITATION'), ['piece_identite:true', 'titre_propriete:un_de', 'bail:un_de']);
  assert.deepEqual(champs('SANTE'), ['piece_identite:true']);
  assert.deepEqual(champs('VIE'), ['piece_identite:true']);
  assert.deepEqual(documentsPourType('INCONNU'), []);
});

test('validerFichier : taille limite incluse (5 Mo = 5 * 1024 * 1024 octets)', () => {
  assert.equal(validerFichier(pdf('a.pdf', TAILLE_MAX_OCTETS)), null);
  assert.equal(validerFichier(pdf('a.pdf', TAILLE_MAX_OCTETS + 1)), MESSAGES.tailleMax);
  assert.equal(validerFichier({ ...pdf(), size: undefined }), null, 'taille inconnue : le serveur tranche');
});

test('validerFichier : PDF, JPG et PNG uniquement', () => {
  assert.equal(validerFichier(pdf()), null);
  assert.equal(validerFichier(jpeg()), null);
  assert.equal(validerFichier({ name: 'scan.png', mimeType: 'image/png', size: 10 }), null);
  assert.equal(validerFichier({ name: 'IMG.HEIC', mimeType: 'image/heic', size: 10 }), MESSAGES.format);
  assert.equal(validerFichier({ name: 'doc.docx', mimeType: 'application/msword', size: 10 }), MESSAGES.format);
  assert.equal(validerFichier({ name: 'x.gif', mimeType: 'image/gif', size: 10 }), MESSAGES.format);
});

test('resoudreTypeMime : MIME déclaré, alias, repli sur l’extension', () => {
  assert.equal(resoudreTypeMime({ name: 'a.jpg', mimeType: 'image/jpg' }), 'image/jpeg');
  assert.equal(resoudreTypeMime({ name: 'a.PDF', mimeType: '' }), 'application/pdf');
  assert.equal(resoudreTypeMime({ name: 'a.jpeg', mimeType: 'application/octet-stream' }), 'image/jpeg');
  assert.equal(resoudreTypeMime({ name: 'a.png' }), 'image/png');
  assert.equal(resoudreTypeMime({ name: 'sans_extension', mimeType: 'image/png' }), 'image/png');
  assert.equal(resoudreTypeMime({ name: 'a.exe', mimeType: 'application/octet-stream' }), null);
  assert.equal(resoudreTypeMime({ name: 'a.heic', mimeType: 'image/jpeg' }), null, 'extension hors liste');
  assert.equal(resoudreTypeMime({ name: 'a.pdf', mimeType: 'image/heic' }), null, 'MIME explicite non autorisé');
});

test('nomPourEnvoi : extension cohérente avec le type annoncé, pas de séparateur de chemin', () => {
  assert.equal(nomPourEnvoi({ name: 'cin.pdf' }, 'application/pdf'), 'cin.pdf');
  assert.equal(nomPourEnvoi({ name: 'cin.JPEG' }, 'image/jpeg'), 'cin.JPEG');
  assert.equal(nomPourEnvoi({ name: 'photo' }, 'image/jpeg'), 'photo.jpg');
  assert.equal(nomPourEnvoi({ name: '../../etc/x.png' }, 'image/png'), '.._.._etc_x.png');
  assert.equal(nomPourEnvoi({}, 'application/pdf'), 'document.pdf');
});

test('validerDemande : type obligatoire', () => {
  assert.deepEqual(validerDemande('', {}), { type_assurance: MESSAGES.typeObligatoire });
});

test('validerDemande : AUTO exige pièce d’identité et carte grise', () => {
  assert.deepEqual(validerDemande('AUTO', {}), {
    piece_identite: MESSAGES.obligatoire,
    carte_grise: MESSAGES.obligatoire,
  });
  assert.deepEqual(validerDemande('AUTO', { piece_identite: pdf(), carte_grise: jpeg() }), {});
});

test('validerDemande : HABITATION exige un titre de propriété OU un bail', () => {
  assert.deepEqual(validerDemande('HABITATION', { piece_identite: pdf() }), { documents: MESSAGES.unDe });
  assert.deepEqual(validerDemande('HABITATION', { piece_identite: pdf(), bail: pdf('bail.pdf') }), {});
  assert.deepEqual(validerDemande('HABITATION', { piece_identite: pdf(), titre_propriete: pdf('t.pdf') }), {});
});

test('validerDemande : erreurs de fichier rattachées au bon champ', () => {
  const erreurs = validerDemande('SANTE', { piece_identite: pdf('gros.pdf', TAILLE_MAX_OCTETS + 1) });
  assert.deepEqual(erreurs, { piece_identite: MESSAGES.tailleMax });
  const format = validerDemande('VIE', { piece_identite: { name: 'a.heic', mimeType: 'image/heic', size: 1 } });
  assert.deepEqual(format, { piece_identite: MESSAGES.format });
});

test('validerDemande : un fichier hors du type choisi est ignoré', () => {
  assert.deepEqual(validerDemande('SANTE', { piece_identite: pdf(), carte_grise: { name: 'x.gif', mimeType: 'image/gif' } }), {});
});

test('partiesFormulaire : type puis fichiers attendus du type, au format FormData React Native', () => {
  const parties = partiesFormulaire('SANTE', {
    piece_identite: { uri: 'file:///cache/p', name: 'photo', mimeType: 'image/jpg', size: 5 },
    carte_grise: pdf('cg.pdf'),
  });
  assert.deepEqual(parties, [
    ['type_assurance', 'SANTE'],
    ['piece_identite', { uri: 'file:///cache/p', name: 'photo.jpg', type: 'image/jpeg' }],
  ]);
});

test('partiesFormulaire : HABITATION avec bail seul', () => {
  const parties = partiesFormulaire('HABITATION', { piece_identite: pdf(), bail: pdf('bail.pdf') });
  assert.deepEqual(parties.map(([nom]) => nom), ['type_assurance', 'piece_identite', 'bail']);
  assert.equal(parties[2][1].type, 'application/pdf');
});

test('extraireErreursDemande : erreurs du serializer par champ (y compris fichiers)', () => {
  const err = {
    response: {
      status: 400,
      data: {
        piece_identite: ['Le fichier dépasse la taille maximale autorisée (5 Mo).'],
        documents: ['Au moins un des justificatifs demandés (titre de propriété ou bail) est obligatoire.'],
        type_assurance: ['"XX" n\'est pas un choix valide.'],
      },
    },
  };
  const { champs, general } = extraireErreursDemande(err);
  assert.equal(champs.piece_identite, 'Le fichier dépasse la taille maximale autorisée (5 Mo).');
  assert.match(champs.documents, /titre de propriété ou bail/);
  assert.match(champs.type_assurance, /choix valide/);
  assert.equal(general, '');
});

test('extraireErreursDemande : erreurs de vue (profil incomplet, demande non rejetée) en message général', () => {
  const profil = extraireErreursDemande({ response: { status: 400, data: { error: 'Profil client introuvable.' } } });
  assert.deepEqual(profil, { champs: {}, general: 'Profil client introuvable.' });
  const nonRejetee = extraireErreursDemande({
    response: { status: 400, data: { error: 'Seule une demande rejetée peut être resoumise.' } },
  });
  assert.match(nonRejetee.general, /rejetée/);
  const detail = extraireErreursDemande({ response: { status: 403, data: { detail: 'Refusé.' } } });
  assert.equal(detail.general, 'Refusé.');
});

test('extraireErreursDemande : 413, HTML et erreur réseau ne donnent rien de brut', () => {
  assert.match(extraireErreursDemande({ response: { status: 413, data: '<html>' } }).general, /trop volumineux/);
  assert.deepEqual(extraireErreursDemande({ response: { status: 500, data: '<html>Server Error</html>' } }), {
    champs: {},
    general: '',
  });
  assert.deepEqual(extraireErreursDemande({ code: 'ERR_NETWORK' }), { champs: {}, general: '' });
});

test('libellés de statut et de type', () => {
  assert.equal(libelleStatut({ statut: 'REJETEE', statut_display: 'Rejetée' }), 'Rejetée');
  assert.equal(libelleStatut({ statut: 'EN_ATTENTE' }), 'En attente');
  assert.equal(libelleStatut({ statut: 'VALIDEE' }), 'Validée');
  assert.equal(libelleStatut({ statut: 'AUTRE' }), 'AUTRE');
  assert.equal(libelleTypeAssurance({ type_assurance: 'HABITATION' }), 'Assurance Habitation');
});

test('resoumission : seulement une demande rejetée, et une seule fois', () => {
  const demandes = [
    { id: 3, statut: 'EN_ATTENTE', demande_precedente: 1 },
    { id: 2, statut: 'REJETEE', demande_precedente: null },
    { id: 1, statut: 'REJETEE', demande_precedente: null },
  ];
  const deja = idsDejaResoumises(demandes);
  assert.equal(peutResoumettre(demandes[1], deja), true);
  assert.equal(peutResoumettre(demandes[2], deja), false, 'déjà resoumise');
  assert.equal(peutResoumettre(demandes[0], deja), false, 'pas rejetée');
});

test('trouverDemandeEnregistree : retrouve un envoi resté sans réponse', () => {
  const liste = [
    { id: 7, type_assurance: 'AUTO', demande_precedente: 4 },
    { id: 5, type_assurance: 'SANTE', demande_precedente: null },
  ];
  assert.equal(trouverDemandeEnregistree(liste, { demandePrecedenteId: 4 }).id, 7);
  assert.equal(trouverDemandeEnregistree(liste, { demandePrecedenteId: 9 }), null);
  assert.equal(trouverDemandeEnregistree(liste, { typeAssurance: 'SANTE', idsAvantEnvoi: new Set([7]) }).id, 5);
  assert.equal(trouverDemandeEnregistree(liste, { typeAssurance: 'SANTE', idsAvantEnvoi: new Set([5, 7]) }), null);
  assert.equal(trouverDemandeEnregistree(liste, { typeAssurance: 'SANTE', idsAvantEnvoi: null }), undefined);
});

test('formaterTaille', () => {
  assert.equal(formaterTaille(512), '512 o');
  assert.equal(formaterTaille(2048), '2 Ko');
  assert.equal(formaterTaille(5 * 1024 * 1024), '5,0 Mo');
  assert.equal(formaterTaille(undefined), '');
});

// Texte exact renvoyé par demandes/views.py (_get_client_ou_erreur).
const MESSAGE_SERVEUR_PROFIL =
  'Complétez votre profil (CIN, date de naissance, adresse, ville) depuis "Mon profil" avant de demander un contrat.';

test('estMessageProfilIncomplet : reconnaît le message serveur, pas les autres', () => {
  assert.equal(estMessageProfilIncomplet(MESSAGE_SERVEUR_PROFIL), true);
  assert.equal(estMessageProfilIncomplet('Completez votre profil depuis Mon profil.'), true);
  assert.equal(estMessageProfilIncomplet('Profil client introuvable.'), false);
  assert.equal(estMessageProfilIncomplet('Cette demande a déjà été traitée.'), false);
  assert.equal(estMessageProfilIncomplet(undefined), false);
  assert.equal(estMessageProfilIncomplet(null), false);
});

test('adapterMessageServeur : remplace le renvoi vers « Mon profil », laisse le reste intact', () => {
  assert.equal(adapterMessageServeur(MESSAGE_SERVEUR_PROFIL), MESSAGE_PROFIL_INCOMPLET);
  assert.equal(adapterMessageServeur('Permission refusée'), 'Permission refusée');
  assert.doesNotMatch(MESSAGE_PROFIL_INCOMPLET, /Mon profil|—|–/);
});

test('extraireErreursDemande : profil incomplet affiché avec le message mobile', () => {
  const resultat = extraireErreursDemande({ response: { status: 400, data: { error: MESSAGE_SERVEUR_PROFIL } } });
  assert.deepEqual(resultat, { champs: {}, general: MESSAGE_PROFIL_INCOMPLET });
});
