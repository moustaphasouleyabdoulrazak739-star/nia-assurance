import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Environnement 'node' : les tests fournissent eux-memes de petits
    // substituts pour localStorage/window (voir src/services/api.test.js),
    // pas besoin de jsdom pour ce que ces tests ciblent (la logique de
    // l'intercepteur, pas le rendu de composants).
    environment: 'node',
  },
})
