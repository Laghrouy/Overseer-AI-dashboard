# COMPTE-RENDU D’AUDIT — Projet JARVIS

## 1. Présentation générale du projet

- **Nom / contexte** : JARVIS — Tableau de bord IA personnel.
- **Objectif** : fournir un tableau de bord personnel centré sur la gestion du temps, des tâches, de l’agenda, des projets et de l’apprentissage, épaulé par un agent IA qui propose des plannings et de l’assistance pédagogique.
- **Problématique adressée** :
  - Planifier et suivre sa journée (tâches + événements) de manière intelligente.
  - Centraliser projets, objectifs, révisions et feedback de performance.
  - Utiliser un LLM pour expliquer les plannings générés et assister l’utilisateur (planning, résumés/quiz d’étude, chat).
- **Type d’application** :
  - Application **full‑stack** (frontend Next.js + backend FastAPI) orientée **usage personnel** (monoutil) mais facilement extensible à plusieurs utilisateurs.
- **Public cible** :
  - Développeurs / étudiants / knowledge workers souhaitant un tableau de bord personnel avancé.
  - Utilisation principale en **solo**, avec authentification par compte email.
- **Technologies principales** :
  - **Backend** : FastAPI, MongoDB (Motor/PyMongo), httpx, python-jose (JWT), passlib, icalendar, pydantic 2, pydantic-settings.
  - **Frontend** : Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Zustand, @tanstack/react-query, lucide-react, Fuse.js.
  - **Tests** : pytest + pytest-asyncio côté backend, Vitest + Testing Library côté frontend.

---

## 2. Architecture globale

### 2.1 Organisation des dossiers

Racine :
- `README.md` : présentation générale et instructions de démarrage.
- `backend/` : API FastAPI + couche de persistance + logique agent.
- `frontend/` : application Next.js (App Router) pour le tableau de bord et la page de login.
- `.github/` : instructions Copilot.
- `.venv/`, `.pytest_cache/`, `.next/` : artefacts d’environnement / build.

Backend (`backend/app/`) :
- `main.py` : création de l’application FastAPI, montage des routers, CORS, endpoint de healthcheck.
- `config.py` : configuration via `BaseSettings` (env `.env`).
- `db.py` : client MongoDB (Motor), gestion du lifespan et du cache client.
- `schemas.py` : schémas Pydantic (DTO) pour entrées/sorties API.
- `security.py` : hashing de mots de passe, création et décodage de tokens JWT.
- `deps.py` : dépendances FastAPI (récupération de l’utilisateur courant, session DB Mongo).
- `utils.py` : fonctions utilitaires (actuellement `build_command_repr`).
- `routers/` :
  - `auth.py` : inscription, login, `/me` (Mongo-only).
  - `tasks.py` : CRUD tâches (Mongo-only).
  - `events.py` : CRUD événements + import/export ICS.
  - `projects.py` : CRUD projets + mise à jour des jalons.
  - `agent.py` : chat/logs (planification temporairement désactivée).
  - `preferences.py` : préférences utilisateur (Mongo-only).
  - `history.py` : agrégation historique (Mongo-only).
  - `notifications.py` : réception de signaux de notification (logging dans agent_logs).
  - `feedback.py` : métriques de performance (Mongo-only).
  - `automation.py` : enregistrement d’“automations” et de rollbacks (logging Mongo).
  - `commands.py` : enregistrement de commandes utilisateur (logging Mongo).
  - `study.py` : sujets d’étude, plans de révision, sessions, cartes de révision, aide pédagogique (Mongo-only).
- `services/` :
  - `agent.py` : chat + logging Mongo, résumé de conversation (planification legacy supprimée).
  - `learning.py` : génération déterministe de sessions, SM-2 simplifié, appel LLM pour aide pédagogique.
- `tests/` : tests d’intégration pour tâches, événements, étude, commandes, utilitaires (Mongo).

Frontend (`frontend/src/`) :
- `app/` :
  - `layout.tsx` : layout global (fonts, Providers, langue `fr`).
  - `globals.css` : styles globaux (tailwind).
  - `page.tsx` : **page principale du dashboard** (monolithique, ~5k lignes, gère presque tout le front).
  - `page.study.interactions.test.tsx` : tests d’interaction étude (Vitest/RTL).
  - `login/page.tsx` : page de login/enregistrement.
  - `providers.tsx` : montage `QueryClientProvider` (React Query).
- `lib/` :
  - `api.ts` : client HTTP typé pour l’API backend.
  - `timeUtils.ts` : calculs d’horaires, slots libres, conflits, charges journalières.
  - `types.ts` : types métier front (Task, Project, AgendaEvent, Study*, Feedback*…).
  - `mockData.ts` : jeux de données de démonstration (tâches, événements, projets, chat, stats).
  - `*.test.ts[x]` : tests unitaires (timeUtils, API study, UI study).
- `store/auth.ts` : store Zustand persistant pour token et email.

### 2.2 Schéma logique de fonctionnement (description textuelle)

1. **Authentification** :
   - L’utilisateur se crée un compte ou se connecte via `/api/auth/register` + `/api/auth/login`.
   - Le frontend reçoit un **JWT** (Bearer token) et le stocke dans le store Zustand persistant (`localStorage`).

2. **Accès API** :
   - Toutes les opérations métier (tâches, événements, projets, agent, étude…) passent par les fonctions `api*` de `lib/api.ts`.
   - Les appels sont authentifiés avec le header `Authorization: Bearer <token>`.

3. **Persistance** :
  - Le backend stocke les données dans MongoDB (`MONGODB_URI` / `MONGODB_DB`) via Motor/PyMongo.
  - Le lifespan initialise un client Mongo partagé injecté dans les dépendances FastAPI.

4. **Agent** :
  - Chat / résumé disponibles ; le planning `/api/agent/plan` est temporairement désactivé (retour 503) en attendant une version Mongo-native.

5. **Apprentissage & révision** :
   - L’utilisateur crée des sujets (`/study/subjects`), puis génère un plan (`/study/plan/generate`).
   - `services.learning.generate_revision_sessions` crée des sessions réparties dans le temps (révision + rappels + quiz de consolidation avant examen).
   - Les sessions sont stockées en DB et peuvent être consultées/mises à jour, ainsi que les cartes de révision (SM-2 simplifié).

6. **Dashboard frontend** :
   - La page principale charge via React Query :
     - `apiMe`, `apiTasks`, `apiEvents`, `apiProjects`, `apiUserPreferences*`, `apiHistory`, `apiFeedback`, `apiStudy*`, etc.
   - Elle fournit plusieurs vues : agenda (jour/semaine/mois/liste), tâches avec Kanban rapide, projets, cartes de feedback, étude (sujets/sessions/cartes), automations, commandes, chat agent, liens rapides, import/export ICS.

### 2.3 Flux de données principaux

- **Flux Auth** : email/mot de passe → `/auth/register` → création User → `/auth/login` → JWT → stockage front.
- **Flux Tâches/Événements/Projets** :
  - CRUD via `/tasks`, `/events`, `/projects`.
  - Les tâches peuvent être reliées à des événements (via `task_id`) et des projets (`project_id`).
- **Flux Agent Planning** :
  - Front envoie date/mode/raison → `/agent/plan` → génération + enregistrement d’événements `kind="propose"` → renvoi de la liste d’événements + rationale.
- **Flux Étude** :
  - Création sujet → génération plan (sessions en DB) → récupération sessions dues → mise à jour (done/skipped + difficulté) → cartes de révision (création & review SM‑2).
- **Flux Feedback** :
  - `/feedback` agrège tâches + événements sur une période (jour/semaine/mois) → renvoie heures planifiées vs réelles, complétion, tâches en retard, suggestions d’ajustement d’estimation, fenêtres d’habitude.
- **Flux Notifications & Automations & Commandes** :
  - Front envoie des signaux ou commandes textuelles → backend **ne les exécute pas**, mais les logue dans `AgentLog` (traçabilité).

---

## 3. Fonctionnalités implémentées (exhaustif)

> Remarque : liste basée uniquement sur le code présent (routers, services, tests, front). Pas d’extrapolation.
> Note : la migration Mongo est terminée, le fichier `app/models.py` et les chemins SQLModel cités initialement ne sont plus présents ; se référer aux routers + schémas Pydantic.

### 3.1 Authentification & utilisateur

- **Nom** : Authentification JWT (inscription / login / profil)
- **Description** :
  - Inscription d’un utilisateur par email/mot de passe.
  - Login via OAuth2 password flow (form‑urlencoded) → génération de JWT signé.
  - Endpoint `/me` pour récupérer l’utilisateur courant.
- **Fichiers concernés** :
  - Backend : `app/routers/auth.py`, `app/security.py`, `app/deps.py`, `app/config.py`.
  - Frontend : `src/app/login/page.tsx`, `src/lib/api.ts` (`apiRegister`, `apiLogin`, `apiMe`), `src/store/auth.ts`.
- **Technologies utilisées** : FastAPI, OAuth2PasswordBearer, JWT (python‑jose), passlib, Zustand, React Query.
- **État** : **fonctionnelle** (couverte par les tests via helpers de connexion, et pleinement consommée par le frontend).

### 3.2 Gestion des tâches

- **Nom** : CRUD tâches avec métadonnées avancées
- **Description** :
  - Lister toutes les tâches de l’utilisateur.
  - Créer des tâches avec : priorité, deadline, durée estimée, catégorie, énergie, parent_task_id, dépendances, order_index, project_id.
  - Mettre à jour tout ou partie des champs, y compris le statut (`a_faire`, `en_cours`, `terminee`).
  - Supprimer une tâche.
- **Fichiers concernés** :
  - Backend : `app/routers/tasks.py`, `app/schemas.py` (TaskCreate/Read/Update), `backend/tests/test_tasks.py`.
  - Frontend : `src/lib/api.ts` (`apiTasks`, `apiCreateTask`, `apiUpdateTask`, `apiDeleteTask`), `src/app/page.tsx` (UI tâches/Kanban), `src/lib/types.ts` (Task), `src/lib/mockData.ts` (demoTasks).
- **Technologies** : FastAPI + MongoDB (Motor/PyMongo), React Query, Zustand, TypeScript.
- **État** : **fonctionnelle** (tests d’intégration couvrant création, update de statut, dépendances/parent, suppression).

### 3.3 Gestion des événements & agenda

- **Nom** : CRUD événements + import/export ICS
- **Description** :
  - Lister les événements de l’utilisateur.
  - Créer/modifier/supprimer des événements avec : titre, dates, type (`fixe`/`propose`), catégorie, liens à tâches, description, note, lieu, URL, couleur, importance, all‑day, pièces jointes, récurrence.
  - Importer un fichier ICS :
    - Parse du fichier via `icalendar`.
    - Création d’événements `kind="fixe"` à partir des `VEVENT`.
  - Exporter tous les événements de l’utilisateur en ICS.
- **Fichiers concernés** :
  - Backend : `app/routers/events.py`, `app/schemas.py` (EventCreate/Read/Update), `backend/tests/test_events.py`.
  - Frontend : `src/lib/api.ts` (`apiEvents`, `apiCreateEvent`, `apiUpdateEvent`, `apiDeleteEvent`, `apiImportIcs`, `apiExportIcs`), `src/lib/timeUtils.ts` (analyse day/week), `src/app/page.tsx` (vue agenda, import/export ICS, détection conflits, slots libres).
- **Technologies** : FastAPI, MongoDB (Motor/PyMongo), icalendar, React Query, File API, TypeScript.
- **État** : **fonctionnelle** (CRUD testé, import/export utilisés dans le dashboard).

### 3.4 Gestion des projets

- **Nom** : CRUD projets & jalons
- **Description** :
  - Lister, créer, mettre à jour, supprimer des projets.
  - Attributs riches : progression (float), description, objectifs, sous‑objectifs, blockers, jalons, risques, décisions, notifications, dépendances.
  - Endpoint dédié pour mettre à jour uniquement les jalons datés (`/projects/{id}/milestones`).
- **Fichiers concernés** :
  - Backend : `app/routers/projects.py`, `app/schemas.py` (ProjectCreate/Read/Update/ProjectMilestonesUpdate).
  - Frontend : `src/lib/api.ts` (`apiProjects`, `apiCreateProject`, `apiUpdateProject`, `apiDeleteProject`, `apiUpdateProjectMilestones`), `src/lib/types.ts` (Project & sous‑types), `src/lib/mockData.ts` (demoProjects), `src/app/page.tsx` (UI projets, tri, filtres risques, jalons).
- **Technologies** : FastAPI, MongoDB (Motor/PyMongo), React Query, TypeScript.
- **État** : **fonctionnelle** (pas de tests spécifiques côté backend, mais schémas et front consomment les routes de base).

### 3.5 Préférences utilisateur

- **Nom** : Gestion des préférences de travail
- **Description** :
  - Lecture et écriture de **UserPreference** :
    - plages productives (`productive_hours`) : liste de `{ start, end }`.
    - limite quotidienne d’heures (`daily_load_limit_hours`).
    - durée préférée de session (`session_duration_minutes`).
    - jours off (`days_off`).
    - tâches pénibles (`painful_tasks`).
  - Création automatique de préférences par défaut si absentes.
- **Fichiers concernés** :
  - Backend : `app/routers/preferences.py`, `app/schemas.py` (UserPreferenceRead/Update).
  - Frontend : `src/lib/api.ts` (`apiUserPreferencesGet`, `apiUserPreferencesUpdate`), `src/lib/timeUtils.ts` (computeWorkWindowHours), `src/app/page.tsx` (formulaire de préférences).
- **Technologies** : FastAPI, MongoDB (Motor/PyMongo), React Query.
- **État** : **fonctionnelle** (aucun test direct, mais utilisée par l’agent et le front).

### 3.6 Agent de planification (jour / semaine)

- **Nom** : Agent de planning (tâches → blocs horaires)
- **Description** :
  - Endpoint `/agent/plan` renvoie actuellement **503** (planning désactivé) en attente d’une réécriture Mongo-native.
  - Ancienne logique : distribution de tâches/étude dans des slots libres avec rationale LLM.
- **Fichiers concernés** :
  - Backend : `app/routers/agent.py` (retour 503 pour `/agent/plan`), `app/services/agent.py` (chat/logs seulement).
  - Frontend : `src/lib/api.ts` (`apiAgentPlan` existe mais à désactiver côté UI si besoin).
- **Technologies** : FastAPI, MongoDB (Motor/PyMongo), httpx, OpenAI‑compatible API, React Query.
- **État** : **désactivée** pour la planification ; chat et résumé restent disponibles.

### 3.7 Agent chat & résumé de conversation

- **Nom** : Chat agent & résumé
- **Description** :
  - `/agent/chat` : reçoit un message + (côté front) un ton/formalisme éventuel, renvoie une réponse du modèle (via `generate_chat_reply`, qui appelle un LLM configuré dans `Settings` – code non vu mais importé).
  - `/agent/chat-summary` : reçoit un historique, renvoie un résumé (`summarize_chat`) et le loggue.
- **Fichiers concernés** :
  - Backend : `app/routers/agent.py` (chat & chat-summary), `app/services/agent.py` (log_agent_decision et helpers), `app/config.py` (config LLM).
  - Frontend : `src/lib/api.ts` (`apiAgentChat`, `apiChatSummary`), `src/lib/mockData.ts` (demoChat), `src/app/page.tsx` (UI de chat avec historique, pendingMessage, tones…).
- **Technologies** : FastAPI, httpx, OpenAI‑like API, React Query, Fuse.js (recherche dans événements/tâches, pas directement dans le chat mais coexistant).
- **État** : **fonctionnelle** côté API (supposé, basé sur code et utilisation front). Le comportement dépend de la configuration LLM (fallback limité si clé absente).

### 3.8 Historique consolidé

- **Nom** : Historique (tâches, événements, projets, logs agent)
- **Description** :
  - Endpoint `/history` (GET) :
    - Récupère toutes les tâches, événements, projets et logs d’agent de l’utilisateur.
    - Convertit en DTO prêts pour le front (`HistoryResponse`).
- **Fichiers concernés** :
  - Backend : `app/routers/history.py`, `app/schemas.py` (HistoryResponse).
  - Frontend : `src/lib/api.ts` (`apiHistory`), `src/app/page.tsx` (section historique/"journal" des décisions agent et activités).
- **Technologies** : FastAPI, MongoDB (Motor/PyMongo), React Query.
- **État** : **fonctionnelle** (pas de test dédié, mais code simple et utilisé par le front).

### 3.9 Notifications (signaux) côté backend

- **Nom** : Réception de signaux de notification
- **Description** :
  - Endpoint `/notifications` (POST) :
    - Prend un payload `NotificationSignals` (rappels, anticipation, contexte).
    - Enregistre un `AgentLog` avec le détail JSON.
    - Ne déclenche pas de push réel, mais fournit un point de collecte.
- **Fichiers concernés** :
  - Backend : `app/routers/notifications.py`, `app/schemas.py` (NotificationSignals).
  - Frontend : `src/lib/api.ts` (`apiPushNotifications`), `src/app/page.tsx` (utilisation pour remonter des signaux calculés côté client).
- **Technologies** : FastAPI, MongoDB (Motor/PyMongo), React Query.
- **État** : **fonctionnelle**, mais limitée au logging (pas d’intégration push externe).

### 3.10 Automations & rollback

- **Nom** : Automations déclaratives & rollback
- **Description** :
  - `/automation` (POST) : enregistre une automation de type `script`, `api`, `file`, `message`, `webhook` avec `target/payload/message`.
  - `/automation/rollback` (POST) : enregistre une demande de rollback.
  - Les actions ne sont **pas réellement exécutées** : seules des entrées `AgentLog` sont créées avec détail JSON + type d’action.
- **Fichiers concernés** :
  - Backend : `app/routers/automation.py`, `app/schemas.py` (AutomationRequest/Response/…).
  - Frontend : `src/lib/api.ts` (`apiAutomation`, `apiAutomationRollback`), `src/app/page.tsx` (UI d’automation : historique, ID dernier run, mode manuel, validation sensible).
- **Technologies** : FastAPI, MongoDB (Motor/PyMongo), React Query.
- **État** : **fonctionnelle** pour le logging, **partielle** comme moteur d’automation (pas d’exécution réelle).

### 3.11 Commandes utilisateur

- **Nom** : Journalisation de commandes texte
- **Description** :
  - Endpoint `/commands` (POST) :
    - Construit une représentation texte de la commande + arguments via `build_command_repr`.
    - Rejette les commandes vides.
    - Enregistre un AgentLog action="command".
  - Retourne un message confirmant l’enregistrement.
- **Fichiers concernés** :
  - Backend : `app/routers/commands.py`, `app/utils.py` (build_command_repr), `backend/tests/test_commands.py`, `backend/tests/test_utils.py`.
  - Frontend : `src/lib/api.ts` (`apiCommand`), `src/app/page.tsx` (UI pour saisir des commandes avec historique local).
- **Technologies** : FastAPI, MongoDB (Motor/PyMongo), React Query.
- **État** : **fonctionnelle** (tests d’intégration pour cas success/erreur + tests unitaires utilitaire).

### 3.12 Boucle de feedback productivité

- **Nom** : Feedback productivité / charge / habitudes
- **Description** :
  - Endpoint `/feedback` (GET) avec query `scope=day|week|month`, `date` (optionnelle) :
    - Calcule période [start, end) selon le scope.
    - Sépare événements planifiés (`kind="propose"`) vs réels.
    - Somme les heures planifiées vs réelles (`planned_hours`, `actual_hours`).
    - Identifie les tâches planifiées dans la fenêtre et celles terminées.
    - Déduit un taux de complétion.
    - Récupère les tâches en retard (deadline < start, non terminées).
    - Calcule, par tâche, la durée réellement passée (via événements réels liés) et suggère des ajustements d’estimations quand le ratio est trop éloigné.
    - Regroupe les heures par fenêtres horaires de 2h pour détecter les "habit windows".
- **Fichiers concernés** :
  - Backend : `app/routers/feedback.py`, `app/schemas.py` (Feedback*).
  - Frontend : `src/lib/api.ts` (`apiFeedback`), `src/lib/types.ts` (Feedback*), `src/app/page.tsx` (UI stats : cartes, graphes simplifiés, filtres de scope, humeur du jour, objectifs quotidiens — certains aspects logiques locaux mais adossés à ces données).
- **Technologies** : FastAPI, MongoDB (Motor/PyMongo), React Query.
- **État** : **fonctionnelle** (non testée mais calculs déterministes et utilisés par le front).

### 3.13 Module d’étude & révision

- **Nom** : Gestion d’étude (sujets, plans, sessions, cartes, aide pédagogique)
- **Description** :
  - Sujets (`/study/subjects` GET/POST) : créer & lister des matières (nom, description, code UE).
  - Génération de plan (`/study/plan/generate`) :
    - Requiert un sujet appartenant à l’utilisateur.
    - Genère des sessions de révision (`revision`), rappels (`rappel`) et un quiz de consolidation la veille de l’examen (optionnel).
  - Sessions dues (`/study/sessions/due`) : lister les sessions planifiées dont `scheduled_for` <= now.
  - Mise à jour d’une session (`/study/sessions/{id}` PATCH) : statut, completion, difficulté, notes.
  - Cartes (`/study/cards` POST, `/study/cards/due` GET, `/study/cards/{id}/review` POST) : création, récupération des cartes dues, review via SM‑2 simplifié (`sm2_update`).
  - Aide pédagogique (`/study/assist`) :
    - Appelle un LLM pour générer résumé, explication, exercices ou quiz en fonction du mode et de la difficulté.
    - Fallback textuel explicatif si LLM non configuré.
  - Progression sujet (`/study/subjects/{id}/progress`) : agrégats sur séances (done/planned/skipped, difficulté moyenne, charge future).
- **Fichiers concernés** :
  - Backend : `app/routers/study.py`, `app/services/learning.py`, `app/schemas.py` (Study*), `backend/tests/test_study.py`.
  - Frontend : `src/lib/api.ts` (`apiStudySubjects`, `apiStudySubjectCreate`, `apiStudyPlanGenerate`, `apiStudySessionsDue`, `apiStudySessionUpdate`, `apiStudyCardCreate`, `apiStudyCardsDue`, `apiStudyCardReview`, `apiStudyAssist`), `src/lib/types.ts` (Study*), `src/app/page.tsx` (UI étude), `src/lib/mockData.ts` (données de démo), tests `lib/api.study.test.ts`, `lib/api.study.ui.test.tsx`, `app/page.study.interactions.test.tsx`.
- **Technologies** : FastAPI, MongoDB (Motor/PyMongo), httpx, OpenAI‑like API, React Query, Testing Library.
- **État** : **fonctionnelle** (tests d’intégration backend + tests unitaires/UI frontend).

### 3.14 Historique & logs agent

- **Nom** : AgentLog & historique utilisateur
- **Description** :
  - Tous les appels d’agent (plan, chat, summary), automations, notifications, commandes sont loggués dans `AgentLog`.
  - `/history` expose ces logs pour visualisation.
- **Fichiers** : `app/routers/history.py`, `app/routers/agent.py`, `app/routers/automation.py`, `app/routers/notifications.py`, `app/routers/commands.py`, `src/lib/api.ts` (`apiHistory`), `src/app/page.tsx`.
- **État** : **fonctionnelle**.

### 3.15 Dashboard frontend (page principale)

- **Nom** : Dashboard unifié (agenda, tâches, projets, agent, feedback, étude, automations, commandes, liens)
- **Description** (depuis `app/page.tsx`) :
  - Choix de vue agenda : jour / semaine / mois / année / liste.
  - Filtres (événements importants, types fixé/proposé), recherche globale avec Fuse.js.
  - Modales de création/modification de tâches, projets, événements.
  - Panneau de planification agent (quick actions, motifs de plan, affichage rationale, mise à jour des événements).
  - Panneau de feedback (scope day/week/month) avec stats + humeur du jour, objectifs quotidiens.
  - Panneau d’étude (sujets, génération de plan, sessions dues, cartes dues, aide pédagogique avec affichage de la sortie LLM).
  - Panneau d’automations (historique simple, rollback, mode manuel, validation sensible).
  - Panneau de commandes (ligne de commande textuelle, historique local).
  - Liens rapides (création/édition/suppression de liens type bookmarks).
- **Fichiers concernés** : `src/app/page.tsx`, `src/lib/api.ts`, `src/lib/timeUtils.ts`, `src/lib/mockData.ts`, `src/lib/types.ts`, `src/store/auth.ts`.
- **Technologies** : React client, React Query, Zustand, Fuse.js, lucide-react, Tailwind.
- **État** : **fonctionnelle**, mais très concentrée dans un seul fichier (monolithe UI).

### 3.16 Page de login

- **Nom** : Page de login/inscription
- **Description** :
  - Formulaire email/mot de passe.
  - Mode login / register (toggle bouton).
  - Validation simple (champs requis, confirmation mot de passe).
  - Appels `apiRegister` puis `apiLogin`, stockage du token + email, redirection vers `/`.
- **Fichiers** : `src/app/login/page.tsx`, `src/lib/api.ts`, `src/store/auth.ts`.
- **État** : **fonctionnelle**.

---

## 4. APIs, services et intégrations externes

### 4.1 APIs externes

- **API LLM (OpenAI‑like)** :
  - Utilisée pour :
    - Justification de planning (`services.agent.build_rationale`).
    - Aide pédagogique (`services.learning.pedagogic_assist`).
  - Endpoint : `${LLM_API_BASE}/chat/completions` (configurable).
  - Modèle : `LLM_MODEL` (par défaut `gpt-4o-mini`).
  - Gestion partielle d’OpenRouter (ajout de headers `HTTP-Referer`, `X-Title` si base contient `openrouter.ai`).

### 4.2 Variables d’environnement backend

D’après `backend/.env.example` et `config.py` :

- `APP_NAME` : nom de l’appli (`app_name`).
- `API_PREFIX` : préfixe API (par défaut `/api`).
- `SECRET_KEY` : clé secrète JWT.
- `ACCESS_TOKEN_EXPIRE_MINUTES` : durée de vie du token.
- `MONGODB_URI` / `MONGODB_DB` : connexion MongoDB (obligatoire).
- `OPENAI_API_KEY` : clé API LLM.
- `LLM_API_BASE` : base URL de l’API LLM.
- `LLM_MODEL` : identifiant modèle.

### 4.3 Variables d’environnement frontend

Depuis `frontend/.env.example` :

- `NEXT_PUBLIC_API_BASE` : base URL du backend (par défaut `http://localhost:8000/api`).

### 4.4 Points de configuration importants

- **CORS** : `CORSMiddleware` configuré avec `allow_origins=["*"]`, `allow_methods=["*"]`, `allow_headers=["*"]` → API accessible depuis n’importe quelle origine.
- **OAuth2PasswordBearer** : `tokenUrl` dérivé de `API_PREFIX` (`/api/auth/login`).
- **Base de données** : client Mongo Motor initialisé dans `db.py` (lifespan), partagé via dépendances FastAPI.

---

## 5. Gestion des données

### 5.1 Modèles de données principaux

Stockage MongoDB (collections) — schémas décrits via Pydantic dans `app/schemas.py` :

- **users** : email unique, mot de passe hashé, prefs par défaut (heures productives, charge).
- **projects** : nom, progression, description, objectifs, blockers, jalons, risques, décisions, notifications, dépendances, owner.
- **tasks** : métadonnées avancées (priorité, deadline, durée, statut, énergie, dépendances, lien projet/tâche parente).
- **events** : agenda (fixe/propose), liens tâches, récurrence, ICS, catégories, notes.
- **agent_logs** : traces d’actions agent (chat, summary, automations, commandes, notifications).
- **preferences** : plages productives, charge, durée de session, jours off, tâches pénibles.
- **study_subjects / study_plans / study_sessions / study_cards** : sujets, plans, séances, cartes (SM‑2 simplifié), progression sujet.

### 5.2 Stockage

- **Backend** :
  - MongoDB (Motor/PyMongo), collections listées ci-dessus.
  - Identifiants incrémentaux gérés via helpers (`get_next_id`).
- **Frontend** :
  - `localStorage` pour le store Zustand (token, email).
  - State en mémoire pour l’ensemble du dashboard (pas de persistance locale structurée autre que auth).

### 5.3 Sérialisation / import / export

- **JSON** :
  - Toutes les APIs REST échangent des JSON Pydantic (schemas) → typés côté frontend.
- **ICS** :
  - Import via `icalendar.Calendar.from_ical`, extraction des `VEVENT`, normalisation des dates dans `_as_datetime`, création d’`Event`.
  - Export via `Calendar()` et ajout de `IcsEvent` par événement.
- **Autres** :
  - Pas d’export CSV/ICS de tâches/projets.

---

## 6. Sécurité & bonnes pratiques

### 6.1 Gestion des clés et secrets

- Les secrets (SECRET_KEY, OPENAI_API_KEY) sont gérés via `.env` + `BaseSettings`.
- Valeurs par défaut dans `config.py` (e.g. `secret_key="CHANGE_ME"`) :
  - **Risque** si utilisées en production (clé faible connue).
- Le frontend utilise une variable publique (`NEXT_PUBLIC_API_BASE`) non sensible.

### 6.2 Authentification & stockage du token

- Auth côté backend :
  - JWT HS256 avec payload `sub` (email), `exp` (expiration), clé `SECRET_KEY`.
  - Validation dans `deps.get_current_user` via `decode_token`.
- Stockage côté frontend :
  - Token conservé dans un store Zustand persistant (`localStorage`).
  - En cas de 401, le client efface le store et redirige vers `/login`.
- **Points faibles** :
  - Token accessible en JS ⇒ vulnérable au XSS (mieux : cookie httpOnly + CSRF protection si formulaires stateful).
  - Pas de rotation/refresh de token, pas de gestion de révocation.

### 6.3 Validation des entrées

- FastAPI + Pydantic assurent une validation typée des payloads pour presque toutes les routes.
- Cas spécifiques :
  - `CommandRequest` / `AutomationRequest` / `NotificationSignals` : 
    - Les données sont acceptées telles quelles mais **uniquement loguées**, pas exécutées.
  - Import ICS :
    - Gestion d’exceptions et rejet des fichiers invalides.
  - Étude :
    - Vérification de l’appartenance du sujet à l’utilisateur avant création de plan ou carte.

### 6.4 Sécurité réseau / API

- **CORS permissif** : `allow_origins=["*"]` (adapté au développement, risqué en prod si API exposée largement).
- Pas de limitation de débit, ni de mécanismes anti‑brute‑force sur `/auth/login`.
- Pas d’autorisation fine (rôles/perms) — modèle multi‑tenant simple (données filtrées par `owner_id`).

### 6.5 Points faibles et risques

- Clé JWT par défaut prévisible si non surchargée.
- Token stocké côté client en localStorage.
- CORS très ouvert.
- Pas de politique de mot de passe (force minimale non imposée).
- Pas de logs de sécurité spécifiques (échecs de login, etc.).

---

## 7. Qualité du code

### 7.1 Lisibilité & style

- Backend :
  - Nom de fonctions et variables explicites, découpage clair par domaine.
  - Usage cohérent d’annotations de types, Pydantic v2, helpers Mongo.
  - Quelques docstrings pour méthodes internes importantes (`_as_datetime`, `build_rationale`, `sm2_update`).
- Frontend :
  - Types centralisés dans `lib/types.ts`.
  - Usage massif de hooks React/React Query pour orchestrer données et UI.
  - Point faible majeur : **page principale monolithique** (`app/page.tsx` > 5000 lignes) rendant la lisibilité et l’évolution difficiles.

### 7.2 Modularité & réutilisabilité

- Backend :
  - Bonne séparation **routers / schémas / services / utils**.
  - La planification doit être réécrite côté Mongo; `services.agent` ne gère plus que chat/logs.
  - Module d’étude centralisé dans `services.learning`.
- Frontend :
  - Bonne séparation des utilitaires (`api.ts`, `timeUtils.ts`, `types.ts`, `mockData.ts`).
  - Mauvaise séparation des composants : la quasi‑totalité du dashboard est dans un seul composant.

### 7.3 Respect des conventions

- Backend :
  - Style PEP 8 globalement respecté, typage systématique.
  - Utilisation de `pytest` + `pytest-asyncio` correcte, fixtures bien structurées (`conftest.py`).
- Frontend :
  - TypeScript strict, usage de `use client`, Next App Router standard.
  - ESLint/Next config présents, Vitest configuré.

### 7.4 Tests

- **Backend** :
  - `test_tasks.py` : CRUD tâches (attributs enrichis, dépendances, parent).
  - `test_events.py` : CRUD événements.
  - `test_commands.py` : routes commandes (succès/échec) + `test_utils.py` pour `build_command_repr`.
  - `test_study.py` : génération plan, sessions dues, mise à jour, cartes, review, study_assist.
  - Conftest configure un client Mongo de test et override les dépendances DB.
  - **Manques** : pas de tests pour agent de planning, feedback, automations, notifications, history, preferences.
- **Frontend** :
  - Fichiers de tests présents (`api.study.test.ts`, `api.study.ui.test.tsx`, `timeUtils.test.ts`, `page.study.interactions.test.tsx`), couvrant au moins le module étude & timeUtils.
  - Pas de tests unitaires évidents pour la logique globale du dashboard.

---

## 8. Performances & scalabilité

### 8.1 Points critiques potentiels

- Base de données :
  - MongoDB : ok pour usage personnel ; prévoir indexation/pagination pour monter en charge.
  - À plus grande échelle (multi-utilisateur, forte charge), surveiller la taille des collections et ajouter des index ciblés.
- Requêtes :
  - Plusieurs endpoints (`/history`, `/feedback`) chargent **toutes** les tâches/événements/projets sans pagination.
  - À volume important, les agrégations en mémoire peuvent devenir coûteuses.
- LLM :
  - Les appels à l’API LLM (planning rationale, aide pédagogique) sont synchrones dans la requête HTTP → latence directe côté utilisateur.

### 8.2 Limitations connues

- Aucune mise en cache côté backend.
- Aucune pagination/filtrage serveur pour les listes importantes.
- Frontend : grande quantité d’état géré dans un seul composant, ce qui peut impacter les rerenders.

### 8.3 Opportunités d’optimisation

- Ajout d’index sur colonnes fréquemment filtrées (`owner_id`, `deadline`, `start`, etc.).
- Pagination ou filtrage serveur pour `/tasks`, `/events`, `/history`, `/feedback`.
- Externalisation du LLM vers des tâches asynchrones si nécessaire (file de messages / worker) — pas implémenté actuellement.
- Découpage du composant principal en sous‑composants mémoïsés par section.

---

## 9. Améliorations suggérées

### 9.1 Améliorations fonctionnelles

| Description | Bénéfice attendu | Priorité |
| --- | --- | --- |
| Ajouter la suppression/édition de sujets d’étude et de plans | Gestion complète du cycle de vie des sujets/plans | Moyenne |
| Proposer une vue détaillée de l’historique agent (filtres par type : plan/chat/automation) | Meilleure traçabilité des décisions et essais | Moyenne |
| Ajouter une vue mobile dédiée (layout simplifié) | Expérience améliorée sur smartphone | Moyenne |
| Permettre l’export JSON/CSV des tâches/projets | Sauvegarde/interopérabilité des données | Faible |

### 9.2 Améliorations techniques

| Description | Bénéfice attendu | Priorité |
| --- | --- | --- |
| Indexer les collections Mongo (owner_id, deadlines, start, plan_id…) et ajouter de la pagination serveur | Scalabilité, temps de réponse réduits | Haute |
| Mettre en place sauvegarde/restore Mongo + configuration managée (Atlas/DocumentDB) | Robustesse / exploitation | Haute |
| Introduire des couches de repository/services explicites côté backend | Meilleure testabilité et séparation des responsabilités | Moyenne |
| Centraliser les appels LLM avec un client dédié (gestion erreurs, timeouts, retries) | Robustesse face aux erreurs réseau/API | Moyenne |

### 9.3 UX / UI

| Description | Bénéfice attendu | Priorité |
| --- | --- | --- |
| Refactoriser `app/page.tsx` en sous‑composants (Agenda, Tâches, Projets, Étude, Feedback, Agent…) | Lisibilité, maintenance, performances (rerenders ciblés) | Haute |
| Ajouter des indicateurs de chargement & états vides clairs pour chaque section | Meilleure compréhension des états de l’app | Moyenne |
| Introduire un thème sombre / clair basculable | Confort d’utilisation prolongé | Faible |

### 9.4 Sécurité

| Description | Bénéfice attendu | Priorité |
| --- | --- | --- |
| Remplacer `secret_key` par une valeur forte en prod (pas `CHANGE_ME`) et vérifier qu’elle vient de l’environnement | Sécurisation des tokens JWT | Haute |
| Stocker le token en cookie httpOnly + CSRF protection plutôt qu’en localStorage | Réduction surface XSS | Haute |
| Restreindre CORS (origines autorisées explicites) | Limiter les risques d’abus cross‑origin | Haute |
| Ajouter une politique de mot de passe minimale (longueur, complexité) | Réduction brute‑force / credential stuffing | Moyenne |

### 9.5 Performance

| Description | Bénéfice attendu | Priorité |
| --- | --- | --- |
| Ajouter pagination/filtrage sur `/tasks`, `/events`, `/history`, `/feedback` | Réduction charge serveur et temps de réponse | Moyenne |
| Cacher les résultats `feedback`/`history` sur intervalle donné | Diminution du calcul répété | Faible |

### 9.6 Scalabilité

| Description | Bénéfice attendu | Priorité |
| --- | --- | --- |
| Externaliser Mongo vers un service managé (Atlas/DocumentDB) et définir stratégie de sauvegarde | Montée en charge plus aisée | Moyenne |
| Introduire une architecture à base de jobs asynchrones (ex. pour appels LLM lourds) | Mieux absorber la latence et les pics de charge | Moyenne |

### 9.7 Maintenabilité

| Description | Bénéfice attendu | Priorité |
| --- | --- | --- |
| Refactoriser les sections du dashboard en composants isolés + hooks métier dédiés | Réduction de la complexité, facilité d’évolution | Haute |
| Étendre la couverture de tests backend (agent, feedback, automations, notifications, history, preferences) | Sécurité fonctionnelle lors des refactorings | Haute |
| Ajouter des tests e2e simples (Playwright / Cypress) | Validation du parcours utilisateur clé | Moyenne |
| Documenter l’API (tags enrichis, descriptions) avec OpenAPI/Swagger plus détaillé | Onboarding développeur facilité | Faible |

---

## 10. Fonctionnalités futures envisageables

> Ces éléments ne sont **pas** présents dans le code actuel, ils représentent des pistes d’évolution.

- **Intégration calendrier externe** (Google Calendar / Outlook) :
  - Synchronisation bidirectionnelle en plus d’ICS (webhooks, API officielles).
- **Notifications push réelles** :
  - Utiliser Web Push / mobile push plutôt que simple logging.
- **Automations exécutables** :
  - Connecter les actions `script/api/file/message/webhook` à un moteur d’exécution supervisé (avec sandbox et audit).
- **Mode multi‑utilisateur / équipes** :
  - Partage de projets/calendriers, permissions par utilisateur, espaces d’équipe.
- **Recommandations proactives de l’agent** :
  - Replanification automatique en cas de dérive, suggestion d’objectifs journaliers.
- **Analytique avancée** :
  - Heatmaps de charge, corrélation énergie / complétion, suggestions basées sur historiques passés.

---

## 11. Conclusion

- **État global du projet** :
  - Backend : architecture claire, domaine bien modélisé, plusieurs fonctionnalités avancées (planification, feedback, étude, ICS), tests d’intégration déjà en place.
  - Frontend : riche fonctionnellement, UI unifiée sur un seul écran, mais fortement monolithique.
- **Niveau de maturité** :
  - **MVP avancé** orienté usage personnel, prêt à être utilisé en environnement de développement / perso.
  - Pour de la production multi‑utilisateur, un travail reste nécessaire sur : sécurité, DB, modularité front, tests étendus.
- **Recommandations finales** :
  - Sécuriser les fondamentaux (SECRET_KEY, stockage token, CORS, DB) avant toute exposition publique.
  - Refactoriser le dashboard en composants modulaires et renforcer la couverture de tests (agent, feedback, automations…).
  - Si une montée en charge est prévue, planifier dès maintenant l'externalisation Mongo en service managé et un moteur de jobs asynchrones pour les appels LLM.

Ce projet constitue une base solide pour un tableau de bord IA personnel moderne, avec un backend bien structuré et un socle fonctionnel riche. La priorité pour la suite est d’améliorer la sécurité, la modularité du frontend et la robustesse opérationnelle afin de le rapprocher d’un niveau "prêt production".
