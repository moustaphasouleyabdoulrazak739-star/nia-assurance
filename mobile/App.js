import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Syne_600SemiBold, Syne_700Bold } from '@expo-google-fonts/syne';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  // Polices des titres (Syne) embarquées avec l'app : aucun appel réseau.
  // En cas d'échec de chargement, l'app s'affiche quand même avec la police
  // système plutôt que de rester bloquée sur l'écran de démarrage.
  const [policesChargees, erreurPolices] = useFonts({ Syne_600SemiBold, Syne_700Bold });
  if (!policesChargees && !erreurPolices) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
