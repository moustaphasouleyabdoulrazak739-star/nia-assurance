import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { TYPES_MIME_AUTORISES } from './demandes';

// Sélection d'une pièce jointe (fichier, photo, galerie) ramenée à une forme
// commune {uri, name, mimeType, size}. Les deux sélecteurs copient le
// fichier dans le cache temporaire de l'app (copyToCacheDirectory par
// défaut pour expo-document-picker, cache de l'image picker pour les
// photos) : aucune pièce n'est écrite ailleurs.

// Compression des photos : une photo de CIN reste lisible et passe très
// largement sous la limite de 5 Mo du serveur.
const QUALITE_PHOTO = 0.7;

// Taille manquante (le sélecteur ne la fournit pas toujours) : lue sur le
// fichier en cache via l'API legacy.
async function completerTaille(fichier) {
  if (typeof fichier.size === 'number') return fichier;
  try {
    const infos = await FileSystem.getInfoAsync(fichier.uri);
    return infos.exists && typeof infos.size === 'number' ? { ...fichier, size: infos.size } : fichier;
  } catch {
    return fichier;
  }
}

export async function choisirDocument() {
  const resultat = await DocumentPicker.getDocumentAsync({
    type: TYPES_MIME_AUTORISES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (resultat.canceled || !resultat.assets?.length) return null;
  const asset = resultat.assets[0];
  return completerTaille({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, size: asset.size });
}

// Le nom du fichier en cache reflète le format réellement produit (ex.
// "....jpeg"), alors que fileName peut garder le nom d'origine (ex.
// "IMG_0001.HEIC" sur iPhone, converti en JPEG par le sélecteur).
function nomDepuisUri(uri) {
  const base = decodeURIComponent(String(uri || '').split('?')[0].split('/').pop() || '');
  return /\.[A-Za-z0-9]+$/.test(base) ? base : '';
}

function depuisImage(resultat, nomParDefaut) {
  if (resultat.canceled || !resultat.assets?.length) return null;
  const asset = resultat.assets[0];
  return completerTaille({
    uri: asset.uri,
    name: nomDepuisUri(asset.uri) || asset.fileName || nomParDefaut,
    mimeType: asset.mimeType || 'image/jpeg',
    size: asset.fileSize,
  });
}

export class PermissionRefuseeError extends Error {}

export async function prendrePhoto(nomParDefaut) {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new PermissionRefuseeError(
      "L'accès à l'appareil photo a été refusé. Autorisez-le dans les réglages du téléphone ou choisissez un fichier.",
    );
  }
  const resultat = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: QUALITE_PHOTO });
  return depuisImage(resultat, nomParDefaut);
}

export async function choisirDansGalerie(nomParDefaut) {
  const resultat = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: QUALITE_PHOTO });
  return depuisImage(resultat, nomParDefaut);
}

// Supprime une copie devenue inutile (pièce remplacée, retirée ou déjà
// envoyée). Uniquement dans le cache de l'app : jamais un fichier
// d'origine de l'utilisateur.
export async function supprimerCopieTemporaire(fichier) {
  const cache = FileSystem.cacheDirectory;
  if (!fichier?.uri || !cache || !fichier.uri.startsWith(cache)) return;
  await FileSystem.deleteAsync(fichier.uri, { idempotent: true }).catch(() => {});
}
