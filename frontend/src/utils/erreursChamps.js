// Aplatit les erreurs de validation DRF ({champ: [messages]}) en
// {champs: {champ: 'message'}, general: 'message' | ''} pour les afficher
// sous chaque champ d'un formulaire plutot qu'un unique message generique.
// Meme logique que extraireErreursChamps cote mobile
// (mobile/src/api/sinistres.js), plus la separation des erreurs sans champ
// (non_field_errors, detail).
//
// Dans son propre module pour etre teste sans importer toute la page (voir
// erreursChamps.test.js).
const CLES_GENERALES = ['non_field_errors', 'detail'];

const enTexte = (valeur) => (Array.isArray(valeur) ? valeur.join(' ') : String(valeur));

export function extraireErreursChamps(err) {
  const data = err?.response?.data;
  const resultat = { champs: {}, general: '' };
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return resultat;
  }
  const generales = [];
  for (const [champ, valeur] of Object.entries(data)) {
    if (CLES_GENERALES.includes(champ)) {
      generales.push(enTexte(valeur));
    } else {
      resultat.champs[champ] = enTexte(valeur);
    }
  }
  resultat.general = generales.join(' ');
  return resultat;
}
