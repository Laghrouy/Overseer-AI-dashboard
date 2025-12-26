# Overseer Frontend

Application Next.js (App Router) pour le tableau de bord Overseer.

## Démarrage
```bash
cp .env.example .env
npm install
npm run dev
```
UI : http://localhost:3000 — configurez `NEXT_PUBLIC_API_BASE` si le backend n'est pas sur le port 8000.

## Scripts
- `npm run dev` : développement
- `npm run lint` : ESLint
- `npm test` : Vitest + Testing Library
- `npm run build` / `npm start` : production

## Périmètre actuel
- Pages : dashboard, agenda, tâches/projets, agent, automations, feedback, paramètres, liens.
- State : Zustand (auth, storage `overseer-auth`), React Query (données serveur), theming persistant (`overseer-theme`).

## Structure rapide
- `src/app/` : pages et shell (App Router)
- `src/store/` : Zustand auth
- `src/lib/` : client API, types, utilitaires

## Tests
Tests unitaires/UI : `npm test` (Vitest, JSDOM). Ajouter des snapshots dans `src/lib/__snapshots__/` au besoin.
