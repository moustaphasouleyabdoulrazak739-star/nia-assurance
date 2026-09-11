import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Badge from '../components/Badge';
import { colors } from '../theme/colors';
import { CONTRAT_STATUS_VARIANTS } from '../theme/statusVariants';
import { estEcheanceProche } from '../utils/dates';
import { fetchContrats, telechargerAttestation } from '../api/contrats';

// Liste des contrats du client connecté (le backend filtre déjà par rôle,
// cf. contrats/views.py:ContratListView) + téléchargement de l'attestation
// PDF pour un contrat ACTIF.
export default function ContratsScreen() {
  const [contrats, setContrats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [telechargementEnCoursId, setTelechargementEnCoursId] = useState(null);
  const [telechargementError, setTelechargementError] = useState('');

  const charger = useCallback(async () => {
    try {
      setError('');
      const data = await fetchContrats();
      setContrats(data);
    } catch {
      setError('Impossible de charger vos contrats.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await charger();
      setLoading(false);
    })();
  }, [charger]);

  const onRefresh = async () => {
    setRefreshing(true);
    await charger();
    setRefreshing(false);
  };

  const handleTelecharger = async (contrat) => {
    setTelechargementEnCoursId(contrat.id);
    setTelechargementError('');
    try {
      await telechargerAttestation(contrat);
    } catch (err) {
      setTelechargementError(err.message || "Impossible de télécharger l'attestation.");
    } finally {
      setTelechargementEnCoursId(null);
    }
  };

  const renderItem = ({ item: contrat }) => {
    const echeanceProche = estEcheanceProche(contrat);
    const enCoursDeTelechargement = telechargementEnCoursId === contrat.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.numero}>{contrat.numero_contrat}</Text>
          <Text style={styles.montant}>
            {Number(contrat.montant_prime).toLocaleString('fr-FR')} FCFA
          </Text>
        </View>

        <Text style={styles.type}>
          {contrat.type_assurance_display || contrat.type_assurance}
        </Text>
        <Text style={styles.dates}>
          Du {contrat.date_debut} au {contrat.date_fin}
        </Text>

        <View style={styles.badgeRow}>
          <Badge variant={CONTRAT_STATUS_VARIANTS[contrat.statut] || 'neutral'}>
            {contrat.statut_display || contrat.statut}
          </Badge>
          {echeanceProche && <Badge variant="warning">Échéance proche</Badge>}
        </View>

        {contrat.statut === 'ACTIF' && (
          <TouchableOpacity
            style={[styles.downloadButton, enCoursDeTelechargement && styles.downloadButtonDisabled]}
            onPress={() => handleTelecharger(contrat)}
            disabled={enCoursDeTelechargement}
            activeOpacity={0.8}
          >
            {enCoursDeTelechargement ? (
              <ActivityIndicator color={colors.secondary} size="small" />
            ) : (
              <Text style={styles.downloadButtonText}>{"Télécharger l'attestation"}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={contrats}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            telechargementError ? <Text style={styles.downloadError}>{telechargementError}</Text> : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Aucun contrat pour le moment.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  error: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  downloadError: {
    color: colors.danger,
    fontSize: 13,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  numero: { fontSize: 16, fontWeight: '700', color: colors.text },
  montant: { fontSize: 16, fontWeight: '700', color: colors.primary },
  type: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  dates: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  downloadButton: {
    marginTop: 14,
    backgroundColor: colors.secondarySoft,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  downloadButtonDisabled: { opacity: 0.7 },
  downloadButtonText: { color: colors.secondary, fontSize: 13, fontWeight: '700' },
});
