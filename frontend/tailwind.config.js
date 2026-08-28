/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        niger: {
          orange: '#FF7200',
          orange_dark: '#CC5A00',
          orange_light: '#FFF0E0',
          vert: '#009A44',
          vert_dark: '#007A35',
          vert_light: '#E0F5EC',
        }
      }
    },
  },
  plugins: [],
}