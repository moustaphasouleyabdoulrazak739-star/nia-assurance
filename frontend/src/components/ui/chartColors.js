// Palette de marque NIA pour les graphiques (Recharts) — reprend l'orange et
// le vert du logo (cf. tailwind.config.js) plutôt que les couleurs par défaut
// de la librairie. Centralisé ici comme statusVariants.js pour les badges.

export const BRAND = {
  orange: '#DF5105', // primary-600 (couleur exacte du logo)
  orangeLight: '#F18850', // primary-400
  green: '#027901', // secondary-700 (couleur exacte du logo)
  greenLight: '#4BCF4A', // secondary-400
  amber: '#F59E0B',
  red: '#DC2626',
  grid: '#E7E5E4', // neutral-200 — lignes de grille
  axis: '#78716C', // neutral-500 — axes et libellés
};

// Camembert « contrats par type » : une teinte de marque par type d'assurance,
// en alternant orange / vert pour rester lisible.
export const CONTRAT_TYPE_COLORS = {
  AUTO: BRAND.orange,
  SANTE: BRAND.green,
  HABITATION: BRAND.orangeLight,
  VIE: BRAND.greenLight,
};

// Barres « demandes par statut » : couleurs alignées sur la sémantique des
// badges (en attente = ambre, validée = vert, rejetée = rouge).
export const DEMANDE_STATUT_COLORS = {
  EN_ATTENTE: BRAND.amber,
  VALIDEE: BRAND.green,
  REJETEE: BRAND.red,
};
