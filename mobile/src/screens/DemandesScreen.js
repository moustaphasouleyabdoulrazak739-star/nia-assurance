import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Badge from '../components/Badge';
import { colors } from '../theme/colors';
import { DEMANDE_STATUS_VARIANTS } from '../theme/statusVariants';
import { fetchDemandes } from '../api/demandes';
import { messageErreurChargement } from '../utils/reseau';
import { formaterDate } from '../utils/format';
import { idsDejaResoumises, libelleStatut, libelleTypeAssurance, peutResoumettre } from '../utils/demandes';

// Demandes de contrat du client connecté (le backend filtre déjà par rôle,
// cf. demandes/views.py:DemandeListView). Une demande rejetée peut être
// corrigée et renvoyée une fois (nouvelle demande liée à l'ancienne).
export default function DemandesScreen({ navigation }) {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const charger = useCallback(async () => {
    try {
      setError('');
      setDemandes(await fetchDemandes());
    } catch (err) {
      setError(messageErreurChargement(err, 'Impossible de charger vos demandes.'));
    }
  }, []);

  // Recharge à chaque retour sur l'écran (ex. après un envoi), comme la
  // liste des sinistres.
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

  const dejaResoumises = useMemo(() => idsDejaResoumises(demandes), [demandes]);
  const numeroParId = useMemo(() => new Map(demandes.map((d) => [d.id, d.numero_demande])), [demandes]);

  const renderItem = ({ item: demande }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.numero}>{demande.numero_demande}</Text>
        <Badge variant={DEMANDE_STATUS_VARIANTS[demande.statut] || 'neutral'}>{libelleStatut(demande)}</Badge>
      </View>

      <Text style={styles.type}>{libelleTypeAssurance(demande)}</Text>
      <Text style={styles.meta}>Envoyée le {formaterDate(demande.date_demande)}</Text>
      {demande.demande_precedente ? (
        <Text style={styles.meta}>
          Renvoi de la demande {numeroParId.get(demande.demande_precedente) || 'rejetée'}
        </Text>
      ) : null}
      {demande.documents?.length ? (
        <Text style={styles.meta}>
          Pièces : {demande.documents.map((doc) => doc.type_document_display || doc.type_document).join(', ')}
        </Text>
      ) : null}

      {demande.statut === 'REJETEE' && demande.motif_rejet ? (
        <View style={styles.motifBox}>
          <Text style={styles.motifLabel}>Motif du rejet</Text>
          <Text style={styles.motifTexte}>{demande.motif_rejet}</Text>
        </View>
      ) : null}

      {demande.statut === 'VALIDEE' && demande.contrat ? (
        <View style={styles.contratBox}>
          <Text style={styles.contratTexte}>Contrat créé : {demande.contrat.numero_contrat}</Text>
        </View>
      ) : null}

      {peutResoumettre(demande, dejaResoumises) ? (
        <TouchableOpacity
          style={styles.corrigerButton}
          onPress={() => navigation.navigate('NouvelleDemande', { demande })}
          activeOpacity={0.85}
        >
          <Text style={styles.corrigerButtonText}>Corriger et renvoyer</Text>
        </TouchableOpacity>
      ) : null}
      {demande.statut === 'REJETEE' && dejaResoumises.has(demande.id) ? (
        <Text style={styles.dejaRenvoyee}>Demande déjà corrigée et renvoyée.</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.secondary} />
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
          data={demandes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.secondary]}
              tintColor={colors.secondary}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Aucune demande envoyée pour l&apos;instant.</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('NouvelleDemande')}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyButtonText}>Demander un contrat</Text>
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
    backgroundColor: colors.secondarySoft,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryButtonText: { color: colors.secondary, fontSize: 13, fontWeight: '700' },
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
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  numero: { fontSize: 16, fontWeight: '700', color: colors.text },
  type: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  meta: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  motifBox: { marginTop: 10, backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 10 },
  motifLabel: { fontSize: 11, fontWeight: '700', color: colors.danger },
  motifTexte: { fontSize: 13, color: colors.danger, marginTop: 2 },
  contratBox: { marginTop: 10, backgroundColor: colors.secondarySoft, borderRadius: 10, padding: 10 },
  contratTexte: { fontSize: 13, fontWeight: '600', color: colors.secondary },
  corrigerButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  corrigerButtonText: { color: colors.secondary, fontSize: 13, fontWeight: '700' },
  dejaRenvoyee: { marginTop: 10, fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
});
