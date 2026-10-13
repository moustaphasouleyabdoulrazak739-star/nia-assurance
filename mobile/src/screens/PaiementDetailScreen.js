import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Badge from '../components/Badge';
import { colors } from '../theme/colors';
import { PAIEMENT_STATUS_VARIANTS } from '../theme/statusVariants';
import { formaterDateHeure, formaterMontant } from '../utils/format';
import { fetchPaiement, libelleMethode, telechargerRecu } from '../api/paiements';

// Détail d'un paiement. Affiche tout de suite la version reçue de la liste
// (paramètre de navigation) puis la recharge via GET /api/paiements/<id>/
// pour refléter un statut changé entre-temps (ex. validé par un agent).
export default function PaiementDetailScreen({ route }) {
  const [paiement, setPaiement] = useState(route.params.paiement);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [telechargementEnCours, setTelechargementEnCours] = useState(false);
  const [telechargementError, setTelechargementError] = useState('');

  const id = route.params.paiement.id;

  const charger = useCallback(async () => {
    try {
      setError('');
      setPaiement(await fetchPaiement(id));
    } catch {
      setError('Impossible de mettre à jour ce paiement.');
    }
  }, [id]);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const data = await fetchPaiement(id);
        if (!annule) setPaiement(data);
      } catch {
        if (!annule) setError('Impossible de mettre à jour ce paiement.');
      }
    })();
    return () => {
      annule = true;
    };
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await charger();
    setRefreshing(false);
  };

  const handleTelecharger = async () => {
    setTelechargementEnCours(true);
    setTelechargementError('');
    try {
      await telechargerRecu(paiement);
    } catch (err) {
      setTelechargementError(err.message || 'Impossible de télécharger le reçu.');
    } finally {
      setTelechargementEnCours(false);
    }
  };

  const lignes = [
    { label: 'Contrat', valeur: paiement.contrat?.numero_contrat },
    {
      label: "Type d'assurance",
      valeur: paiement.contrat?.type_assurance_display || paiement.contrat?.type_assurance,
    },
    { label: 'Mode de paiement', valeur: libelleMethode(paiement) },
    { label: 'Référence', valeur: paiement.reference },
    { label: 'Date du paiement', valeur: formaterDateHeure(paiement.date_paiement) },
    { label: 'Dernière mise à jour', valeur: formaterDateHeure(paiement.date_modification) },
  ].filter((ligne) => ligne.valeur);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Reçu n°</Text>
          <Text style={styles.numero}>{paiement.numero_recu}</Text>
          <Text style={styles.montant}>{formaterMontant(paiement.montant)}</Text>
          <Badge variant={PAIEMENT_STATUS_VARIANTS[paiement.statut] || 'neutral'} style={styles.badge}>
            {paiement.statut_display || paiement.statut}
          </Badge>
        </View>

        <View style={styles.card}>
          {lignes.map((ligne, index) => (
            <View key={ligne.label} style={[styles.ligne, index > 0 && styles.ligneSeparee]}>
              <Text style={styles.ligneLabel}>{ligne.label}</Text>
              <Text style={styles.ligneValeur}>{ligne.valeur}</Text>
            </View>
          ))}
        </View>

        {paiement.statut === 'VALIDE' ? (
          <>
            <TouchableOpacity
              style={[styles.downloadButton, telechargementEnCours && styles.downloadButtonDisabled]}
              onPress={handleTelecharger}
              disabled={telechargementEnCours}
              activeOpacity={0.8}
            >
              {telechargementEnCours ? (
                <ActivityIndicator color={colors.secondary} size="small" />
              ) : (
                <Text style={styles.downloadButtonText}>Télécharger le reçu</Text>
              )}
            </TouchableOpacity>
            {telechargementError ? <Text style={styles.downloadError}>{telechargementError}</Text> : null}
          </>
        ) : (
          <Text style={styles.info}>
            {paiement.statut === 'EN_ATTENTE'
              ? 'Le reçu sera disponible dès que NIA Assurance aura validé ce paiement.'
              : "Aucun reçu n'est disponible pour ce paiement."}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 16, paddingBottom: 40 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12, paddingHorizontal: 4 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardLabel: { fontSize: 12, color: colors.textMuted },
  numero: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 2 },
  montant: { fontSize: 24, fontWeight: '700', color: colors.primary, marginTop: 10 },
  badge: { marginTop: 12 },
  ligne: { paddingVertical: 10 },
  ligneSeparee: { borderTopWidth: 1, borderTopColor: colors.border },
  ligneLabel: { fontSize: 12, color: colors.textMuted },
  ligneValeur: { fontSize: 15, color: colors.text, marginTop: 2 },
  downloadButton: {
    backgroundColor: colors.secondarySoft,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  downloadButtonDisabled: { opacity: 0.7 },
  downloadButtonText: { color: colors.secondary, fontSize: 14, fontWeight: '700' },
  downloadError: { color: colors.danger, fontSize: 13, marginTop: 10, paddingHorizontal: 4 },
  info: {
    color: colors.textMuted,
    fontSize: 13,
    backgroundColor: colors.warningSoft,
    borderRadius: 10,
    padding: 12,
  },
});
