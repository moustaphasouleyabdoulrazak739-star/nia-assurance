/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Texte courant, montants, numéros, formulaires, boutons, badges.
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
        // Titres de page et de connexion seulement : jamais sous 18 px ni
        // pour des chiffres.
        display: ['Syne', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Orange de marque NIA : #C44704 (600). Seul orange de l'interface :
        // marque et actions. Contraste avec le texte blanc d'environ 4,9:1
        // (niveau AA), contre 3,9:1 pour l'ancien #DF5105.
        primary: {
          50: '#FDF4EF',
          100: '#FBE5D8',
          200: '#F6C8AE',
          300: '#EFA27A',
          400: '#E5753F',
          500: '#D65A14',
          600: '#C44704',
          700: '#A33B05',
          800: '#7F2F08',
          900: '#59240B',
        },
        // Vert du logo : reserve au sens « réussi » (statut actif ou validé,
        // message de confirmation, indemnité), jamais pour une action.
        secondary: {
          50: '#F1F9F1',
          100: '#DEF2DE',
          200: '#B8E6B7',
          300: '#84D883',
          400: '#4BCF4A',
          500: '#28B526',
          600: '#139112',
          700: '#027901', // couleur exacte du logo
          800: '#065606',
          900: '#083608',
        },
        // Neutre chaud (texte, fonds, bordures) — s'accorde avec l'orange de marque
        neutral: {
          50: '#FAFAF9',
          100: '#F5F5F4',
          200: '#E7E5E4',
          300: '#D6D3D1',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
      },
      // Ombre reservee aux elements superposes (modales, menu mobile) : les
      // cartes sont delimitees par une bordure fine, pas par une ombre.
      boxShadow: {
        overlay: '0 10px 30px -10px rgba(28, 25, 23, 0.25)',
      },
    },
  },
  plugins: [],
}
