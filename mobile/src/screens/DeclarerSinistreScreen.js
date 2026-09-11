import { useEffect, useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SelectField from '../components/SelectField';
import DateField from '../components/DateField';
import { colors } from '../theme/colors';
import { fetchContrats } from '../api/contrats';
import { creerSinistre, extraireErreursChamps, TYPES_SINISTRE } from '../api/sinistres';

const CHAMPS_VIDES = {
  contrat: '',
  type_sinistre: '',
  date_sinistre: '',
  description: '',
  montant_reclame: '',
};

// Un sinistre ne peut pas être daté dans le futur — le backend n'impose pas
// cette contrainte (SinistreCreateSerializer.validate ne vérifie que le
// contrat, pas la date : vérifié dans sinistres/serializers.py), donc ce
// n'est pas le miroir d'une règle serveur, juste une garde-fou côté client.
const AUJOURDHUI = new Date();

// Déclaration d'un nouveau sinistre — POST /api/sinistres/create/. Le
// backend rejette déjà un contrat non ACTIF ou n'appartenant pas au client
// (SinistreCreateSerializer.validate) ; la liste proposée ici est filtrée
// aux contrats ACTIF pour éviter une soumission vouée à l'échec.
export default function DeclarerSinistreScreen({ navigation }) {
  const [contrats, setContrats] = useState([]);
  const [contratsErreur, setContratsErreur] = useState('');
  const [form, setForm] = useState(CHAMPS_VIDES);
  const [erreurs, setErreurs] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchContrats();
        setContrats(data.filter((contrat) => contrat.statut === 'ACTIF'));
      } catch {
        setContratsErreur('Impossible de charger vos contrats.');
      }
    })();
  }, []);

  const majChamp = (champ, valeur) => {
    setForm((prev) => ({ ...prev, [champ]: valeur }));
    setErreurs((prev) => ({ ...prev, [champ]: undefined }));
  };

  const optionsContrats = contrats.map((contrat) => ({
    value: contrat.id,
    label: `${contrat.numero_contrat} - ${contrat.type_assurance_display || contrat.type_assurance}`,
  }));

  const handleSubmit = async () => {
    setErreurGenerale('');
    setEnvoiEnCours(true);
    try {
      await creerSinistre(form);
      navigation.goBack();
    } catch (err) {
      const champs = extraireErreursChamps(err);
      if (Object.keys(champs).length > 0) {
        setErreurs(champs);
      } else {
        setErreurGenerale('Erreur lors de la déclaration. Vérifiez les informations.');
      }
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {contratsErreur ? <Text style={styles.error}>{contratsErreur}</Text> : null}

        {!contratsErreur && contrats.length === 0 && (
          <Text style={styles.info}>
            Aucun contrat actif : une déclaration de sinistre nécessite un contrat actif.
          </Text>
        )}

        {erreurGenerale ? <Text style={styles.error}>{erreurGenerale}</Text> : null}

        <SelectField
          label="Contrat concerné"
          placeholder="Choisir un contrat"
          value={form.contrat}
          options={optionsContrats}
          onChange={(valeur) => majChamp('contrat', valeur)}
          error={erreurs.contrat}
        />

        <SelectField
          label="Type de sinistre"
          placeholder="Choisir le type"
          value={form.type_sinistre}
          options={TYPES_SINISTRE}
          onChange={(valeur) => majChamp('type_sinistre', valeur)}
          error={erreurs.type_sinistre}
        />

        <DateField
          label="Date du sinistre"
          value={form.date_sinistre}
          onChange={(valeur) => majChamp('date_sinistre', valeur)}
          maximumDate={AUJOURDHUI}
          error={erreurs.date_sinistre}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea, erreurs.description && styles.inputError]}
          value={form.description}
          onChangeText={(valeur) => majChamp('description', valeur)}
          placeholder="Décrivez le sinistre..."
          placeholderTextColor={colors.textLight}
          multiline
          numberOfLines={4}
        />
        {erreurs.description ? <Text style={styles.fieldError}>{erreurs.description}</Text> : null}

        <Text style={styles.label}>Montant réclamé (FCFA)</Text>
        <TextInput
          style={[styles.input, erreurs.montant_reclame && styles.inputError]}
          value={form.montant_reclame}
          onChangeText={(valeur) => majChamp('montant_reclame', valeur)}
          placeholder="Ex : 150000"
          placeholderTextColor={colors.textLight}
          keyboardType="numeric"
        />
        {erreurs.montant_reclame ? <Text style={styles.fieldError}>{erreurs.montant_reclame}</Text> : null}

        <TouchableOpacity
          style={[styles.submit, envoiEnCours && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={envoiEnCours}
          activeOpacity={0.85}
        >
          {envoiEnCours ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Déclarer</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 12,
  },
  info: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
    backgroundColor: colors.warningSoft,
    borderRadius: 10,
    padding: 10,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: 4 },
  submit: {
    marginTop: 24,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
