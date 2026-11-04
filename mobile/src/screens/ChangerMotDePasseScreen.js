import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { changerMotDePasse } from '../api/profil';
import { estErreurReseau } from '../utils/reseau';
import {
  extraireErreursMotDePasse,
  LONGUEUR_MIN_MOT_DE_PASSE,
  validerChangementMotDePasse,
} from '../utils/profil';

const VIDE = { old_password: '', new_password: '', new_password2: '' };

const MESSAGE_RESEAU =
  "Le serveur n'a pas répondu. Votre mot de passe a peut-être été modifié : en cas de doute, essayez le nouveau à la prochaine connexion.";

// Changement de mot de passe (POST /api/auth/change-password/). Route
// 'ChangerMotDePasse' de la pile de l'onglet Profil. La confirmation n'est
// contrôlée que côté client, comme sur le web ; le serveur vérifie l'ancien
// mot de passe et applique les validateurs Django (longueur, mot de passe
// courant, entièrement numérique).
export default function ChangerMotDePasseScreen({ navigation }) {
  const [form, setForm] = useState(VIDE);
  const [erreurs, setErreurs] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [afficher, setAfficher] = useState(false);
  const envoiRef = useRef(false);
  const nouveauRef = useRef(null);
  const confirmationRef = useRef(null);

  const modifier = (champ) => (valeur) => {
    setForm((prev) => ({ ...prev, [champ]: valeur }));
    setErreurs((prev) => ({ ...prev, [champ]: undefined }));
    setErreurGenerale('');
  };

  const soumettre = async () => {
    if (envoiRef.current) return;
    const locales = validerChangementMotDePasse(form);
    setErreurs(locales);
    if (Object.keys(locales).length) {
      setErreurGenerale('');
      return;
    }
    envoiRef.current = true;
    setEnvoi(true);
    setErreurGenerale('');
    try {
      const resultat = await changerMotDePasse(form.old_password, form.new_password);
      setForm(VIDE);
      Alert.alert('Mot de passe modifié', resultat?.message || 'Votre mot de passe a été modifié avec succès.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      if (estErreurReseau(err)) {
        setErreurGenerale(MESSAGE_RESEAU);
      } else {
        const { champs, general } = extraireErreursMotDePasse(err);
        setErreurs(champs);
        setErreurGenerale(
          general || (Object.keys(champs).length ? '' : 'Erreur lors du changement de mot de passe.'),
        );
      }
    } finally {
      envoiRef.current = false;
      setEnvoi(false);
    }
  };

  const proprietesCommunes = {
    style: styles.input,
    placeholderTextColor: colors.textLight,
    secureTextEntry: !afficher,
    autoCapitalize: 'none',
    autoCorrect: false,
    editable: !envoi,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.intro}>
          Choisissez un mot de passe d&apos;au moins {LONGUEUR_MIN_MOT_DE_PASSE} caractères, pas uniquement
          composé de chiffres ni trop courant.
        </Text>

        <View style={styles.carte}>
          <Text style={styles.label}>Mot de passe actuel</Text>
          <TextInput
            {...proprietesCommunes}
            style={[styles.input, erreurs.old_password && styles.inputErreur]}
            value={form.old_password}
            onChangeText={modifier('old_password')}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => nouveauRef.current?.focus()}
          />
          {erreurs.old_password ? <Text style={styles.erreurChamp}>{erreurs.old_password}</Text> : null}

          <Text style={[styles.label, styles.labelSuivant]}>Nouveau mot de passe</Text>
          <TextInput
            {...proprietesCommunes}
            ref={nouveauRef}
            style={[styles.input, erreurs.new_password && styles.inputErreur]}
            value={form.new_password}
            onChangeText={modifier('new_password')}
            placeholder={`${LONGUEUR_MIN_MOT_DE_PASSE} caractères minimum`}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => confirmationRef.current?.focus()}
          />
          {erreurs.new_password ? <Text style={styles.erreurChamp}>{erreurs.new_password}</Text> : null}

          <Text style={[styles.label, styles.labelSuivant]}>Confirmer le nouveau mot de passe</Text>
          <TextInput
            {...proprietesCommunes}
            ref={confirmationRef}
            style={[styles.input, erreurs.new_password2 && styles.inputErreur]}
            value={form.new_password2}
            onChangeText={modifier('new_password2')}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            onSubmitEditing={soumettre}
          />
          {erreurs.new_password2 ? <Text style={styles.erreurChamp}>{erreurs.new_password2}</Text> : null}

          <TouchableOpacity
            style={styles.afficher}
            onPress={() => setAfficher((v) => !v)}
            activeOpacity={0.7}
            accessibilityRole="switch"
            accessibilityState={{ checked: afficher }}
          >
            <Text style={styles.afficherTexte}>
              {afficher ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}
            </Text>
          </TouchableOpacity>
        </View>

        {erreurGenerale ? (
          <View style={styles.erreurBox}>
            <Text style={styles.erreurTexte}>{erreurGenerale}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.bouton, envoi && styles.desactive]}
          onPress={soumettre}
          disabled={envoi}
          activeOpacity={0.85}
        >
          {envoi ? <ActivityIndicator color="#fff" /> : <Text style={styles.boutonTexte}>Modifier le mot de passe</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  intro: { fontSize: 13, color: colors.textMuted, marginBottom: 14 },
  carte: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  labelSuivant: { marginTop: 14 },
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
  inputErreur: { borderColor: colors.danger },
  erreurChamp: { color: colors.danger, fontSize: 12, marginTop: 4 },
  afficher: { minHeight: 44, justifyContent: 'center', marginTop: 8, alignSelf: 'flex-start' },
  afficherTexte: { color: colors.secondary, fontSize: 13, fontWeight: '700' },
  erreurBox: { backgroundColor: colors.dangerSoft, borderRadius: 12, padding: 12, marginBottom: 16 },
  erreurTexte: { color: colors.danger, fontSize: 13 },
  bouton: {
    minHeight: 48,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonTexte: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  desactive: { opacity: 0.6 },
});
