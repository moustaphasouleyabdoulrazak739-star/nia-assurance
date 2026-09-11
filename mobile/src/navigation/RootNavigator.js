import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ContratsScreen from '../screens/ContratsScreen';
import SinistresScreen from '../screens/SinistresScreen';
import DeclarerSinistreScreen from '../screens/DeclarerSinistreScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

// Thème de navigation repris sur la palette de marque plutôt que le bleu
// par défaut de React Navigation (couleur des transitions, de la barre de
// statut système, etc.).
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="Contrats"
              component={ContratsScreen}
              options={{
                headerShown: true,
                title: 'Mes contrats',
                headerStyle: { backgroundColor: colors.primary },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
            <Stack.Screen
              name="Sinistres"
              component={SinistresScreen}
              options={({ navigation }) => ({
                headerShown: true,
                title: 'Mes sinistres',
                headerStyle: { backgroundColor: colors.secondary },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '700' },
                headerRight: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('DeclarerSinistre')}
                    style={styles.headerButton}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.headerButtonText}>{'+'}</Text>
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name="DeclarerSinistre"
              component={DeclarerSinistreScreen}
              options={{
                headerShown: true,
                title: 'Déclarer un sinistre',
                headerStyle: { backgroundColor: colors.secondary },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: '700' },
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  headerButton: {
    marginRight: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerButtonText: { color: '#fff', fontSize: 22, fontWeight: '700' },
});
