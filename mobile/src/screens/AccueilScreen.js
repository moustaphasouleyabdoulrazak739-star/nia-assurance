import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { fetchMe } from '../api/clients';
import { fetchContrats } from '../api/contrats';
import { fetchPaiements } from '../api/paiements';
import { fetchSinistres } from '../api/sinistres';
import { fetchDemandes } from '../api/demandes';
import { TELEPHONE_NIA } from '../config/contact';
import { colors } from '../theme/colors';
import { formaterDate } from '../utils/format';
import { messageErreurChargement } from '../utils/reseau';
import {
  activiteRecente,
  dateRelative,
  echeancesProches,
  libelleBoutonPrime,
  lienTelephone,
  listeDepuisResultat,
  nomClient,
  syntheseAccueil,
  titreEcheance,
  valeurCarte,
} from '../utils/accueil';

const ICONES_ACTIVITE = {
  paiement: 'card-outline',
  sinistre: 'shield-checkmark-outline',
  demande: 'document-text-outline',
};

// Les cinq lectures de l'accueil partent en parallèle (Promise.allSettled) :
// une requête en échec ne masque que sa section (valeur "?"), le reste
// s'affiche. Chaque GET bénéficie déjà du délai maximal et de la nouvelle
// tentative réseau de api/client.js.
async function chargerDonnees() {
  const resultats = await Promise.allSettled([
    fetchMe(),
    fetchContrats(),
    fetchPaiements(),
    fetchSinistres(),
    fetchDemandes(),
  ]);
  const [profil, ...reponsesListes] = resultats;
  const [contrats, paiements, sinistres, demandes] = reponsesListes.map(listeDepuisResultat);
  const listes = [contrats, paiements, sinistres, demandes];
  const premierEchec = resultats.slice(1).find((r) => r.status === 'rejected');
  return {
    profil: profil.status === 'fulfilled' ? profil.value : null,
    contrats,
    paiements,
    sinistres,
    demandes,
    toutEnEchec: listes.every((l) => l === null),
    partielEnEchec: listes.some((l) => l === null),
    erreur: messageErreurChargement(premierEchec?.reason, 'Impossible de charger votre espace client.'),
  };
}

// Accueil de l'espace client (maquette validée) : synthèse, échéance
// proche, actions rapides, activité récente et aide.
export default function AccueilScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const estAffiche = useIsFocused();
  const [donnees, setDonnees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const charger = useCallback(async () => {
    setDonnees(await chargerDonnees());
  }, []);

  // Recharge à chaque retour sur l'onglet (ex. après un paiement), sans
  // réafficher le grand indicateur de chargement une fois les données là.
  useFocusEffect(
    useCallback(() => {
      let annule = false;
      (async () => {
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

  const reessayer = async () => {
    setLoading(true);
    await charger();
    setLoading(false);
  };

  // Navigation vers un écran d'un autre onglet. initial: false garde la
  // liste de l'onglet sous l'écran ouvert, pour que "Retour" y ramène.
  const ouvrir = (onglet, ecran, params) =>
    navigation.navigate(onglet, { screen: ecran, params, initial: false });

  const appeler = async () => {
    try {
      await Linking.openURL(lienTelephone(TELEPHONE_NIA));
    } catch {
      Alert.alert('Appel impossible', `Composez le ${TELEPHONE_NIA} depuis votre téléphone.`);
    }
  };

  const statutBar = estAffiche ? <StatusBar style="light" /> : null;

  if (loading && !donnees) {
    return (
      <View style={styles.centered}>
        {statutBar}
        <ActivityIndicator size="large" color={colors.accueilHeader} />
      </View>
    );
  }

  if (donnees?.toutEnEchec) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="cloud-offline-outline" size={44} color={colors.textLight} />
        <Text style={styles.erreurTexte}>{donnees.erreur}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={reessayer} activeOpacity={0.8} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.accueilHeader} />
          ) : (
            <Text style={styles.retryButtonText}>Réessayer</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { profil, contrats, paiements, sinistres, demandes } = donnees;
  const synthese = syntheseAccueil({ contrats, paiements, sinistres });
  const echeances = echeancesProches(contrats, paiements);
  const activites = activiteRecente({ paiements, sinistres, demandes });
  const activitesIndisponibles = paiements === null && sinistres === null && demandes === null;
  const telephone = lienTelephone(TELEPHONE_NIA);
  const nom = nomClient(profil, user) || 'Client NIA';

  const cartes = [
    {
      cle: 'contrats',
      icone: 'document-text-outline',
      valeur: synthese.contratsActifs,
      libelle: 'Contrats actifs',
      onPress: () => navigation.navigate('ContratsTab', { screen: 'Contrats' }),
    },
    {
      cle: 'paiements',
      icone: 'time-outline',
      valeur: synthese.paiementsEnAttente,
      libelle: 'Paiements en attente',
      onPress: () => navigation.navigate('PaiementsTab', { screen: 'Paiements' }),
    },
    {
      cle: 'sinistres',
      icone: 'shield-checkmark-outline',
      valeur: synthese.sinistresEnCours,
      libelle: 'Sinistres en cours',
      onPress: () => navigation.navigate('SinistresTab', { screen: 'Sinistres' }),
    },
  ];

  const actions = [
    {
      cle: 'sinistre',
      icone: 'alert-circle-outline',
      libelle: 'Déclarer un sinistre',
      onPress: () => ouvrir('SinistresTab', 'DeclarerSinistre'),
    },
    {
      cle: 'paiement',
      icone: 'wallet-outline',
      libelle: 'Payer une prime',
      onPress: () => ouvrir('PaiementsTab', 'EffectuerPaiement'),
    },
    {
      cle: 'attestation',
      icone: 'ribbon-outline',
      libelle: 'Mon attestation',
      onPress: () => navigation.navigate('ContratsTab', { screen: 'Contrats' }),
    },
    {
      cle: 'demande',
      icone: 'add-circle-outline',
      libelle: 'Nouvelle demande de contrat',
      onPress: () => navigation.navigate('NouvelleDemande'),
    },
  ];

  const ouvrirActivite = (activite) => {
    if (activite.type === 'paiement') ouvrir('PaiementsTab', 'PaiementDetail', { paiement: activite.element });
    else if (activite.type === 'sinistre') navigation.navigate('SinistresTab', { screen: 'Sinistres' });
    else navigation.navigate('Demandes');
  };

  return (
    <View style={styles.safe}>
      {statutBar}
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accueilHeader]}
            tintColor="#fff"
            progressViewOffset={insets.top}
          />
        }
      >
        <View style={[styles.entete, { paddingTop: insets.top + 16 }]}>
          <View style={styles.enteteLigne}>
            <View style={styles.logoFond}>
              <Image source={require('../../assets/logo-nia.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.enteteTextes}>
              <Text style={styles.bonjour}>Bonjour,</Text>
              <Text style={styles.nom} numberOfLines={1}>
                {nom}
              </Text>
            </View>
          </View>
          <Text style={styles.sousTitre} numberOfLines={2}>
            Votre espace client NIA Assurance
          </Text>
        </View>

        <View style={[styles.cartes, styles.marges]}>
          {cartes.map((carte) => (
            <TouchableOpacity
              key={carte.cle}
              style={styles.carte}
              onPress={carte.onPress}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${carte.libelle} : ${valeurCarte(carte.valeur)}`}
            >
              <Ionicons name={carte.icone} size={20} color={colors.accueilHeader} />
              <Text style={styles.carteValeur} numberOfLines={1}>
                {valeurCarte(carte.valeur)}
              </Text>
              <Text style={styles.carteLibelle} numberOfLines={2}>
                {carte.libelle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {donnees.partielEnEchec ? (
          <View style={[styles.bandeau, styles.marges]}>
            <Text style={styles.bandeauTexte}>
              {"Certaines informations n'ont pas pu être chargées (valeurs « ? »)."}
            </Text>
            <TouchableOpacity onPress={onRefresh} style={styles.bandeauBouton} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {echeances.map(({ contrat, jours, paiementEnAttente }) => (
          <View key={contrat.id} style={[styles.echeance, styles.marges]}>
            <View style={styles.echeanceTete}>
              <Ionicons name="alarm-outline" size={22} color={colors.accueilHeader} />
              <Text style={styles.echeanceTitre} numberOfLines={1}>
                {titreEcheance(jours)}
              </Text>
            </View>
            <Text style={styles.echeanceDetail} numberOfLines={2}>
              {contrat.type_assurance_display || contrat.type_assurance} · {contrat.numero_contrat}
            </Text>
            <Text style={styles.echeanceDate}>Fin le {formaterDate(contrat.date_fin)}</Text>
            {paiementEnAttente ? (
              <View style={styles.enAttente}>
                <Ionicons name="time-outline" size={18} color={colors.warning} />
                <Text style={styles.enAttenteTexte}>Paiement en attente de validation</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.boutonPrime}
                onPress={() => ouvrir('PaiementsTab', 'EffectuerPaiement', { contratId: contrat.id })}
                activeOpacity={0.85}
                accessibilityRole="button"
              >
                <Text style={styles.boutonPrimeTexte} numberOfLines={2}>
                  {libelleBoutonPrime(contrat)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <Text style={[styles.sectionTitre, styles.marges]}>Actions rapides</Text>
        <View style={[styles.grille, styles.marges]}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.cle}
              style={styles.action}
              onPress={action.onPress}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <View style={styles.actionIcone}>
                <Ionicons name={action.icone} size={24} color={colors.accueilHeader} />
              </View>
              <Text style={styles.actionLibelle} numberOfLines={2}>
                {action.libelle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.lienLigne, styles.marges]}
          onPress={() => navigation.navigate('Demandes')}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.lienTexte} numberOfLines={1}>
            Suivre mes demandes de contrat
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.accueilHeader} />
        </TouchableOpacity>

        <Text style={[styles.sectionTitre, styles.marges]}>Activité récente</Text>
        <View style={[styles.bloc, styles.marges]}>
          {activitesIndisponibles ? (
            <Text style={styles.vide}>Activité indisponible pour le moment.</Text>
          ) : activites.length === 0 ? (
            <Text style={styles.vide}>Aucune activité pour le moment.</Text>
          ) : (
            activites.map((activite, index) => (
              <TouchableOpacity
                key={activite.cle}
                style={[styles.activite, index > 0 && styles.activiteSeparee]}
                onPress={() => ouvrirActivite(activite)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <View style={styles.activiteIcone}>
                  <Ionicons name={ICONES_ACTIVITE[activite.type]} size={20} color={colors.accueilHeader} />
                </View>
                <View style={styles.activiteTextes}>
                  <Text style={styles.activiteTitre} numberOfLines={1}>
                    {activite.titre}
                  </Text>
                  <Text style={styles.activiteDetail} numberOfLines={1}>
                    {activite.detail}
                  </Text>
                </View>
                <Text style={styles.activiteDate} numberOfLines={1}>
                  {dateRelative(activite.date)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {telephone ? (
          <View style={[styles.aide, styles.marges]}>
            <View style={styles.aideTextes}>
              <Text style={styles.aideTitre}>Besoin d&apos;aide ?</Text>
              <Text style={styles.aideTexte}>Notre service client vous répond.</Text>
            </View>
            <TouchableOpacity style={styles.aideBouton} onPress={appeler} activeOpacity={0.85} accessibilityRole="button">
              <Ionicons name="call-outline" size={18} color="#fff" />
              <Text style={styles.aideBoutonTexte}>Appeler</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const ombre = {
  shadowColor: colors.text,
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 24 },
  marges: { marginHorizontal: 16 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  erreurTexte: { color: colors.danger, fontSize: 14, textAlign: 'center', marginTop: 12 },
  retryButton: {
    marginTop: 14,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingHorizontal: 18,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: { color: colors.accueilHeader, fontSize: 13, fontWeight: '700' },

  entete: {
    backgroundColor: colors.accueilHeader,
    paddingHorizontal: 20,
    paddingBottom: 60,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  enteteLigne: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  logoFond: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 46, height: 46 },
  enteteTextes: { flex: 1, minWidth: 0 },
  bonjour: { color: '#fff', fontSize: 15, opacity: 0.9 },
  nom: { color: '#fff', fontSize: 22, fontWeight: '700', flexShrink: 1 },
  sousTitre: { color: '#fff', fontSize: 13, opacity: 0.9, marginTop: 12 },

  cartes: { flexDirection: 'row', gap: 8, marginTop: -40 },
  carte: {
    flex: 1,
    minWidth: 0,
    minHeight: 96,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    ...ombre,
  },
  carteValeur: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 6 },
  carteLibelle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },

  bandeau: {
    marginTop: 14,
    backgroundColor: colors.warningSoft,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bandeauTexte: { flex: 1, color: colors.warning, fontSize: 13 },
  bandeauBouton: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 6 },

  echeance: {
    marginTop: 14,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    padding: 16,
  },
  echeanceTete: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  echeanceTitre: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.accueilHeader },
  echeanceDetail: { fontSize: 14, color: colors.text, marginTop: 6 },
  echeanceDate: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  boutonPrime: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.accueilHeader,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  boutonPrimeTexte: { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  enAttente: {
    marginTop: 12,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.warningSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  enAttenteTexte: { flex: 1, color: colors.warning, fontSize: 14, fontWeight: '600' },

  sectionTitre: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 22, marginBottom: 10 },
  grille: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  action: {
    width: '48.5%',
    minHeight: 96,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    justifyContent: 'space-between',
    ...ombre,
  },
  actionIcone: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLibelle: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 10 },
  lienLigne: {
    marginTop: 10,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  lienTexte: { flex: 1, color: colors.accueilHeader, fontSize: 14, fontWeight: '700' },

  bloc: { backgroundColor: colors.card, borderRadius: 16, paddingHorizontal: 14, ...ombre },
  vide: { color: colors.textMuted, fontSize: 14, paddingVertical: 16, textAlign: 'center' },
  activite: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10 },
  activiteSeparee: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  activiteIcone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activiteTextes: { flex: 1, minWidth: 0 },
  activiteTitre: { fontSize: 14, fontWeight: '600', color: colors.text },
  activiteDetail: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  activiteDate: { fontSize: 12, color: colors.textLight, maxWidth: 92, flexShrink: 0 },

  aide: {
    marginTop: 22,
    backgroundColor: colors.secondarySoft,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aideTextes: { flex: 1, minWidth: 0 },
  aideTitre: { fontSize: 16, fontWeight: '700', color: colors.secondary },
  aideTexte: { fontSize: 13, color: colors.text, marginTop: 2 },
  aideBouton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.secondary,
  },
  aideBoutonTexte: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
