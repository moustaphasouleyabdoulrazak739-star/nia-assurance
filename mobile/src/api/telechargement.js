import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getAccessToken } from './tokenStorage';
import { API_BASE_URL } from './config';
import { rafraichirJetonOuDeconnecter } from './client';

// Télécharge un PDF servi par une vue Django authentifiée (attestation,
// reçu...) puis ouvre la feuille de partage native — pas de viewer PDF
// intégré dans Expo Go, c'est le moyen le plus simple d'ouvrir/enregistrer
// le fichier depuis l'app.
//
// Utilise l'API legacy (expo-file-system/legacy) plutôt que la nouvelle API
// File/Directory/Paths du SDK 57 : cette dernière s'est montrée peu fiable
// dans Expo Go sur le dossier de cache par-expérience (ENOENT reproduit sur
// plusieurs contrats même après création explicite du dossier) — l'API
// legacy est toujours incluse et documentée pour SDK 57, avec un
// comportement éprouvé.
//
// downloadAsync ne passe pas par l'instance axios : un jeton d'accès expiré
// (durée de vie 30 min) donnerait un 401 alors que le refresh token est
// encore valide. On rafraîchit donc une fois puis on rejoue le
// téléchargement, comme le fait l'intercepteur de client.js.
//
// `chemin` : chemin d'API relatif (ex. "/paiements/12/recu/").
// `messages` : messages lisibles par statut HTTP renvoyé par la vue.
export async function telechargerEtPartagerPdf({ chemin, nomFichier, messages, messageParDefaut }) {
  const url = `${API_BASE_URL}${chemin}`;
  const destination = `${FileSystem.cacheDirectory}${nomFichier}`;
  const messagePour = (statut) => messages[statut] || messageParDefaut;

  // Le dossier de destination doit exister avant l'appel (documenté pour
  // downloadAsync comme pour la nouvelle API) : on le crée au besoin.
  const infosDossier = await FileSystem.getInfoAsync(FileSystem.cacheDirectory);
  if (!infosDossier.exists) {
    await FileSystem.makeDirectoryAsync(FileSystem.cacheDirectory, { intermediates: true });
  }

  const telecharger = async (token) => {
    try {
      return await FileSystem.downloadAsync(url, destination, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      throw new Error(messageParDefaut);
    }
  };

  let resultat = await telecharger(await getAccessToken());

  if (resultat.status === 401) {
    let nouveauJeton;
    try {
      nouveauJeton = await rafraichirJetonOuDeconnecter();
    } catch {
      throw new Error(messagePour(401));
    }
    resultat = await telecharger(nouveauJeton);
  }

  if (resultat.status !== 200) {
    throw new Error(messagePour(resultat.status));
  }

  const partageDisponible = await Sharing.isAvailableAsync();
  if (!partageDisponible) {
    throw new Error(
      "Le partage de fichiers n'est pas disponible sur cet appareil. Fichier enregistré : " + resultat.uri,
    );
  }
  await Sharing.shareAsync(resultat.uri, { mimeType: 'application/pdf' });
}
