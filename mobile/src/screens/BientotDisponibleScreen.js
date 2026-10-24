import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

// TEMPORAIRE : écran de l'onglet Profil (route "Profil" de la pile
// "ProfilTab", cf. navigation/RootNavigator.js) en attendant le vrai écran
// Profil. Garde la déconnexion accessible, l'ancien accueil qui la portait
// ayant été remplacé. À remplacer par l'écran Profil dans RootNavigator.
export default function BientotDisponibleScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <View style={styles.content}>
        <Ionicons name="construct-outline" size={48} color={colors.accueilHeader} />
        <Text style={styles.titre}>Bientôt disponible</Text>
        <Text style={styles.texte}>
          {"La gestion de votre profil arrive dans une prochaine version de l'application."}
        </Text>
        {user?.email ? (
          <Text style={styles.email} numberOfLines={1}>
            Connecté : {user.email}
          </Text>
        ) : null}
        <TouchableOpacity
          style={styles.bouton}
          onPress={logout}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.boutonTexte}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  titre: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: 12 },
  texte: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  email: { fontSize: 13, color: colors.textLight, marginTop: 16, flexShrink: 1 },
  bouton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  boutonTexte: { color: colors.danger, fontSize: 15, fontWeight: '700' },
});
