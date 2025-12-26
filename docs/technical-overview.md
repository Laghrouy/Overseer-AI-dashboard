# Overseer — Technical Overview

## System Overview
Overseer is a two-tier app (Next.js + FastAPI) backed by MongoDB and an LLM client. The UI offers dashboard, agenda, tasks/projects, automations, and agent chat capabilities.

## Module Map
- Frontend (Next.js)
  - App Router pages: dashboard, agenda, tasks-projects, agent, automations, feedback, links, settings, login.
  - State: Zustand (auth), React Query (server data), theme persistence.
  - UI shell: `AppShell`, feature views under `src/app/dashboard/views`.
- Backend (FastAPI)
  - Routers: auth, agent, tasks, events, projects, commands, automations, feedback, notifications, preferences, history.
  - Services: LLM client, agent orchestration, learning.
  - Persistence: MongoDB via Motor, helper utilities and repositories.
  - Security: JWT access tokens, settings-driven secret, token expiry.
- CI: GitHub Actions workflow `backend-tests.yml` runs Mongo-backed Pytest suite.

### Logical Diagram (textual)
```
Browser → Next.js (App Router) → REST calls (fetch/React Query)
       → FastAPI routers (/api/*) → MongoDB (collections per domain)
                                 → LLM (OpenAI/OpenRouter) via services.llm_client
```

## Feature Breakdown
- Dashboard: aggregated cards for agenda, tasks/projects, links, preferences, feedback.
- Agenda: CRUD, ICS import/export, categories, time normalization.
- Tasks/Projects: CRUD endpoints with owner scoping, simple prioritization hooks.
- Agent: chat endpoint that routes to LLM client; planning endpoint placeholder to extend.
- Automations/Commands: stubs ready for trigger/command execution flows.
- Feedback/Notifications/Preferences: user-specific documents for UI tuning and signals.

## Data Flows
- Auth: client obtains JWT (to be wired with `/api/auth/login`); token persisted in `overseer-auth`; used in API calls.
- Agenda import: ICS uploaded → parsed server-side → normalized datetimes → stored in `events` collection.
- Agent chat: UI sends message list → `LLMClient.chat` → OpenAI/OpenRouter → response returned to UI.
- State sync: React Query caches server data; Zustand stores auth and theme preferences locally.

## AI Agent Role
- Central entry for LLM calls via `services.llm_client.LLMClient`.
- Supports OpenRouter headers and customizable model/base.
- Intended to power chat, summaries, and future planning/automation features.

## API Surface (main routes)
- `/api/auth/*` : authentication (JWT issuance, current user helpers).
- `/api/tasks/*` : task CRUD.
- `/api/projects/*` : project CRUD.
- `/api/events/*` : agenda CRUD + ICS import/export.
- `/api/agent/*` : chat, planned automation hooks.
- `/api/commands`, `/api/automations`, `/api/feedback`, `/api/notifications`, `/api/preferences`, `/api/history`, `/api/study`: domain routes scaffolded for expansion.

## State Management
- Frontend: Zustand store `useAuthStore` persisted under `overseer-auth`; theme under `overseer-theme`; React Query for remote cache.
- Backend: Mongo collections per domain; incremental ID helper (`get_next_id`) for predictable numeric IDs alongside Mongo ObjectIds.

## Security & Auth
- JWT tokens signed with `SECRET_KEY`, expiry `ACCESS_TOKEN_EXPIRE_MINUTES`.
- Owner scoping on most queries (`owner_id` in filters) to keep tenant data isolated.
- Recommendations: httpOnly cookies in production, HTTPS, rotate secrets, least-privilege Mongo user, rate limiting at gateway level.

## Technical Choices
- Next.js App Router for layouts and server/client composition.
- React Query to harmonize data fetching and caching; Zustand for lightweight local state.
- FastAPI for typed, async Python services with Pydantic v2 models.
- MongoDB for flexible documents; Motor for async access; PyMongo helpers for compatibility.
- Pytest for backend coverage; Vitest + Testing Library for frontend.

## Extension Ideas
- Wire login UI to `/api/auth/login` with cookies.
- Implement agent planning and automation execution pipeline.
- Add role-based permissions and audit logging.
- Add e2e smoke tests (Playwright) for critical flows.
