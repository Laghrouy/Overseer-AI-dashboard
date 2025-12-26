import { FeedbackScope, FeedbackStats } from "@/lib/types";
import { useAuthStore } from "@/store/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

type LoginResponse = { access_token: string; token_type: string };
type UserMe = { id: number; email: string };
type ApiTask = {
  id: number;
  title: string;
  description?: string;
  priority: "basse" | "normale" | "haute";
  deadline?: string;
  duration_minutes?: number;
  status: "a_faire" | "en_cours" | "terminee";
   category?: string | null;
   energy?: number | null;
   parent_task_id?: number | null;
   dependencies?: number[] | null;
   order_index?: number | null;
  project_id?: number | null;
};
type ApiEvent = {
  id: number;
  title: string;
  start: string;
  end: string;
  kind: "fixe" | "propose";
  category?: string | null;
  task_id?: number | null;
  description?: string | null;
  note?: string | null;
  location?: string | null;
  url?: string | null;
  color?: string | null;
  important?: boolean | null;
  is_all_day?: boolean | null;
  attachments?: string[] | null;
  recurrence?: "daily" | "weekly" | "monthly" | "yearly" | "custom" | null;
  recurrence_interval?: number | null;
  recurrence_until?: string | null;
  recurrence_custom?: string | null;
};
type ApiProject = {
  id: number;
  name: string;
  progress: number;
  description?: string | null;
  objectives?: string[] | null;
  due_date?: string | null;
  subgoals?: string[] | null;
  blockers?: { id?: string; title: string; detail?: string; status?: string }[] | null;
  milestones?: string[];
  milestones_dates?: { id?: string; title: string; start?: string; end?: string; level?: string }[];
  risks?: { id?: string; title: string; detail?: string; level?: string }[];
  decisions?: { id?: string; title: string; detail?: string; date?: string }[];
  notifications?: { id?: string; message: string; when?: string }[];
  dependencies?: string[];
};
type AgentPlanResponse = {
  message: string;
  events: ApiEvent[];
  rationale: string;
};
type AgentChatResponse = { reply: string };
type UserPreference = {
  productive_hours?: Array<{ start?: string; end?: string }>;
  daily_load_limit_hours?: number | null;
  session_duration_minutes?: number | null;
  days_off?: string[] | null;
  painful_tasks?: string[] | null;
};
type HistoryResponse = {
  tasks: ApiTask[];
  events: ApiEvent[];
  projects: ApiProject[];
  agent_logs: Array<{ id: number; action: string; rationale: string; diff: string; created_at: string }>;
};

export type AutomationAction = "script" | "api" | "file" | "message" | "webhook";
type AutomationRequest = {
  action: AutomationAction;
  target?: string;
  payload?: Record<string, unknown>;
  message?: string;
};
type AutomationResponse = { id: string; action: string; status: string; detail: string; created_at: string };
type AutomationRollbackRequest = { id?: string; reason?: string };
type AutomationRollbackResponse = { status: string; detail: string; created_at: string };
type CommandRequest = { command: string; args?: string[] };
type CommandResponse = { status: string; output: string; created_at: string };

type ApiStudySubject = {
  id: number;
  name: string;
  description?: string | null;
  ue_code?: string | null;
};

type ApiStudySession = {
  id: number;
  subject_id?: number | null;
  plan_id?: number | null;
  kind: "revision" | "rappel" | "exercice" | "quiz" | "resume";
  topic?: string | null;
  status: "planned" | "done" | "skipped";
  scheduled_for?: string | null;
  duration_minutes: number;
  completed_at?: string | null;
  difficulty?: number | null;
  notes?: string | null;
};

type ApiStudyPlan = {
  id: number;
  title: string;
  subject_id?: number | null;
  exam_date?: string | null;
  total_minutes?: number | null;
  sessions: ApiStudySession[];
};

type ApiStudyCard = {
  id: number;
  subject_id?: number | null;
  front: string;
  back: string;
  due_at: string;
  interval_days: number;
  ease: number;
  streak: number;
  last_score?: number | null;
};

type NotificationSignalsPayload = {
  reminders: Record<string, string[]>;
  anticipation: Record<string, string[]>;
  context?: string;
};
type CreateTaskPayload = {
  title: string;
  priority?: ApiTask["priority"];
  deadline?: string;
  duration_minutes?: number;
  category?: string | null;
  energy?: number | null;
  parent_task_id?: number | null;
  dependencies?: number[] | null;
  order_index?: number | null;
  project_id?: number | null;
};
type UpdateTaskPayload = Partial<CreateTaskPayload> & { status?: ApiTask["status"] };
type UpdateProjectMilestonesPayload = {
  milestones_dates: ApiProject["milestones_dates"];
};
type CreateProjectPayload = {
  name: string;
  progress?: number;
  description?: string;
  objectives?: string[];
  due_date?: string;
  subgoals?: string[];
  blockers?: ApiProject["blockers"];
  milestones?: string[];
  milestones_dates?: ApiProject["milestones_dates"];
  risks?: ApiProject["risks"];
  decisions?: ApiProject["decisions"];
  notifications?: ApiProject["notifications"];
  dependencies?: string[];
};
type UpdateProjectPayload = Partial<CreateProjectPayload>;
type CreateEventPayload = {
  title: string;
  start: string;
  end: string;
  kind?: ApiEvent["kind"];
  category?: ApiEvent["category"];
  task_id?: number | null;
  description?: string | null;
  note?: string | null;
  location?: string | null;
  url?: string | null;
  color?: string | null;
  important?: boolean | null;
  is_all_day?: boolean | null;
  attachments?: string[] | null;
  recurrence?: ApiEvent["recurrence"];
  recurrence_interval?: number | null;
  recurrence_until?: string | null;
  recurrence_custom?: string | null;
};

type ApiError = {
  detail?: string | { msg?: string }[];
};

async function handleResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();
  if (!res.ok) {
    if (res.status === 401) {
      // Token invalide ou expiré : on nettoie le store et on redirige vers la page de login.
      useAuthStore.getState().clear();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Session expirée, veuillez vous reconnecter.");
    }
    const err = body as ApiError;
    const detail = Array.isArray(err.detail)
      ? err.detail.map((d) => d.msg).join(", ")
      : typeof err.detail === "string"
        ? err.detail
        : "Erreur inconnue";
    throw new Error(detail || res.statusText);
  }
  return body as T;
}

export async function apiRegister(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  await handleResponse(res);
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  return handleResponse<LoginResponse>(res);
}

async function authFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse<T>(res);
}

export async function apiMe(token: string): Promise<UserMe> {
  return authFetch<UserMe>("/auth/me", token);
}

export async function apiTasks(token: string): Promise<ApiTask[]> {
  return authFetch<ApiTask[]>("/tasks", token);
}

export async function apiCreateTask(token: string, payload: CreateTaskPayload): Promise<ApiTask> {
  return authFetch<ApiTask>("/tasks", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateTask(token: string, id: number, payload: UpdateTaskPayload): Promise<ApiTask> {
  return authFetch<ApiTask>(`/tasks/${id}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteTask(token: string, id: number): Promise<void> {
  await authFetch<void>(`/tasks/${id}`, token, { method: "DELETE" });
}

export async function apiEvents(token: string): Promise<ApiEvent[]> {
  return authFetch<ApiEvent[]>("/events", token);
}

export async function apiCreateEvent(token: string, payload: CreateEventPayload): Promise<ApiEvent> {
  return authFetch<ApiEvent>("/events", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateEvent(token: string, id: number, payload: Partial<CreateEventPayload>): Promise<ApiEvent> {
  return authFetch<ApiEvent>(`/events/${id}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteEvent(token: string, id: number): Promise<void> {
  await authFetch<void>(`/events/${id}`, token, { method: "DELETE" });
}

export async function apiProjects(token: string): Promise<ApiProject[]> {
  return authFetch<ApiProject[]>("/projects", token);
}

export async function apiCreateProject(token: string, payload: CreateProjectPayload): Promise<ApiProject> {
  return authFetch<ApiProject>("/projects", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiUpdateProject(token: string, id: number, payload: UpdateProjectPayload): Promise<ApiProject> {
  return authFetch<ApiProject>(`/projects/${id}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiDeleteProject(token: string, id: number): Promise<void> {
  await authFetch<void>(`/projects/${id}`, token, { method: "DELETE" });
}

export async function apiUpdateProjectMilestones(token: string, id: number, payload: UpdateProjectMilestonesPayload): Promise<ApiProject> {
  return authFetch<ApiProject>(`/projects/${id}/milestones`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiAgentPlan(
  token: string,
  input: string | { date?: string; mode?: "day" | "week"; reason?: string }
): Promise<AgentPlanResponse> {
  const payload = typeof input === "string" ? { date: input, mode: "day" } : { mode: "day", ...input };
  return authFetch<AgentPlanResponse>("/agent/plan", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiImportIcs(token: string, file: File): Promise<{ imported: number }> {
  const form = new FormData();
  form.append("file", file);
  return authFetch<{ imported: number }>("/events/import/ics", token, {
    method: "POST",
    body: form,
  });
}

export async function apiExportIcs(token: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/events/export/ics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Export ICS échoué");
  return await res.blob();
}

export async function apiAgentChat(token: string, message: string, tone?: "formel" | "detendu", meta?: Record<string, unknown>): Promise<AgentChatResponse> {
  return authFetch<AgentChatResponse>("/agent/chat", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, tone, meta }),
  });
}

export async function apiChatSummary(token: string, messages: { role: string; content: string }[]): Promise<{ summary: string }> {
  return authFetch<{ summary: string }>("/agent/chat-summary", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Résumé de conversation", history: messages }),
  });
}

export async function apiUserPreferencesGet(token: string): Promise<UserPreference> {
  return authFetch<UserPreference>("/user/preferences", token);
}

export async function apiUserPreferencesUpdate(token: string, payload: UserPreference): Promise<UserPreference> {
  return authFetch<UserPreference>("/user/preferences", token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiHistory(token: string): Promise<HistoryResponse> {
  return authFetch<HistoryResponse>("/history", token);
}

export async function apiAutomation(token: string, payload: AutomationRequest): Promise<AutomationResponse> {
  return authFetch<AutomationResponse>("/automation", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiAutomationRollback(token: string, payload: AutomationRollbackRequest): Promise<AutomationRollbackResponse> {
  return authFetch<AutomationRollbackResponse>("/automation/rollback", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiCommand(token: string, payload: CommandRequest): Promise<CommandResponse> {
  return authFetch<CommandResponse>("/commands", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiFeedback(token: string, params?: { date?: string; scope?: FeedbackScope }): Promise<FeedbackStats> {
  const search = new URLSearchParams();
  if (params?.date) search.set("date", params.date);
  if (params?.scope) search.set("scope", params.scope);
  const qs = search.toString();
  const path = `/feedback${qs ? `?${qs}` : ""}`;
  return authFetch<FeedbackStats>(path, token);
}

export async function apiPushNotifications(token: string, payload: NotificationSignalsPayload): Promise<void> {
  const res = await fetch(`${API_BASE}/notifications`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to push notifications");
}

// --- Study / learning ---
export async function apiStudySubjects(token: string): Promise<ApiStudySubject[]> {
  return authFetch<ApiStudySubject[]>("/study/subjects", token);
}

export async function apiStudySubjectCreate(token: string, payload: { name: string; description?: string; ue_code?: string }): Promise<ApiStudySubject> {
  return authFetch<ApiStudySubject>("/study/subjects", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiStudySubjectUpdate(
  token: string,
  subjectId: number,
  payload: { name?: string; description?: string; ue_code?: string }
): Promise<ApiStudySubject> {
  return authFetch<ApiStudySubject>(`/study/subjects/${subjectId}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiStudySubjectDelete(token: string, subjectId: number): Promise<void> {
  await authFetch<void>(`/study/subjects/${subjectId}`, token, { method: "DELETE" });
}

export async function apiStudyPlanGenerate(
  token: string,
  payload: { subject_id: number; topics: string[]; exam_date?: string; total_minutes?: number; session_minutes?: number; sessions_per_day?: number }
): Promise<ApiStudyPlan> {
  return authFetch<ApiStudyPlan>("/study/plan/generate", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiStudyPlans(token: string, params?: { subject_id?: number }): Promise<ApiStudyPlan[]> {
  const search = new URLSearchParams();
  if (params?.subject_id != null) search.set("subject_id", String(params.subject_id));
  const qs = search.toString();
  const path = `/study/plans${qs ? `?${qs}` : ""}`;
  return authFetch<ApiStudyPlan[]>(path, token);
}

export async function apiStudyPlanUpdate(
  token: string,
  planId: number,
  payload: { title?: string; exam_date?: string; total_minutes?: number }
): Promise<ApiStudyPlan> {
  return authFetch<ApiStudyPlan>(`/study/plans/${planId}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiStudyPlanDelete(token: string, planId: number): Promise<void> {
  await authFetch<void>(`/study/plans/${planId}`, token, { method: "DELETE" });
}

export async function apiStudySessionsDue(token: string): Promise<ApiStudySession[]> {
  return authFetch<ApiStudySession[]>("/study/sessions/due", token);
}

export async function apiStudySessionUpdate(token: string, sessionId: number, payload: Partial<ApiStudySession>): Promise<ApiStudySession> {
  return authFetch<ApiStudySession>(`/study/sessions/${sessionId}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiStudyCardCreate(token: string, payload: { subject_id: number; front: string; back: string; due_at?: string }): Promise<ApiStudyCard> {
  return authFetch<ApiStudyCard>("/study/cards", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function apiStudyCardsDue(token: string): Promise<ApiStudyCard[]> {
  return authFetch<ApiStudyCard[]>("/study/cards/due", token);
}

export async function apiStudyCardReview(token: string, cardId: number, score: number): Promise<ApiStudyCard> {
  return authFetch<ApiStudyCard>(`/study/cards/${cardId}/review`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ score }),
  });
}

export async function apiStudyAssist(
  token: string,
  payload: { subject: string; topic?: string; content?: string; mode?: string; difficulty?: string; items?: number }
): Promise<{ output: string }> {
  return authFetch<{ output: string }>("/study/assist", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
