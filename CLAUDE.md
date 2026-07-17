# freya-front (Freya Hub)

Outil interne de comptabilité (factures, commandes B2B, historique client). Vite + React 18 + react-router-dom + MUI 6. Backend : `APIs/shopify-back` (port 3000, `api.freya-hub.fr` en public — ne jamais couper cet accès, un webhook Shopify s'en sert).

## Déploiement

- Build : `dist/` servi en statique par nginx sur le serveur de prod (13.39.45.220), sous `/compta` (topologie Tailscale unifiée avec freyaOMS et Freya Portal — voir `tools/freyaOMS/docs/ARCHITECTURE.md`). `vite.config.ts` (`base: "/compta/"`) et `main.tsx` (`basename="/compta"`) doivent rester synchronisés.
- **Tout `npm run build` lancé directement sur le serveur doit être capé en mémoire, sinon le process peut faire planter le serveur entier (OOM constaté le 2026-07-18) :**
  ```
  NODE_OPTIONS=--max_old_space_size=2048 npm run build
  ```
- Authentification : la vraie barrière est désormais nginx (`auth_request` contre la session du portail Freya, cookie partagé) — `PrivateRoute.tsx` ne fait plus de vérification côté client (l'ancien flag `localStorage` était trivialement contournable). `Login.tsx` reste en place mais n'est plus atteint dans le flux normal (on se connecte une seule fois, sur le portail).
