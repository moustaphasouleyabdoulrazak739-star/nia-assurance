import { ActivityIndicator, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import AccueilScreen from '../screens/AccueilScreen';
import ContratsScreen from '../screens/ContratsScreen';
import SinistresScreen from '../screens/SinistresScreen';
import DeclarerSinistreScreen from '../screens/DeclarerSinistreScreen';
import PaiementsScreen from '../screens/PaiementsScreen';
import PaiementDetailScreen from '../screens/PaiementDetailScreen';
import EffectuerPaiementScreen from '../screens/EffectuerPaiementScreen';
import DemandesScreen from '../screens/DemandesScreen';
import NouvelleDemandeScreen from '../screens/NouvelleDemandeScreen';
import ProfilScreen from '../screens/ProfilScreen';
import ChangerMotDePasseScreen from '../screens/ChangerMotDePasseScreen';
import { colors } from '../theme/colors';

const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const AccueilStack = createNativeStackNavigator();
const ContratsStack = createNativeStackNavigator();
const SinistresStack = createNativeStackNavigator();
const PaiementsStack = createNativeStackNavigator();
const ProfilStack = createNativeStackNavigator();

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

// En-tête coloré commun aux écrans des piles (mêmes réglages qu'avant le
// passage aux onglets).
function entete(title, couleur = colors.primary) {
  return {
    title,
    headerStyle: { backgroundColor: couleur },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: '700' },
  };
}

function BoutonAjouter({ onPress, label }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.headerButton}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.headerButtonText}>{'+'}</Text>
    </TouchableOpacity>
  );
}

// Pile de l'onglet Accueil. Les demandes de contrat y vivent : on y arrive
// depuis l'accueil (action rapide, activité récente, lien "Mes demandes de
// contrat"), et le retour ramène naturellement à l'accueil.
function AccueilPile() {
  return (
    <AccueilStack.Navigator>
      <AccueilStack.Screen name="Accueil" component={AccueilScreen} options={{ headerShown: false }} />
      <AccueilStack.Screen
        name="Demandes"
        component={DemandesScreen}
        options={({ navigation }) => ({
          ...entete('Mes demandes de contrat', colors.secondary),
          headerRight: () => (
            <BoutonAjouter label="Nouvelle demande" onPress={() => navigation.navigate('NouvelleDemande')} />
          ),
        })}
      />
      <AccueilStack.Screen
        name="NouvelleDemande"
        component={NouvelleDemandeScreen}
        options={entete('Demander un contrat', colors.secondary)}
      />
    </AccueilStack.Navigator>
  );
}

function ContratsPile() {
  return (
    <ContratsStack.Navigator>
      <ContratsStack.Screen name="Contrats" component={ContratsScreen} options={entete('Mes contrats')} />
    </ContratsStack.Navigator>
  );
}

function SinistresPile() {
  return (
    <SinistresStack.Navigator>
      <SinistresStack.Screen
        name="Sinistres"
        component={SinistresScreen}
        options={({ navigation }) => ({
          ...entete('Mes sinistres', colors.secondary),
          headerRight: () => (
            <BoutonAjouter label="Déclarer un sinistre" onPress={() => navigation.navigate('DeclarerSinistre')} />
          ),
        })}
      />
      <SinistresStack.Screen
        name="DeclarerSinistre"
        component={DeclarerSinistreScreen}
        options={entete('Déclarer un sinistre', colors.secondary)}
      />
    </SinistresStack.Navigator>
  );
}

function PaiementsPile() {
  return (
    <PaiementsStack.Navigator>
      <PaiementsStack.Screen
        name="Paiements"
        component={PaiementsScreen}
        options={({ navigation }) => ({
          ...entete('Mes paiements'),
          headerRight: () => (
            <BoutonAjouter label="Effectuer un paiement" onPress={() => navigation.navigate('EffectuerPaiement')} />
          ),
        })}
      />
      <PaiementsStack.Screen
        name="PaiementDetail"
        component={PaiementDetailScreen}
        options={entete('Détail du paiement')}
      />
      <PaiementsStack.Screen
        name="EffectuerPaiement"
        component={EffectuerPaiementScreen}
        options={entete('Effectuer un paiement')}
      />
    </PaiementsStack.Navigator>
  );
}

// Onglet "ProfilTab" : profil client (qui porte la déconnexion) et
// changement de mot de passe. Route "Profil" aussi ouverte depuis le
// formulaire de demande quand le serveur signale un profil incomplet.
function ProfilPile() {
  return (
    <ProfilStack.Navigator>
      <ProfilStack.Screen name="Profil" component={ProfilScreen} options={entete('Mon profil')} />
      <ProfilStack.Screen
        name="ChangerMotDePasse"
        component={ChangerMotDePasseScreen}
        options={entete('Mot de passe')}
      />
    </ProfilStack.Navigator>
  );
}

// Icônes Ionicons : pleine pour l'onglet actif, contour sinon.
const ICONES_ONGLETS = {
  AccueilTab: 'home',
  ContratsTab: 'document-text',
  SinistresTab: 'shield-checkmark',
  PaiementsTab: 'card',
  ProfilTab: 'person',
};

function optionsOnglets({ route }) {
  const icone = ICONES_ONGLETS[route.name];
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.accueilHeader,
    tabBarInactiveTintColor: colors.tabInactive,
    tabBarLabelStyle: styles.tabLabel,
    tabBarIcon: ({ focused, color, size }) => (
      <Ionicons name={focused ? icone : `${icone}-outline`} size={size} color={color} />
    ),
  };
}

// Barre d'onglets : chaque onglet garde sa propre pile (un formulaire en
// cours n'est pas perdu en changeant d'onglet). La barre gère elle-même la
// zone sûre du bas (barre de gestes iOS, barre de navigation Android).
function OngletsClient() {
  return (
    <Tab.Navigator screenOptions={optionsOnglets}>
      <Tab.Screen name="AccueilTab" component={AccueilPile} options={{ title: 'Accueil' }} />
      <Tab.Screen name="ContratsTab" component={ContratsPile} options={{ title: 'Contrats' }} />
      <Tab.Screen name="SinistresTab" component={SinistresPile} options={{ title: 'Sinistres' }} />
      <Tab.Screen name="PaiementsTab" component={PaiementsPile} options={{ title: 'Paiements' }} />
      <Tab.Screen name="ProfilTab" component={ProfilPile} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

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
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <RootStack.Screen name="EspaceClient" component={OngletsClient} />
        ) : (
          <RootStack.Screen name="Login" component={LoginScreen} />
        )}
      </RootStack.Navigator>
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
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  tabLabel: { fontSize: 11, fontWeight: '600' },
});
