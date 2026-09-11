// Palette de marque NIA Assurance — mêmes valeurs que frontend/tailwind.config.js
// (orange et vert extraits du logo). Pas de thème par défaut de la lib de
// navigation : ces couleurs sont appliquées explicitement dès l'écran de login.

export const colors = {
  primary: '#DF5105', // orange du logo (coquille supérieure)
  primaryLight: '#F18850',
  primaryDark: '#B54408',
  primarySoft: '#FCECE3',

  secondary: '#027901', // vert du logo (coquille inférieure)
  secondaryLight: '#4BCF4A',
  secondarySoft: '#DEF2DE',

  background: '#FAFAF9',
  card: '#FFFFFF',
  border: '#E7E5E4',
  text: '#1C1917',
  textMuted: '#78716C',
  textLight: '#A8A29E',

  danger: '#DC2626',
  dangerSoft: '#FEE2E2',

  // Couleurs des badges de statut — mêmes teintes que Badge.jsx /
  // statusVariants.js côté web (variants success/warning/danger/info/neutral).
  warning: '#B45309', // amber-700
  warningSoft: '#FEF3C7', // amber-100
  info: '#0369A1', // sky-700
  infoSoft: '#E0F2FE', // sky-100
  neutral: '#57534E', // neutral-600
  neutralSoft: '#F5F5F4', // neutral-100
};
