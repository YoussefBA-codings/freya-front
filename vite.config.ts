import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Servi sous /compta sur le hostname Tailscale partagé (portail Freya +
  // freyaOMS) — voir docs/ARCHITECTURE.md de freyaOMS pour la topologie SSO
  // complète. Sans ce `base`, les assets buildés référenceraient des chemins
  // absolus à la racine (/assets/...) qui 404eraient sous /compta.
  base: '/compta/',
  plugins: [react()],
  server: {
    port: 4000
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
})