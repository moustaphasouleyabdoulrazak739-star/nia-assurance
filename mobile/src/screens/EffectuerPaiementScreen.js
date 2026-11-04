import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SelectField from '../components/SelectField';
import { colors } from '../theme/colors';
import { formaterMontant } from '../utils/format';
import { fetchContrats } from '../api/contrats';
import { extraireErreursChamps } from '../api/sinistres';
import { creerPaiement, fetchPaiements, METHODES_MOBILE_MONEY, METHODES_PAIEMENT } from '../api/paiements';
import { idsContratsEnAttente, marquerContratEnAttente, messageTropDeTentatives } from '../utils/paiements';
import { messageErreurChargement, messageErreurEnvoi } from '../utils/reseau';

const CHAMPS_VIDES = { contrat: '', montant: '', methode: '', reference: '' };

// Enregistrement d'un paiement — même parcours que la modale "Effectuer un
// paiement" du web (frontend/src/pages/Paiements.jsx) : montant repris de
// la prime du contrat et non modifiable, numéro de téléphone exigé pour
// MyNITA/AmanaTa. Aucune vraie API de paiement n'est appelée : le paiement
// est créé EN_ATTENTE (POST /api/paiements/create/) puis validé par un agent.
// Liste limitée aux contrats ACTIF : le backend rejette les autres
// (PaiementCreateSerializer.validate).
export default function EffectuerPaiementScreen({ navigation, route }) {
  const [contrats, setContrats] = useState([]);
  const [contratsChargement, setContratsChargement] = useState(true);
  const [contratsErreur, setContratsErreur] = useState('');
  // Contrats ayant déjà un paiement EN_ATTENTE (refusé par le serveur),
  // signalés dans la liste. Chargement facultatif : en cas d'échec, la
  // liste reste utilisable et le serveur garde le dernier mot.
  const [contratsEnAttente, setContratsEnAttente] = useState(new Set());
  const [form, setForm] = useState(CHAMPS_VIDES);
  const [erreurs, setErreurs] = useState({});
  const [erreurGenerale, setErreurGenerale] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchContrats();
        setContrats(data.filter((contrat) => contrat.statut === 'ACTIF'));
      } catch (err) {
        setContratsErreur(messageErreurChargement(err, 'Impossible de charger vos contrats.'));
      } finally {
        setContratsChargement(false);
      }
    })();
    (async () => {
      try {
        setContratsEnAttente(idsContratsEnAttente(await fetchPaiements()));
      } catch {
        // Marquage indicatif seulement, voir plus haut.
      }
    })();
  }, []);

  // Contrat présélectionné (paramètre `contratId`, ex. bouton "Payer ma
  // prime" de l'accueil), appliqué une fois les contrats chargés, puis à
  // chaque nouvel id reçu (l'écran déjà ouvert reçoit alors de nouveaux
  // paramètres). Ajustement pendant le rendu plutôt qu'un effet, comme le
  // recommande React. Id absent des contrats actifs : rien n'est choisi.
  const contratIdDemande = route?.params?.contratId;
  const [preselectionTraitee, setPreselectionTraitee] = useState(null);
  if (contratIdDemande != null && !contratsChargement && String(contratIdDemande) !== preselectionTraitee) {
    setPreselectionTraitee(String(contratIdDemande));
    const contrat = contrats.find((c) => String(c.id) === String(contratIdDemande));
    if (contrat) {
      setForm((prev) => ({ ...prev, contrat: contrat.id, montant: contrat.montant_prime }));
    }
  }

  const estMobileMoney = METHODES_MOBILE_MONEY.includes(form.methode);

  const majChamp = (champ, valeur) => {
    setForm((prev) => ({ ...prev, [champ]: valeur }));
    setErreurs((prev) => ({ ...prev, [champ]: undefined }));
  };

  const choisirContrat = (id) => {
    const contrat = contrats.find((c) => c.id === id);
    setForm((prev) => ({ ...prev, contrat: id, montant: contrat ? contrat.montant_prime : '' }));
    setErreurs((prev) => ({ ...prev, contrat: undefined, montant: undefined }));
  };

  const optionsContrats = contrats.map((contrat) => ({
    value: contrat.id,
    label: marquerContratEnAttente(
      `${contrat.numero_contrat} - ${contrat.type_assurance_display || contrat.type_assurance}`,
      contrat.id,
      contratsEnAttente,
    ),
  }));

  // Champs requis du formulaire web (attribut `required`), vérifiés ici
  // avant l'envoi puisqu'il n'y a pas de validation native de formulaire.
  const validerLocalement = () => {
    const manquants = {};
    if (!form.contrat) manquants.contrat = 'Choisissez un contrat.';
    if (!form.methode) manquants.methode = 'Choisissez un mode de paiement.';
    if (estMobileMoney && !form.reference.trim()) {
      manquants.reference = 'Le numéro de téléphone est obligatoire pour ce mode de paiement.';
    }
    setErreurs(manquants);
    return Object.keys(manquants).length === 0;
  };

  const handleSubmit = async () => {
    setErreurGenerale('');
    if (!validerLocalement()) return;
    setEnvoiEnCours(true);
    try {
      await creerPaiement({ ...form, reference: form.reference.trim() });
      navigation.goBack();
    } catch (err) {
      // 429 : throttle de création (5/min), message clair plutôt que le
      // texte DRF.
      const tropDeTentatives = messageTropDeTentatives(err);
      if (tropDeTentatives) {
        setErreurGenerale(tropDeTentatives);
        return;
      }
      const champs = extraireErreursChamps(err);
      // `detail` (erreur DRF sans champ) s'affiche en message général, pas
      // sous un champ inexistant.
      const { non_field_errors: nonChamp, detail, ...parChamp } = champs;
      const general = nonChamp || detail;
      if (Object.keys(parChamp).length > 0) setErreurs(parChamp);
      if (general || Object.keys(parChamp).length === 0) {
        setErreurGenerale(general || messageErreurEnvoi(err, 'Erreur lors du paiement. Vérifiez les informations.'));
      }
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const libelleReference = estMobileMoney
    ? `Numéro de téléphone ${form.methode === 'MYNITA' ? 'MyNITA' : 'AmanaTa'}`
    : 'Référence (optionnel)';

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.notice}>
          {
            "Le paiement est enregistré en attente de validation par NIA Assurance. Aucun montant n'est prélevé depuis l'application."
          }
        </Text>

        {contratsErreur ? <Text style={styles.error}>{contratsErreur}</Text> : null}

        {!contratsChargement && !contratsErreur && contrats.length === 0 && (
          <Text style={styles.info}>Aucun contrat actif : un paiement nécessite un contrat actif.</Text>
        )}

        {erreurGenerale ? <Text style={styles.error}>{erreurGenerale}</Text> : null}

        <SelectField
          label="Contrat à payer"
          placeholder={contratsChargement ? 'Chargement...' : 'Choisir un contrat'}
          value={form.contrat}
          options={optionsContrats}
          onChange={choisirContrat}
          error={erreurs.contrat}
        />

        <Text style={styles.label}>Montant</Text>
        <View
          style={[styles.montantBox, erreurs.montant && styles.inputError]}
          accessible
          accessibilityLabel={`Montant, ${formaterMontant(form.montant) || 'aucun contrat choisi'}, fixé par le contrat, non modifiable`}
        >
          <Text style={form.montant ? styles.montantValeur : styles.placeholder}>
            {formaterMontant(form.montant) || 'Sélectionner un contrat'}
          </Text>
        </View>
        <Text style={erreurs.montant ? styles.fieldError : styles.hint}>
          {erreurs.montant || 'Montant égal à la prime du contrat, non modifiable'}
        </Text>

        <View style={styles.espace} />
        <SelectField
          label="Mode de paiement"
          placeholder="Choisir le mode"
          value={form.methode}
          options={METHODES_PAIEMENT}
          onChange={(valeur) => majChamp('methode', valeur)}
          error={erreurs.methode}
        />

        <Text style={styles.label}>{libelleReference}</Text>
        <TextInput
          style={[styles.input, erreurs.reference && styles.inputError]}
          value={form.reference}
          onChangeText={(valeur) => majChamp('reference', valeur)}
          placeholder={estMobileMoney ? 'Ex : 96000000' : 'Référence du virement ou reçu'}
          placeholderTextColor={colors.textLight}
          keyboardType={estMobileMoney ? 'phone-pad' : 'default'}
          maxLength={100}
        />
        {erreurs.reference ? <Text style={styles.fieldError}>{erreurs.reference}</Text> : null}

        <TouchableOpacity
          style={[styles.submit, (envoiEnCours || !form.montant) && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={envoiEnCours || !form.montant}
          activeOpacity={0.85}
        >
          {envoiEnCours ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Payer</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 20, paddingBottom: 40 },
  notice: {
    color: colors.info,
    fontSize: 13,
    marginBottom: 16,
    backgroundColor: colors.infoSoft,
    borderRadius: 10,
    padding: 10,
  },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  info: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
    backgroundColor: colors.warningSoft,
    borderRadius: 10,
    padding: 10,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
  montantBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.neutralSoft,
  },
  montantValeur: { fontSize: 15, fontWeight: '700', color: colors.neutral },
  placeholder: { fontSize: 15, color: colors.textLight },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  espace: { height: 8 },
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
  inputError: { borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: 4 },
  submit: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
