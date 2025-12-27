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

## Dev commentaires / feedback

La page `Commentaires dev` (`/commentaires-dev`) permet à un membre authentifié d'envoyer des retours classés en `suggestion`, `bug`, `question` ou `autre`. Le formulaire repose désormais sur l'API `/api/feedback/comments`, qui stocke les retours dans Mongo et déclenche un journal d'alerte pour les bugs critiques. Un tableau d'administration est disponible sous `/admin/dev-comments` pour consulter, filtrer et rechercher les retours collectés sans toucher la base.

### API `/api/feedback/comments`

- `POST` : crée un nouveau retour. Payload JSON attendu :
	```json
	{
		"category": "suggestion|bug|question|autre",
		"summary": "Titres concis",
		"details": "Description complète",
		"reproduction": "Étapes facultatives",
		"contact": "Email ou pseudo optionnel"
	}
	```
- Le serveur vérifie le token Bearer (`Authorization`) et ajoute automatiquement `owner_id`, `created_at`, et l'`id` Mongo au retour.
- Lorsqu'un bug est signalé, un log de niveau `warning` est généré et un email est simulé si `DEV_FEEDBACK_ALERT_EMAIL` est défini (voir `backend/app/config.py`). Activez cette variable pour que les alertes soient relayées, puis surveillez les logs `feedback` pour suivre les priorités.
- `GET` : liste les retours (par défaut `limit=50`, max 200) triés par date décroissante. Filtrer par catégorie avec `?category=bug`.

### Exploitation

- Le backend utilise la collection `dev_comments`. Ajoutez un index sur `created_at` (et un TTL si vous ne souhaitez pas conserver les retours trop longtemps) ainsi qu'une indexation sur `category`/`owner_id` si vous interrogez la collection depuis d'autres outils.
- Le front admin `/admin/dev-comments` s'appuie sur `apiDevFeedbackList` (React Query). Limitez l'accès à cette page via l'authentification et gérez le rafraîchissement avec les boutons de la vue.
- Profitez des logs de FastAPI (`logger.info` et `logger.warning`) pour déclencher des alertes externes (PagerDuty, Sentry, etc.) lorsque des bugs sont postés, et envisagez un mécanisme de rate limiting côté API si le formulaire devient ciblé par des abus.
