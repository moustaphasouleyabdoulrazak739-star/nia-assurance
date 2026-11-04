// Palette de marque NIA Assurance — mêmes valeurs que frontend/tailwind.config.js
// (orange et vert extraits du logo). Pas de thème par défaut de la lib de
// navigation : ces couleurs sont appliquées explicitement dès l'écran de login.

export const colors = {
  // Seul orange de l'app (marque, en-têtes, actions), mêmes valeurs que
  // primary-600/400/700/100 de frontend/tailwind.config.js.
  primary: '#C44704',
  primaryLight: '#E5753F',
  primaryDark: '#A33B05',
  primarySoft: '#FBE5D8',

  // Vert du logo : réservé au sens « réussi » (badge Actif/Validé,
  // confirmation, indemnité), jamais pour une action.
  secondary: '#027901',
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

  tabInactive: '#5B524C',
};
