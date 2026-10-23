import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Badge from '../components/Badge';
import { colors } from '../theme/colors';
import { PAIEMENT_STATUS_VARIANTS } from '../theme/statusVariants';
import { formaterDate, formaterMontant } from '../utils/format';
import { libelleMontant } from '../utils/paiements';
import { fetchPaiements, libelleMethode } from '../api/paiements';
import { messageErreurChargement } from '../utils/reseau';

// Liste des paiements du client connecté (le backend filtre déjà par rôle,
// cf. paiements/views.py:PaiementListView). Un appui ouvre le détail, d'où
// le reçu PDF d'un paiement validé peut être téléchargé.
export default function PaiementsScreen({ navigation }) {
  const [paiements, setPaiements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const charger = useCallback(async () => {
    try {
      setError('');
      const data = await fetchPaiements();
      setPaiements(data);
    } catch (err) {
      setError(messageErreurChargement(err, 'Impossible de charger vos paiements.'));
    }
  }, []);

  // Recharge à chaque retour sur l'écran (ex. après un nouveau paiement),
  // même approche que SinistresScreen.
  useFocusEffect(
    useCallback(() => {
      let annule = false;
      (async () => {
        if (!annule) setLoading(true);
        await charger();
        if (!annule) setLoading(false);
      })();
      return () => {
        annule = true;
      };
    }, [charger]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await charger();
    setRefreshing(false);
  };

  const renderItem = ({ item: paiement }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PaiementDetail', { paiement })}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.numero}>{paiement.numero_recu}</Text>
        <View style={styles.montantBloc}>
          <Text style={styles.montant}>{formaterMontant(paiement.montant)}</Text>
          <Text style={styles.montantLabel}>{libelleMontant(paiement.statut)}</Text>
        </View>
      </View>

      <Text style={styles.contrat}>Contrat {paiement.contrat?.numero_contrat}</Text>
      <Text style={styles.meta}>
        {formaterDate(paiement.date_paiement)} · {libelleMethode(paiement)}
      </Text>

      <View style={styles.badgeRow}>
        <Badge variant={PAIEMENT_STATUS_VARIANTS[paiement.statut] || 'neutral'}>
          {paiement.statut_display || paiement.statut}
        </Badge>
        <Text style={styles.chevron}>{'>'}</Text>
      </View>
    </TouchableOpacity>
  );

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
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.8}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={paiements}
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
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Aucun paiement effectué.</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('EffectuerPaiement')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyButtonText}>Effectuer un paiement</Text>
              </TouchableOpacity>
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
  retryButton: {
    marginTop: 14,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  emptyButton: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 32, flexGrow: 1 },
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
    gap: 8,
  },
  numero: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  montantBloc: { alignItems: 'flex-end' },
  montant: { fontSize: 16, fontWeight: '700', color: colors.primary },
  montantLabel: { fontSize: 11, color: colors.textLight, marginTop: 1 },
  contrat: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  meta: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  chevron: { fontSize: 16, color: colors.textLight, fontWeight: '700' },
});
