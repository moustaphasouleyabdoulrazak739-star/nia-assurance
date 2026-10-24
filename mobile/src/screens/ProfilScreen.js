import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateField from '../components/DateField';
import SelectField from '../components/SelectField';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { chargerProfil, deconnecterServeur, enregistrerProfil } from '../api/profil';
import { estErreurReseau, messageErreurChargement } from '../utils/reseau';
import { formaterDate } from '../utils/format';
import {
  aDesModifications,
  CHAMPS_CLIENT,
  CHAMPS_UTILISATEUR,
  champsManquants,
  construirePayloads,
  estProfilIncomplet,
  extraireErreursApi,
  formulaireDepuis,
  LONGUEURS_MAX,
  nettoyer,
  SEXES,
  validerProfil,
} from '../utils/profil';

const MESSAGE_RESEAU_ENREGISTREMENT =
  "Le serveur n'a pas répondu. Vos modifications ont peut-être été enregistrées : tirez vers le bas pour actualiser.";

function initiales(utilisateur) {
  return `${utilisateur?.prenom?.charAt(0) ?? ''}${utilisateur?.nom?.charAt(0) ?? ''}`.toUpperCase();
}

function Champ({ label, error, aide, style, ...props }) {
  return (
    <View style={styles.champ}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, props.multiline && styles.inputMultiligne, error && styles.inputErreur, style]}
        placeholderTextColor={colors.textLight}
        {...props}
      />
      {aide && !error ? <Text style={styles.aide}>{aide}</Text> : null}
      {error ? <Text style={styles.erreurChamp}>{error}</Text> : null}
    </View>
  );
}

function LigneLecture({ label, valeur, aide }) {
  return (
    <View style={styles.ligneLecture}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.valeurLecture} selectable>
        {valeur || 'Non renseigné'}
      </Text>
      {aide ? <Text style={styles.aide}>{aide}</Text> : null}
    </View>
  );
}

// Écran « Mon profil » : mêmes champs modifiables que le web
// (frontend/src/pages/Profil.jsx) ; nom, prénom et email en lecture seule.
// Prévu comme écran racine de la pile de l'onglet Profil (native-stack avec
// en-tête) ; le changement de mot de passe est la route 'ChangerMotDePasse'.
export default function ProfilScreen({ navigation }) {
  const { logout } = useAuth();

  const [utilisateur, setUtilisateur] = useState(null);
  const [client, setClient] = useState(null);
  const [initial, setInitial] = useState(() => formulaireDepuis(null, null));
  const [form, setForm] = useState(() => formulaireDepuis(null, null));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erreurChargement, setErreurChargement] = useState('');
  const [erreurs, setErreurs] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState('');
  const [succes, setSucces] = useState('');
  const [enregistrement, setEnregistrement] = useState(false);
  const [deconnexion, setDeconnexion] = useState(false);
  const deconnexionRef = useRef(false);

  const appliquerDonnees = useCallback((donnees) => {
    const valeurs = formulaireDepuis(donnees.utilisateur, donnees.client);
    setUtilisateur(donnees.utilisateur);
    setClient(donnees.client);
    setInitial(valeurs);
    setForm(valeurs);
    setErreurs({});
    setErreurGenerale('');
    setErreurChargement('');
  }, []);

  const appliquerErreur = useCallback((err) => {
    setErreurChargement(messageErreurChargement(err, 'Impossible de charger votre profil.'));
  }, []);

  const charger = useCallback(
    () => chargerProfil().then(appliquerDonnees, appliquerErreur),
    [appliquerDonnees, appliquerErreur],
  );

  // Chargement unique au montage (et non à chaque retour sur l'écran) : un
  // retour depuis le changement de mot de passe ne doit pas écraser une
  // saisie en cours. Actualisation manuelle par tirer vers le bas.
  useEffect(() => {
    let annule = false;
    chargerProfil()
      .then(
        (donnees) => {
          if (!annule) appliquerDonnees(donnees);
        },
        (err) => {
          if (!annule) appliquerErreur(err);
        },
      )
      .finally(() => {
        if (!annule) setLoading(false);
      });
    return () => {
      annule = true;
    };
  }, [appliquerDonnees, appliquerErreur]);

  const actualiser = async () => {
    setRefreshing(true);
    setSucces('');
    await charger();
    setRefreshing(false);
  };

  const onRefresh = () => {
    if (!aDesModifications(initial, form)) {
      actualiser();
      return;
    }
    Alert.alert('Abandonner les modifications ?', "Vos modifications non enregistrées seront perdues.", [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Actualiser', style: 'destructive', onPress: actualiser },
    ]);
  };

  const reessayerChargement = async () => {
    setLoading(true);
    await charger();
    setLoading(false);
  };

  const modifier = (champ) => (valeur) => {
    setForm((prev) => ({ ...prev, [champ]: valeur }));
    setErreurs((prev) => ({ ...prev, [champ]: undefined }));
    setErreurGenerale('');
    setSucces('');
  };

  const appliquerSucces = (champs, donnees, setRessource, sansIndicateur) => {
    setRessource((prev) => {
      const suivant = { ...prev, ...donnees };
      // La réponse du PATCH client ne porte pas profil_complet : on le
      // retire pour qu'il soit recalculé (estProfilIncomplet).
      if (sansIndicateur) delete suivant.profil_complet;
      return suivant;
    });
    // `form` est la saisie envoyée : elle devient la nouvelle référence.
    const nettoyes = {};
    for (const champ of champs) nettoyes[champ] = nettoyer(champ, form[champ]);
    setInitial((prev) => ({ ...prev, ...nettoyes }));
    // Valeur nettoyée affichée, sauf si le champ a été retouché pendant
    // l'envoi (sélecteurs de date et de sexe restés actifs).
    setForm((prev) => {
      const suivant = { ...prev };
      for (const champ of champs) if (prev[champ] === form[champ]) suivant[champ] = nettoyes[champ];
      return suivant;
    });
  };

  const enregistrer = async () => {
    setSucces('');
    const locales = validerProfil(form);
    setErreurs(locales);
    if (Object.keys(locales).length) {
      setErreurGenerale('Corrigez les champs signalés avant d’enregistrer.');
      return;
    }
    const payloads = construirePayloads(initial, form);
    if (!Object.keys(payloads.utilisateur).length && !Object.keys(payloads.client).length) {
      setErreurGenerale('Aucune modification à enregistrer.');
      return;
    }

    setEnregistrement(true);
    setErreurGenerale('');
    const resultats = await enregistrerProfil(payloads);
    setEnregistrement(false);

    const champsErreur = {};
    const generaux = [];
    let unSucces = false;
    const traiter = (resultat, champs, setRessource, sansIndicateur) => {
      if (!resultat) return;
      if (resultat.status === 'fulfilled') {
        unSucces = true;
        appliquerSucces(champs, resultat.value, setRessource, sansIndicateur);
        return;
      }
      if (estErreurReseau(resultat.reason)) {
        generaux.push(MESSAGE_RESEAU_ENREGISTREMENT);
        return;
      }
      const { champs: parChamp, general } = extraireErreursApi(resultat.reason);
      Object.assign(champsErreur, parChamp);
      if (general) generaux.push(general);
      else if (!Object.keys(parChamp).length) generaux.push("Erreur lors de l'enregistrement du profil.");
    };
    traiter(resultats.utilisateur, CHAMPS_UTILISATEUR, setUtilisateur, false);
    traiter(resultats.client, CHAMPS_CLIENT, setClient, true);

    setErreurs(champsErreur);
    const echec = generaux.length > 0 || Object.keys(champsErreur).length > 0;
    if (!echec) {
      setSucces('Profil mis à jour avec succès.');
      return;
    }
    const messages = [...new Set(generaux)];
    if (!messages.length) messages.push('Corrigez les champs signalés.');
    if (unSucces) messages.push('Les autres modifications ont bien été enregistrées.');
    setErreurGenerale(messages.join(' '));
  };

  const seDeconnecter = async () => {
    if (deconnexionRef.current) return;
    deconnexionRef.current = true;
    setDeconnexion(true);
    try {
      // Révocation serveur au mieux (délai court, erreurs ignorées), puis
      // déconnexion locale dans tous les cas.
      await deconnecterServeur();
    } finally {
      await logout();
    }
  };

  const confirmerDeconnexion = () => {
    if (deconnexionRef.current) return;
    Alert.alert('Se déconnecter ?', 'Vous devrez saisir à nouveau votre email et votre mot de passe.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: seDeconnecter },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centre]} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </SafeAreaView>
    );
  }

  if (erreurChargement && !utilisateur) {
    return (
      <SafeAreaView style={[styles.safe, styles.centre]} edges={['bottom', 'left', 'right']}>
        <Text style={styles.erreurChargement}>{erreurChargement}</Text>
        <TouchableOpacity style={styles.boutonSecondaire} onPress={reessayerChargement} activeOpacity={0.8}>
          <Text style={styles.boutonSecondaireTexte}>Réessayer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.boutonDeconnexion, deconnexion && styles.desactive]}
          onPress={confirmerDeconnexion}
          disabled={deconnexion}
          activeOpacity={0.8}
        >
          {deconnexion ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text style={styles.boutonDeconnexionTexte}>Se déconnecter</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const incomplet = estProfilIncomplet(client);
  const manquants = champsManquants(client);
  const modifie = aDesModifications(initial, form);
  const occupe = enregistrement || deconnexion;
  const nomComplet = [utilisateur?.prenom, utilisateur?.nom].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.secondary]}
            tintColor={colors.secondary}
          />
        }
      >
        <View style={styles.entete}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexte}>{initiales(utilisateur) || '?'}</Text>
          </View>
          <View style={styles.enteteTextes}>
            <Text style={styles.nom}>{nomComplet || 'Mon compte'}</Text>
            {utilisateur?.email ? <Text style={styles.email}>{utilisateur.email}</Text> : null}
            {utilisateur?.date_creation ? (
              <Text style={styles.membre}>Membre depuis le {formaterDate(utilisateur.date_creation)}</Text>
            ) : null}
          </View>
        </View>

        {erreurChargement ? (
          <View style={styles.erreurBox}>
            <Text style={styles.erreurTexte}>{erreurChargement}</Text>
          </View>
        ) : null}

        {incomplet ? (
          <View style={styles.bandeauIncomplet}>
            <Text style={styles.bandeauTitre}>Profil incomplet</Text>
            <Text style={styles.bandeauTexte}>
              Complétez votre profil pour pouvoir demander un contrat.
              {manquants.length ? ` À renseigner : ${manquants.join(', ')}.` : ''}
            </Text>
          </View>
        ) : null}

        <View style={styles.carte}>
          <Text style={styles.titreSection}>Compte</Text>
          <LigneLecture label="Prénom" valeur={utilisateur?.prenom} />
          <LigneLecture label="Nom" valeur={utilisateur?.nom} />
          <LigneLecture
            label="Email"
            valeur={utilisateur?.email}
            aide="Identifiant de connexion : contactez la compagnie pour le modifier."
          />
        </View>

        <View style={styles.carte}>
          <Text style={styles.titreSection}>Informations personnelles</Text>

          <Champ
            label="Téléphone"
            value={form.telephone}
            onChangeText={modifier('telephone')}
            placeholder="Ex : 96000000"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={LONGUEURS_MAX.telephone + 5}
            editable={!occupe}
            error={erreurs.telephone}
          />
          <Champ
            label="CIN"
            value={form.cin}
            onChangeText={modifier('cin')}
            placeholder="Votre numéro CIN"
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            maxLength={LONGUEURS_MAX.cin + 5}
            editable={!occupe}
            error={erreurs.cin}
          />
          <View style={styles.champ}>
            <DateField
              label="Date de naissance"
              value={form.date_naissance}
              onChange={modifier('date_naissance')}
              maximumDate={new Date()}
              error={erreurs.date_naissance}
            />
          </View>
          <View style={styles.champ}>
            <SelectField
              label="Sexe"
              placeholder="Choisir"
              value={form.sexe}
              options={SEXES}
              onChange={modifier('sexe')}
              error={erreurs.sexe}
            />
          </View>
          <Champ
            label="Ville"
            value={form.ville}
            onChangeText={modifier('ville')}
            placeholder="Ex : Niamey"
            autoComplete="postal-address-locality"
            textContentType="addressCity"
            maxLength={LONGUEURS_MAX.ville + 5}
            editable={!occupe}
            error={erreurs.ville}
          />
          <Champ
            label="Profession"
            value={form.profession}
            onChangeText={modifier('profession')}
            placeholder="Ex : Enseignant"
            maxLength={LONGUEURS_MAX.profession + 5}
            editable={!occupe}
            error={erreurs.profession}
          />
          <Champ
            label="Adresse"
            value={form.adresse}
            onChangeText={modifier('adresse')}
            placeholder="Votre adresse complète"
            autoComplete="street-address"
            textContentType="fullStreetAddress"
            multiline
            editable={!occupe}
            error={erreurs.adresse}
          />
        </View>

        {erreurGenerale ? (
          <View style={styles.erreurBox}>
            <Text style={styles.erreurTexte}>{erreurGenerale}</Text>
          </View>
        ) : null}
        {succes ? (
          <View style={styles.succesBox}>
            <Text style={styles.succesTexte}>{succes}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.boutonPrincipal, (occupe || !modifie) && styles.desactive]}
          onPress={enregistrer}
          disabled={occupe || !modifie}
          activeOpacity={0.85}
        >
          {enregistrement ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.boutonPrincipalTexte}>Enregistrer les modifications</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.boutonSecondaire, styles.boutonPleineLargeur, occupe && styles.desactive]}
          onPress={() => navigation.navigate('ChangerMotDePasse')}
          disabled={occupe}
          activeOpacity={0.8}
        >
          <Text style={styles.boutonSecondaireTexte}>Changer mon mot de passe</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.boutonDeconnexion, styles.boutonPleineLargeur, occupe && styles.desactive]}
          onPress={confirmerDeconnexion}
          disabled={occupe}
          activeOpacity={0.8}
        >
          {deconnexion ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text style={styles.boutonDeconnexionTexte}>Se déconnecter</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centre: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { padding: 16, paddingBottom: 40 },
  entete: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarTexte: { fontSize: 20, fontWeight: '700', color: colors.secondary },
  enteteTextes: { flex: 1, minWidth: 0 },
  nom: { fontSize: 18, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  membre: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  bandeauIncomplet: { backgroundColor: colors.warningSoft, borderRadius: 12, padding: 12, marginBottom: 16 },
  bandeauTitre: { fontSize: 14, fontWeight: '700', color: colors.warning },
  bandeauTexte: { fontSize: 13, color: colors.warning, marginTop: 4 },
  carte: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  titreSection: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8 },
  ligneLecture: { marginTop: 8 },
  valeurLecture: { fontSize: 15, color: colors.textMuted },
  champ: { marginTop: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
  inputMultiligne: { minHeight: 88, textAlignVertical: 'top' },
  inputErreur: { borderColor: colors.danger },
  aide: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  erreurChamp: { color: colors.danger, fontSize: 12, marginTop: 4 },
  erreurChargement: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  erreurBox: { backgroundColor: colors.dangerSoft, borderRadius: 12, padding: 12, marginBottom: 16 },
  erreurTexte: { color: colors.danger, fontSize: 13 },
  succesBox: { backgroundColor: colors.secondarySoft, borderRadius: 12, padding: 12, marginBottom: 16 },
  succesTexte: { color: colors.secondary, fontSize: 13, fontWeight: '600' },
  boutonPrincipal: {
    minHeight: 48,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonPrincipalTexte: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  boutonSecondaire: {
    minHeight: 48,
    marginTop: 14,
    backgroundColor: colors.secondarySoft,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonSecondaireTexte: { color: colors.secondary, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  boutonDeconnexion: {
    minHeight: 48,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  boutonDeconnexionTexte: { color: colors.danger, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  boutonPleineLargeur: { alignSelf: 'stretch' },
  desactive: { opacity: 0.6 },
});
