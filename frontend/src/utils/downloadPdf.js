// Telechargement d'un PDF genere par une route protegee (JWT requis) : un
// simple <a href> ne fonctionnerait pas, la requete doit porter l'en-tete
// Authorization. On recupere le fichier en blob via l'instance axios deja
// configuree (intercepteur JWT), puis on declenche le telechargement via un
// lien <a> ephemere - technique standard, aucun souci de sandbox ici
// puisque c'est une vraie page web, pas un artifact.

/** Lance le telechargement du PDF renvoye par `url` sous le nom `nomFichier`. */
export async function telechargerPdf(api, url, nomFichier) {
  const response = await api.get(url, { responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const lien = document.createElement('a');
  lien.href = blobUrl;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  window.URL.revokeObjectURL(blobUrl);
}

/** Extrait un message d'erreur lisible d'une reponse recuperee en blob
 * (ex: contrat pas actif, paiement pas validé) — le corps de l'erreur est
 * un Blob JSON tant que responseType: 'blob' est utilise sur la requete. */
export async function extraireErreurTelechargement(err, messageParDefaut) {
  const blob = err.response?.data;
  if (blob instanceof Blob) {
    try {
      const texte = await blob.text();
      const data = JSON.parse(texte);
      return data.error || messageParDefaut;
    } catch {
      return messageParDefaut;
    }
  }
  return messageParDefaut;
}
