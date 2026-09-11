import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Badge from '../components/Badge';
import SinistreTimeline from '../components/SinistreTimeline';
import { colors } from '../theme/colors';
import { SINISTRE_STATUS_VARIANTS } from '../theme/statusVariants';
import { fetchSinistres } from '../api/sinistres';

// Liste des sinistres du client connecté (le backend filtre déjà par rôle,
// cf. sinistres/views.py:SinistreListView) + accès à la déclaration d'un
// nouveau sinistre.
export default function SinistresScreen({ navigation }) {
  const [sinistres, setSinistres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const charger = useCallback(async () => {
    try {
      setError('');
      const data = await fetchSinistres();
      setSinistres(data);
    } catch {
      setError('Impossible de charger vos sinistres.');
    }
  }, []);

  // Recharge chaque fois que l'écran redevient actif (ex. retour depuis
  // l'écran de déclaration) — plus fiable qu'un callback/param passé à la
  // navigation pour refléter tout de suite un sinistre qui vient d'être créé.
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

  const renderItem = ({ item: sinistre }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.numero}>{sinistre.numero_sinistre}</Text>
        <Badge variant={SINISTRE_STATUS_VARIANTS[sinistre.statut] || 'neutral'}>
          {sinistre.statut_display || sinistre.statut}
        </Badge>
      </View>

      <Text style={styles.type}>{sinistre.type_sinistre_display || sinistre.type_sinistre}</Text>
      <Text style={styles.meta}>Contrat : {sinistre.contrat?.numero_contrat}</Text>
      <Text style={styles.meta}>
        Déclaré le {new Date(sinistre.date_declaration).toLocaleDateString('fr-FR')}
      </Text>

      {sinistre.description ? <Text style={styles.description}>{sinistre.description}</Text> : null}

      <View style={styles.montantsRow}>
        <View style={styles.montantBloc}>
          <Text style={styles.montant}>
            {Number(sinistre.montant_reclame).toLocaleString('fr-FR')} FCFA
          </Text>
          <Text style={styles.montantLabel}>Montant réclamé</Text>
        </View>
        {sinistre.montant_indemnite ? (
          <View style={styles.montantBloc}>
            <Text style={[styles.montant, styles.indemnite]}>
              {Number(sinistre.montant_indemnite).toLocaleString('fr-FR')} FCFA
            </Text>
            <Text style={styles.montantLabel}>Indemnité</Text>
          </View>
        ) : null}
      </View>

      {sinistre.commentaire ? (
        <View style={styles.commentaireBox}>
          <Text style={styles.commentaireLabel}>Note compagnie</Text>
          <Text style={styles.commentaireTexte}>{sinistre.commentaire}</Text>
        </View>
      ) : null}

      <SinistreTimeline statut={sinistre.statut} />
    </View>
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
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={sinistres}
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
              <Text style={styles.emptyText}>Aucun sinistre déclaré.</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('DeclarerSinistre')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyButtonText}>Déclarer mon premier sinistre</Text>
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
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 16 },
  emptyButton: {
    backgroundColor: colors.secondarySoft,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: { color: colors.secondary, fontSize: 14, fontWeight: '700' },
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
  numero: { fontSize: 16, fontWeight: '700', color: colors.text },
  type: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  meta: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  description: { fontSize: 13, color: colors.textMuted, marginTop: 8 },
  montantsRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 12,
  },
  montantBloc: {},
  montant: { fontSize: 16, fontWeight: '700', color: colors.primary },
  indemnite: { color: colors.secondary },
  montantLabel: { fontSize: 11, color: colors.textLight, marginTop: 1 },
  commentaireBox: {
    marginTop: 10,
    backgroundColor: colors.secondarySoft,
    borderRadius: 10,
    padding: 10,
  },
  commentaireLabel: { fontSize: 11, fontWeight: '700', color: colors.secondary },
  commentaireTexte: { fontSize: 13, color: colors.secondary, marginTop: 2 },
});
