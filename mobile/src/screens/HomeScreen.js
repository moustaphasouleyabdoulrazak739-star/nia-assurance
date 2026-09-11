import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { fetchMe } from '../api/clients';
import { colors } from '../theme/colors';

// Entrées de menu de l'espace client — une navigation simple par écran
// empilé suffit à ce stade, pas encore de tab bar (peu d'écrans pour le
// moment : Contrats est le premier, les suivants viendront ici aussi).
const MENU_ITEMS = [
  { label: 'Mes contrats', route: 'Contrats' },
  { label: 'Mes sinistres', route: 'Sinistres' },
];

// Écran minimal : le seul but ici est de prouver que le JWT stocké au login
// est bien renvoyé sur une requête authentifiée suivante (GET /clients/me/),
// pas encore de vraie fonctionnalité "accueil".
export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [clientProfile, setClientProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchMe();
        setClientProfile(data);
      } catch {
        setError('Impossible de charger votre profil.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const nomClient = clientProfile?.user
    ? `${clientProfile.user.prenom} ${clientProfile.user.nom}`.trim()
    : `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo-nia.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.greeting}>Bienvenue</Text>

        {loading && <ActivityIndicator color={colors.primary} style={styles.loader} />}

        {!loading && error && <Text style={styles.error}>{error}</Text>}

        {!loading && !error && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Connecté en tant que</Text>
            <Text style={styles.cardName}>{nomClient || 'Client NIA'}</Text>
            <Text style={styles.cardEmail}>{clientProfile?.user?.email ?? user?.email}</Text>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                Donnée récupérée via GET /api/clients/me/ avec le token JWT
              </Text>
            </View>
          </View>
        )}

        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.route)}
              activeOpacity={0.8}
            >
              <Text style={styles.menuItemText}>{item.label}</Text>
              <Text style={styles.menuItemChevron}>{'>'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  logo: { width: 88, height: 68 },
  logoutText: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 16 },
  loader: { marginTop: 24 },
  error: { color: colors.danger, fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardLabel: { fontSize: 12, color: colors.textMuted },
  cardName: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 4 },
  cardEmail: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  badge: {
    marginTop: 16,
    backgroundColor: colors.secondarySoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: { color: colors.secondary, fontSize: 12, fontWeight: '600' },
  menu: { marginTop: 20 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 10,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  menuItemText: { fontSize: 15, fontWeight: '600', color: colors.text },
  menuItemChevron: { fontSize: 16, color: colors.textLight, fontWeight: '700' },
});
