/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Orange extrait du logo NIA (coquille superieure) — #DF5105
        primary: {
          50: '#FEF5F1',
          100: '#FCECE3',
          200: '#F8D6C4',
          300: '#F3B391',
          400: '#F18850',
          500: '#F3661B',
          600: '#DF5105', // couleur exacte du logo
          700: '#B54408',
          800: '#89370B',
          900: '#59270D',
        },
        // Vert extrait du logo NIA (coquille inferieure) — #027901
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
      boxShadow: {
        card: '0 1px 3px rgba(28, 25, 23, 0.06), 0 6px 20px -6px rgba(28, 25, 23, 0.10)',
        'card-hover': '0 4px 10px rgba(28, 25, 23, 0.08), 0 18px 34px -10px rgba(28, 25, 23, 0.16)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
