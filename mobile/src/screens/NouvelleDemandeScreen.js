import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SelectField from '../components/SelectField';
import PieceJointeField from '../components/PieceJointeField';
import { colors } from '../theme/colors';
import { creerDemande, fetchDemandes, resoumettreDemande } from '../api/demandes';
import { estErreurReseau, messageErreurChargement, messageErreurEnvoi } from '../utils/reseau';
import {
  documentsPourType,
  extraireErreursDemande,
  MESSAGE_PROFIL_INCOMPLET,
  TYPES_ASSURANCE,
  trouverDemandeEnregistree,
  validerDemande,
  validerFichier,
} from '../utils/demandes';
import {
  choisirDansGalerie,
  choisirDocument,
  PermissionRefuseeError,
  prendrePhoto,
  supprimerCopieTemporaire,
} from '../utils/selectionFichier';

const AIDE_FORMAT = 'PDF, JPG ou PNG, 5 Mo maximum.';

function aidePour(doc) {
  if (doc.requis === 'un_de') return `Titre de propriété ou bail : au moins l'un des deux. ${AIDE_FORMAT}`;
  return `Obligatoire. ${AIDE_FORMAT}`;
}

// Nouvelle demande de contrat (POST /api/demandes/create/) ou, si l'écran
// reçoit `demande` en paramètre, correction d'une demande rejetée (POST
// /api/demandes/<id>/resoumettre/). Le serveur revalide tout (pièces
// exigées, type et taille des fichiers) : les contrôles locaux ne servent
// qu'au retour immédiat.
export default function NouvelleDemandeScreen({ navigation, route }) {
  const demandeRejetee = route.params?.demande ?? null;

  const [typeAssurance, setTypeAssurance] = useState(demandeRejetee?.type_assurance ?? '');
  const [fichiers, setFichiers] = useState({});
  const [erreurs, setErreurs] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  // Envoi parti sans réponse (coupure, délai dépassé) : la demande a pu
  // être enregistrée. "Réessayer" vérifie d'abord la liste.
  const [envoiIncertain, setEnvoiIncertain] = useState(false);
  const idsAvantEnvoi = useRef(null);
  const fichiersRef = useRef(fichiers);
  useEffect(() => {
    fichiersRef.current = fichiers;
  }, [fichiers]);

  useLayoutEffect(() => {
    if (demandeRejetee) navigation.setOptions({ title: 'Corriger et renvoyer' });
  }, [navigation, demandeRejetee]);

  // Liste des demandes avant envoi : sert uniquement à reconnaître, après
  // une coupure, une demande créée malgré tout. Échec silencieux.
  useEffect(() => {
    fetchDemandes()
      .then((liste) => {
        idsAvantEnvoi.current = new Set(liste.map((d) => d.id));
      })
      .catch(() => {});
  }, []);

  // Copies en cache supprimées si l'utilisateur quitte l'écran sans envoyer.
  useEffect(
    () => () => {
      Object.values(fichiersRef.current).forEach(supprimerCopieTemporaire);
    },
    [],
  );

  const documents = documentsPourType(typeAssurance);

  const effacerErreur = (champ) => {
    setErreurs((prev) => ({ ...prev, [champ]: undefined, documents: undefined }));
    setErreurGenerale('');
    setEnvoiIncertain(false);
  };

  const changerType = (valeur) => {
    // On garde les pièces communes au nouveau type (ex. pièce d'identité).
    const champs = new Set(documentsPourType(valeur).map((d) => d.champ));
    const gardes = {};
    for (const [champ, fichier] of Object.entries(fichiers)) {
      if (champs.has(champ)) gardes[champ] = fichier;
      else supprimerCopieTemporaire(fichier);
    }
    setFichiers(gardes);
    setTypeAssurance(valeur);
    setErreurs({});
    setErreurGenerale('');
    setEnvoiIncertain(false);
  };

  const choisir = async (champ, source) => {
    effacerErreur(champ);
    let fichier;
    try {
      if (source === 'photo') fichier = await prendrePhoto(`${champ}.jpg`);
      else if (source === 'galerie') fichier = await choisirDansGalerie(`${champ}.jpg`);
      else fichier = await choisirDocument();
    } catch (err) {
      const message =
        err instanceof PermissionRefuseeError ? err.message : "Impossible d'ouvrir le sélecteur de fichiers.";
      setErreurs((prev) => ({ ...prev, [champ]: message }));
      return;
    }
    if (!fichier) return; // sélection annulée

    const message = validerFichier(fichier);
    if (message) {
      supprimerCopieTemporaire(fichier);
      setErreurs((prev) => ({ ...prev, [champ]: message }));
      return;
    }
    if (fichiers[champ]) supprimerCopieTemporaire(fichiers[champ]);
    setFichiers((prev) => ({ ...prev, [champ]: fichier }));
  };

  const retirer = (champ) => {
    supprimerCopieTemporaire(fichiers[champ]);
    setFichiers((prev) => {
      const suivant = { ...prev };
      delete suivant[champ];
      return suivant;
    });
    effacerErreur(champ);
  };

  const terminer = (message) => {
    Object.values(fichiers).forEach(supprimerCopieTemporaire);
    setFichiers({});
    Alert.alert(demandeRejetee ? 'Demande renvoyée' : 'Demande envoyée', message, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const envoyer = async () => {
    setEnvoiEnCours(true);
    setErreurGenerale('');
    setEnvoiIncertain(false);
    try {
      const resultat = demandeRejetee
        ? await resoumettreDemande(demandeRejetee.id, typeAssurance, fichiers)
        : await creerDemande(typeAssurance, fichiers);
      terminer(resultat?.message || 'Votre demande a bien été envoyée. La compagnie va la traiter.');
    } catch (err) {
      if (estErreurReseau(err)) {
        setErreurGenerale(messageErreurEnvoi(err, ''));
        setEnvoiIncertain(true);
        return;
      }
      const { champs, general } = extraireErreursDemande(err);
      setErreurs(champs);
      setErreurGenerale(
        general || (Object.keys(champs).length ? '' : "Erreur lors de l'envoi de la demande. Vérifiez les documents fournis."),
      );
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const soumettre = () => {
    const locales = validerDemande(typeAssurance, fichiers);
    setErreurs(locales);
    if (Object.keys(locales).length) {
      setErreurGenerale('Corrigez les champs signalés avant d’envoyer.');
      return;
    }
    envoyer();
  };

  // Jamais de renvoi automatique : l'utilisateur relance, et on vérifie
  // d'abord que la demande n'a pas déjà été enregistrée.
  const reessayer = async () => {
    setEnvoiEnCours(true);
    let trouvee;
    try {
      const liste = await fetchDemandes();
      trouvee = trouverDemandeEnregistree(liste, {
        typeAssurance,
        demandePrecedenteId: demandeRejetee?.id ?? null,
        idsAvantEnvoi: idsAvantEnvoi.current,
      });
    } catch (err) {
      setErreurGenerale(messageErreurChargement(err, 'Impossible de vérifier vos demandes.'));
      setEnvoiEnCours(false);
      return;
    }
    setEnvoiEnCours(false);
    if (trouvee) {
      terminer(`Votre demande ${trouvee.numero_demande} avait bien été enregistrée.`);
      return;
    }
    if (trouvee === undefined) {
      Alert.alert(
        'Renvoyer la demande ?',
        "Impossible de savoir si le premier envoi a été enregistré. Vérifiez la liste de vos demandes avant de renvoyer pour éviter un doublon.",
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Renvoyer', onPress: envoyer },
        ],
      );
      return;
    }
    envoyer();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {demandeRejetee ? (
          <View style={styles.rejetBox}>
            <Text style={styles.rejetTitre}>Demande {demandeRejetee.numero_demande} rejetée</Text>
            {demandeRejetee.motif_rejet ? (
              <Text style={styles.rejetMotif}>Motif : {demandeRejetee.motif_rejet}</Text>
            ) : null}
            {demandeRejetee.documents?.length ? (
              <Text style={styles.rejetPieces}>
                Pièces envoyées la première fois :{' '}
                {demandeRejetee.documents.map((d) => d.type_document_display || d.type_document).join(', ')}
              </Text>
            ) : null}
            <Text style={styles.rejetAide}>
              Corrigez si besoin le type d&apos;assurance et joignez à nouveau toutes les pièces demandées : celles de
              la demande rejetée ne sont pas reprises.
            </Text>
          </View>
        ) : (
          <Text style={styles.intro}>
            Choisissez le type d&apos;assurance souhaité, les documents demandés s&apos;affichent automatiquement.
          </Text>
        )}

        <SelectField
          label="Type d'assurance"
          placeholder="Choisir le type"
          value={typeAssurance}
          options={TYPES_ASSURANCE}
          onChange={changerType}
          error={erreurs.type_assurance}
        />

        {documents.map((doc) => (
          <PieceJointeField
            key={doc.champ}
            label={doc.label}
            aide={aidePour(doc)}
            fichier={fichiers[doc.champ]}
            error={erreurs[doc.champ]}
            disabled={envoiEnCours}
            onChoisir={(source) => choisir(doc.champ, source)}
            onRetirer={() => retirer(doc.champ)}
          />
        ))}

        {erreurs.documents ? <Text style={styles.fieldError}>{erreurs.documents}</Text> : null}

        {erreurGenerale ? (
          <View style={styles.erreurBox}>
            <Text style={styles.erreurTexte}>{erreurGenerale}</Text>
            {erreurGenerale === MESSAGE_PROFIL_INCOMPLET ? (
              <TouchableOpacity
                style={styles.profilButton}
                onPress={() => navigation.navigate('ProfilTab', { screen: 'Profil' })}
                activeOpacity={0.8}
              >
                <Text style={styles.retryButtonText}>Compléter mon profil</Text>
              </TouchableOpacity>
            ) : null}
            {envoiIncertain ? (
              <TouchableOpacity
                style={styles.retryButton}
                onPress={reessayer}
                disabled={envoiEnCours}
                activeOpacity={0.8}
              >
                {envoiEnCours ? (
                  <ActivityIndicator color={colors.secondary} />
                ) : (
                  <Text style={styles.retryButtonText}>Réessayer</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {!envoiIncertain ? (
          <TouchableOpacity
            style={[styles.submit, (envoiEnCours || !typeAssurance) && styles.submitDisabled]}
            onPress={soumettre}
            disabled={envoiEnCours || !typeAssurance}
            activeOpacity={0.85}
          >
            {envoiEnCours ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>{demandeRejetee ? 'Renvoyer la demande' : 'Envoyer la demande'}</Text>
            )}
          </TouchableOpacity>
        ) : null}

        {envoiEnCours && !envoiIncertain ? (
          <Text style={styles.envoiInfo}>Envoi des pièces en cours, cela peut prendre jusqu&apos;à 2 minutes.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  intro: { fontSize: 13, color: colors.textMuted, marginBottom: 14 },
  rejetBox: { backgroundColor: colors.dangerSoft, borderRadius: 12, padding: 12, marginBottom: 16 },
  rejetTitre: { fontSize: 14, fontWeight: '700', color: colors.danger },
  rejetMotif: { fontSize: 13, color: colors.danger, marginTop: 4 },
  rejetPieces: { fontSize: 12, color: colors.text, marginTop: 8 },
  rejetAide: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: 8 },
  erreurBox: { marginTop: 16, backgroundColor: colors.dangerSoft, borderRadius: 12, padding: 12 },
  erreurTexte: { color: colors.danger, fontSize: 13 },
  retryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  profilButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  retryButtonText: { color: colors.secondary, fontSize: 13, fontWeight: '700' },
  submit: {
    marginTop: 24,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  envoiInfo: { marginTop: 10, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
});
