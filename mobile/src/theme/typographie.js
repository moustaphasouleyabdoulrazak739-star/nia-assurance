// Typographie de l'app, alignée sur le site officiel de NIA :
// - Syne (600/700) uniquement pour les titres de page, l'en-tête de
//   navigation, le nom du client et le titre de connexion, jamais sous 18 px
//   ni pour des chiffres ;
// - tout le reste (texte, montants, numéros, formulaires, boutons, badges)
//   garde la police système de la plateforme (aucune fontFamily).
// Les noms correspondent aux polices chargées par useFonts dans App.js.

export const policesTitres = {
  semiGras: 'Syne_600SemiBold',
  gras: 'Syne_700Bold',
};

// Taille minimale pour Syne : en dessous, la police devient peu lisible.
export const TAILLE_MIN_SYNE = 18;
