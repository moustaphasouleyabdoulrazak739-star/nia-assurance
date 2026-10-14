import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getAccessToken } from './tokenStorage';
import { API_BASE_URL } from './config';
import { rafraichirJetonOuDeconnecter } from './client';
import { avecDelai, DELAI_TELECHARGEMENT_MS, estDelaiDepasse, estErreurReseau } from '../utils/reseau';

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
// Ce téléchargement ne passe pas par l'instance axios, il reprend donc à
// la main ses garde-fous :
// - délai maximal (`delaiMs`, surchargeable) : createDownloadResumable
//   plutôt que downloadAsync pour pouvoir réellement annuler la tâche au
//   dépassement (un Promise.race seul la laisserait continuer en
//   arrière-plan), puis suppression du fichier partiel du cache ;
// - une seule nouvelle tentative sur erreur réseau ou délai dépassé (c'est
//   une lecture, la rejouer est sans risque) ;
// - sur 401, rafraîchissement du jeton (même verrou que client.js) puis
//   nouvelle tentative.
//
// `chemin` : chemin d'API relatif (ex. "/paiements/12/recu/").
// `messages` : messages lisibles par statut HTTP renvoyé par la vue.
export async function telechargerEtPartagerPdf({
  chemin,
  nomFichier,
  messages,
  messageParDefaut,
  delaiMs = DELAI_TELECHARGEMENT_MS,
}) {
  const url = `${API_BASE_URL}${chemin}`;
  const destination = `${FileSystem.cacheDirectory}${nomFichier}`;
  const messagePour = (statut) => messages[statut] || messageParDefaut;

  // Le dossier de destination doit exister avant l'appel (documenté pour
  // les téléchargements legacy comme pour la nouvelle API).
  const infosDossier = await FileSystem.getInfoAsync(FileSystem.cacheDirectory);
  if (!infosDossier.exists) {
    await FileSystem.makeDirectoryAsync(FileSystem.cacheDirectory, { intermediates: true });
  }

  const supprimerFichier = () => FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => {});

  const telechargerUneFois = async (token) => {
    const tache = FileSystem.createDownloadResumable(url, destination, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    try {
      const resultat = await avecDelai(tache.downloadAsync(), delaiMs, () => tache.cancelAsync());
      // undefined : tâche annulée (cf. DownloadResumable.downloadAsync).
      if (!resultat) throw Object.assign(new Error('Téléchargement annulé'), { code: 'ERR_NETWORK' });
      return resultat;
    } catch (err) {
      await supprimerFichier();
      // Toute exception de la tâche native (Wi-Fi coupé, serveur injoignable)
      // est une erreur réseau : aucune réponse HTTP n'a été reçue.
      throw estDelaiDepasse(err) ? err : Object.assign(err, { code: err.code || 'ERR_NETWORK' });
    }
  };

  const telecharger = async (token) => {
    try {
      return await telechargerUneFois(token);
    } catch (err) {
      if (!estErreurReseau(err)) throw err;
      return telechargerUneFois(token);
    }
  };

  let resultat;
  try {
    resultat = await telecharger(await getAccessToken());

    if (resultat.status === 401) {
      let nouveauJeton;
      try {
        nouveauJeton = await rafraichirJetonOuDeconnecter();
      } catch (refreshError) {
        await supprimerFichier();
        throw estErreurReseau(refreshError) ? refreshError : new Error(messagePour(401));
      }
      resultat = await telecharger(nouveauJeton);
    }
  } catch (err) {
    if (estDelaiDepasse(err)) {
      throw new Error('Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.');
    }
    if (estErreurReseau(err)) {
      throw new Error('Connexion au serveur impossible. Vérifiez votre connexion internet.');
    }
    throw err;
  }

  if (resultat.status !== 200) {
    // Le corps d'erreur (JSON) a été écrit à la place du PDF : on le retire.
    await supprimerFichier();
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
