import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { ACCESS_TOKEN_KEY } from './client';
import { API_BASE_URL } from './config';

// GET /api/contrats/ — le backend filtre déjà par rôle (un CLIENT ne voit
// que ses propres contrats, cf. contrats/views.py:ContratListView).
export async function fetchContrats() {
  const response = await api.get('/contrats/');
  return response.data;
}

// Messages lisibles pour les statuts renvoyés par ContratAttestationView
// (400 : contrat pas ACTIF, 401 : token expiré, 403/404 : contrat
// inaccessible ou introuvable — même portée IDOR que côté web).
const MESSAGES_PAR_STATUT = {
  400: "L'attestation n'est disponible que pour un contrat actif.",
  401: 'Votre session a expiré, reconnectez-vous.',
  403: "Vous n'avez pas accès à ce contrat.",
  404: 'Contrat introuvable.',
};

function messageDepuisStatut(statut) {
  return MESSAGES_PAR_STATUT[statut] || "Impossible de télécharger l'attestation.";
}

// Télécharge l'attestation PDF d'un contrat ACTIF puis ouvre la feuille de
// partage native — pas de viewer PDF intégré dans Expo Go, c'est le moyen le
// plus simple d'ouvrir/enregistrer le fichier depuis l'app.
//
// Utilise l'API legacy (expo-file-system/legacy) plutôt que la nouvelle API
// File/Directory/Paths du SDK 57 : cette dernière s'est montrée peu fiable
// dans Expo Go sur le dossier de cache par-expérience (ENOENT reproduit sur
// plusieurs contrats même après création explicite du dossier) — l'API
// legacy est toujours incluse et documentée pour SDK 57, avec un
// comportement éprouvé.
export async function telechargerAttestation(contrat) {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  const url = `${API_BASE_URL}/contrats/${contrat.id}/attestation/`;
  const destination = `${FileSystem.cacheDirectory}attestation_${contrat.numero_contrat}.pdf`;

  // Le dossier de destination doit exister avant l'appel (documenté pour
  // downloadAsync comme pour la nouvelle API) : on le crée au besoin.
  const infosDossier = await FileSystem.getInfoAsync(FileSystem.cacheDirectory);
  if (!infosDossier.exists) {
    await FileSystem.makeDirectoryAsync(FileSystem.cacheDirectory, { intermediates: true });
  }

  let resultat;
  try {
    resultat = await FileSystem.downloadAsync(url, destination, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new Error("Impossible de télécharger l'attestation.");
  }

  if (resultat.status !== 200) {
    throw new Error(messageDepuisStatut(resultat.status));
  }

  const partageDisponible = await Sharing.isAvailableAsync();
  if (!partageDisponible) {
    throw new Error(
      "Le partage de fichiers n'est pas disponible sur cet appareil. Fichier enregistré : " + resultat.uri,
    );
  }
  await Sharing.shareAsync(resultat.uri, { mimeType: 'application/pdf' });
}
