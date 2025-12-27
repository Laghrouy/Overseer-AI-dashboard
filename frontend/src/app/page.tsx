"use client";

/* eslint-disable react/no-unescaped-entities, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Fuse from "fuse.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  MessageCircle,
  Sparkles,
  Timer,
  ListChecks,
  PlayCircle,
  Plus,
  AlertTriangle,
  BellRing,
  Trash2,
  Brain,
  GraduationCap,
  BarChart,
  HeartPulse,
  Trophy,
  Flag,
  TrendingUp,
  TerminalSquare,
  Send,
  FilePlus2,
  Globe2,
  Webhook,
  ShieldCheck,
  Undo2,
  Terminal,
  Moon,
  SunMedium,
} from "lucide-react";
import { demoChat, demoEvents, demoProjects, demoStats, demoTasks } from "@/lib/mockData";
import {
  AgendaEvent,
  ChatMessage,
  Priority,
  Project,
  ProjectBlocker,
  ProjectMilestone,
  Task,
  StudyCard,
  StudySession,
  StudySubject,
  StudyPlan,
  FeedbackScope,
  FeedbackStats,
} from "@/lib/types";

import { DashboardViewContext, type DashboardView, useDashboardView } from "./dashboard/context";
import { FeedbackView } from "./dashboard/views/FeedbackView";
import { LinksView } from "./dashboard/views/LinksView";
import { AgendaChatView } from "./dashboard/views/AgendaChatView";
import { PreferencesView } from "./dashboard/views/PreferencesView";
import { StudyView } from "./dashboard/views/StudyView";
import { TasksProjectsView } from "./dashboard/views/TasksProjectsView";
import { ActionButton, CardContainer, HeatmapCard, PriorityBadge, StatCard, StatusDot } from "./dashboard/ui";
import {
  analyzeDay,
  computeDailyLoads,
  computeLoad,
  computeWorkWindowHours,
  inRange,
  isSameDay,
  startOfDay,
  startOfWeek,
} from "@/lib/timeUtils";
import { useAgendaController } from "./features/agenda/controller";
import {
  apiAgentPlan,
  apiAgentChat,
  apiCreateEvent,
  apiCreateProject,
  apiUpdateProject,
  apiDeleteProject,
  apiCreateTask,
  apiMe,
  apiProjects,
  apiUpdateProjectMilestones,
  apiTasks,
  apiUpdateEvent,
  apiUpdateTask,
  apiDeleteTask,
  apiUserPreferencesGet,
  apiUserPreferencesUpdate,
  apiHistory,
  apiChatSummary,
  apiAutomation,
  apiAutomationRollback,
  apiCommand,
  apiStudySubjects,
  apiStudySubjectCreate,
  apiStudyPlanGenerate,
  apiStudySessionsDue,
  apiStudySessionUpdate,
  apiStudyCardCreate,
  apiStudyCardsDue,
  apiStudyCardReview,
  apiStudyAssist,
  apiStudySubjectUpdate,
  apiStudySubjectDelete,
  apiStudyPlans,
  apiStudyPlanUpdate,
  apiStudyPlanDelete,
  apiPushNotifications,
  apiFeedback,
} from "@/lib/api";
import type { AutomationAction } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useTheme } from "./providers";
import { formatDateRange, formatTime } from "./dashboard/formatters";

type QuickAction = "organiser" | "bilan" | "optimiser";
type QuickLink = { id: string; title: string; url: string };
type PlanReason = "" | "retard" | "imprevu" | "annulation" | "report" | "optimisation";
type CreateEventInput = Parameters<typeof apiCreateEvent>[1];
const eventCategories = ["general", "travail", "perso", "sante", "administratif", "tache"] as const;
const blockerStatusOptions = ["ouvert", "en_cours", "bloque", "resolu"] as const;
export function DashboardPage({ view }: { view: DashboardView }) {
  return (
    <DashboardViewContext.Provider value={view}>
      <HomeContent />
    </DashboardViewContext.Provider>
  );
}

export default function Home() {
  return <DashboardPage view="dashboard" />;
}

function HomeContent() {
  const view = useDashboardView();
  const { token, email, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const wantsAgenda = view === "dashboard" || view === "agenda" || view === "agent";
  const wantsTasksProjects = view === "dashboard" || view === "tasks-projects";
  const wantsStudy = view === "dashboard" || view === "study";
  const wantsFeedback = view === "dashboard" || view === "feedback";
  const wantsPreferences = wantsFeedback || view === "agent";
  const queryClient = useQueryClient();
  const {
    eventsQuery: agendaEventsQuery,
    eventsData: agendaEventsFiltered,
    eventsLoading,
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    shiftDate,
    dayEvents: agendaDayEvents,
    importIcs,
    exportIcs,
    filterImportant,
    setFilterImportant,
    filterTypes,
    setFilterTypes,
    searchQuery,
    setSearchQuery,
    searchResults: agendaSearchResults,
    deleteEvent: agendaDeleteEvent,
  } = useAgendaController();
  const lastSignalsRef = useRef<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [planMode, setPlanMode] = useState<"day" | "week">("day");
  const [planReason, setPlanReason] = useState<PlanReason>("");
  const [synthScope, setSynthScope] = useState<"day" | "week">("day");
  const [feedbackScope, setFeedbackScope] = useState<FeedbackScope>("day");
  const [checkInMood, setCheckInMood] = useState<number>(6);
  const [checkInNote, setCheckInNote] = useState("");
  const [checkInSaved, setCheckInSaved] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<string[]>(["", "", ""]);
  const [dailyGoalsDone, setDailyGoalsDone] = useState<boolean[]>([false, false, false]);
  const [prefProductiveStart, setPrefProductiveStart] = useState("");
  const [prefProductiveEnd, setPrefProductiveEnd] = useState("");
  const [prefLoadLimit, setPrefLoadLimit] = useState("");
  const [prefSession, setPrefSession] = useState("");
  const [prefDaysOff, setPrefDaysOff] = useState("");
  const [prefPainfulTasks, setPrefPainfulTasks] = useState("");
  const [agentHistoryFilter, setAgentHistoryFilter] = useState<"all" | "plan" | "chat" | "automation">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [sensitiveValidation, setSensitiveValidation] = useState(false);
  const [automationHistory, setAutomationHistory] = useState<string[]>([]);
  const [lastAutomationId, setLastAutomationId] = useState<string | null>(null);
  const [chatTone, setChatTone] = useState<"formel" | "detendu">("detendu");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [clarifyPrompt, setClarifyPrompt] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectUe, setNewSubjectUe] = useState("");
  const [newSubjectDesc, setNewSubjectDesc] = useState("");
  const [planSubjectId, setPlanSubjectId] = useState("");
  const [planTopics, setPlanTopics] = useState("");
  const [planExamDate, setPlanExamDate] = useState("");
  const [planSessionsPerDay, setPlanSessionsPerDay] = useState("1");
  const [planSessionMinutes, setPlanSessionMinutes] = useState("45");
  const [newCardSubjectId, setNewCardSubjectId] = useState("");
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");
  const [assistSubject, setAssistSubject] = useState("");
  const [assistTopic, setAssistTopic] = useState("");
  const [assistContent, setAssistContent] = useState("");
  const [assistMode, setAssistMode] = useState<"resume" | "explication" | "exercices" | "quiz">("resume");
  const [assistDifficulty, setAssistDifficulty] = useState("");
  const [assistItems, setAssistItems] = useState("");
  const [assistOutput, setAssistOutput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [commandInput, setCommandInput] = useState("");
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([
    { id: "ql-dashboard", title: "Tableau de bord", url: "https://app.example.com" },
    { id: "ql-calendar", title: "Calendrier", url: "https://calendar.google.com" },
    { id: "ql-notes", title: "Notes", url: "https://www.notion.so" },
  ]);
  const [showQuickLinkForm, setShowQuickLinkForm] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [editingQuickLinkId, setEditingQuickLinkId] = useState<string | null>(null);
  const [editLinkTitle, setEditLinkTitle] = useState("");
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [showQuickLinkModal, setShowQuickLinkModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("normale");
  const [newTaskDuration, setNewTaskDuration] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("");
  const [newTaskEnergy, setNewTaskEnergy] = useState("");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [newTaskParentId, setNewTaskParentId] = useState("");
  const [newTaskDependencies, setNewTaskDependencies] = useState("");
  const [newTaskOrder, setNewTaskOrder] = useState("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectProgress, setNewProjectProgress] = useState("0");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectObjectives, setNewProjectObjectives] = useState("");
  const [newProjectDueDate, setNewProjectDueDate] = useState("");
  const [newProjectSubgoals, setNewProjectSubgoals] = useState("");
  const [newProjectBlockers, setNewProjectBlockers] = useState<ProjectBlocker[]>([]);
  const [newBlockerTitle, setNewBlockerTitle] = useState("");
  const [newBlockerStatus, setNewBlockerStatus] = useState("ouvert");
  const [newProjectMilestones, setNewProjectMilestones] = useState<ProjectMilestone[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneStart, setNewMilestoneStart] = useState("");
  const [newMilestoneEnd, setNewMilestoneEnd] = useState("");
  const [newMilestoneLevel, setNewMilestoneLevel] = useState("");
  const [projectSort, setProjectSort] = useState<"progress" | "risk" | "alphabetique">("progress");
  const [projectRiskOnly, setProjectRiskOnly] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showNewProjectMilestoneModal, setShowNewProjectMilestoneModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventStart, setNewEventStart] = useState("");
  const [newEventEnd, setNewEventEnd] = useState("");
  const [newEventNote, setNewEventNote] = useState("");
  const [newEventRecurrence, setNewEventRecurrence] = useState<
    "" | "daily" | "weekly" | "monthly" | "yearly" | "custom"
  >("");
  const [newEventUntil, setNewEventUntil] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventUrl, setNewEventUrl] = useState("");
  const [newEventCategory, setNewEventCategory] = useState("general");
  const [newEventColor, setNewEventColor] = useState("#2563eb");
  const [newEventImportant, setNewEventImportant] = useState(false);
  const [newEventAllDay, setNewEventAllDay] = useState(false);
  const [newEventAttachments, setNewEventAttachments] = useState("");
  const [newEventRecurrenceInterval, setNewEventRecurrenceInterval] = useState("1");
  const [newEventRecurrenceCustom, setNewEventRecurrenceCustom] = useState("");
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editRecurrence, setEditRecurrence] = useState<"" | "daily" | "weekly" | "monthly" | "yearly" | "custom">("");
  const [editUntil, setEditUntil] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [editColor, setEditColor] = useState("#2563eb");
  const [editImportant, setEditImportant] = useState(false);
  const [editAllDay, setEditAllDay] = useState(false);
  const [editAttachments, setEditAttachments] = useState("");
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState("1");
  const [editRecurrenceCustom, setEditRecurrenceCustom] = useState("");
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [quickKanban, setQuickKanban] = useState(buildKanban([]));
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", token],
    enabled: wantsTasksProjects,
    queryFn: async () => {
      const tasks = await apiTasks(token ?? "");
      return tasks.map<Task>((t) => ({
        id: String(t.id),
        title: t.title,
        description: t.description ?? undefined,
        projectId: t.project_id ? String(t.project_id) : undefined,
        priority: t.priority,
        deadline: t.deadline,
        durationMinutes: t.duration_minutes ?? undefined,
        category: t.category ?? undefined,
        energy: t.energy ?? undefined,
        parentTaskId: t.parent_task_id ? String(t.parent_task_id) : undefined,
        dependencies: (t.dependencies || []).map((d) => String(d)),
        orderIndex: t.order_index ?? undefined,
        status: t.status,
      }));
    },
  });
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", token],
    enabled: wantsTasksProjects,
    queryFn: async () => {
      const projects = await apiProjects(token ?? "");
      return projects.map((p) => mapProject(p));
    },
  });

  const { data: preferencesData, isFetching: preferencesLoading } = useQuery({
    queryKey: ["preferences", token],
    enabled: Boolean(token) && wantsPreferences,
    queryFn: () => apiUserPreferencesGet(token as string),
  });

  useEffect(() => {
    if (!preferencesData) return;
    const productive = preferencesData.productive_hours?.[0];
    setPrefProductiveStart(productive?.start ?? "");
    setPrefProductiveEnd(productive?.end ?? "");
    setPrefLoadLimit(preferencesData.daily_load_limit_hours ? String(preferencesData.daily_load_limit_hours) : "");
    setPrefSession(preferencesData.session_duration_minutes ? String(preferencesData.session_duration_minutes) : "");
    setPrefDaysOff((preferencesData.days_off ?? []).join(","));
    setPrefPainfulTasks((preferencesData.painful_tasks ?? []).join(","));
  }, [preferencesData]);

  const { data: historyData, isFetching: historyLoading } = useQuery({
    queryKey: ["history", token],
    enabled: wantsPreferences,
    queryFn: () => apiHistory(token ?? ""),
  });

  const feedbackQuery = useQuery({
    queryKey: ["feedback", token, feedbackScope, selectedDate.toISOString()],
    enabled: Boolean(token) && wantsFeedback,
    queryFn: () => apiFeedback(token as string, { date: selectedDate.toISOString(), scope: feedbackScope }),
  });

  const studySubjectsQuery = useQuery({
    queryKey: ["study-subjects", token],
    enabled: Boolean(token) && wantsStudy,
    queryFn: () => apiStudySubjects(token as string).then((subjects) => subjects.map((s) => mapStudySubject(s))),
  });

  const studyPlansQuery = useQuery({
    queryKey: ["study-plans", token],
    enabled: Boolean(token) && wantsStudy,
    queryFn: () => apiStudyPlans(token as string).then((plans) => plans.map((p) => mapStudyPlan(p))),
  });

  const studySessionsDueQuery = useQuery({
    queryKey: ["study-sessions-due", token],
    enabled: Boolean(token) && wantsStudy,
    queryFn: () => apiStudySessionsDue(token as string).then((sessions) => sessions.map((s) => mapStudySession(s))),
  });

  const studyCardsDueQuery = useQuery({
    queryKey: ["study-cards-due", token],
    enabled: Boolean(token) && wantsStudy,
    queryFn: () => apiStudyCardsDue(token as string).then((cards) => cards.map((c) => mapStudyCard(c))),
  });

  const studySubjects = studySubjectsQuery.data ?? [];
  const studyPlans = studyPlansQuery.data ?? [];
  const studySessionsDue = studySessionsDueQuery.data ?? [];
  const studyCardsDue = studyCardsDueQuery.data ?? [];

  const logAutomation = useCallback(
    (entry: string) => {
      setAutomationHistory((prev) => [entry, ...prev].slice(0, 10));
      setActionStatus(entry);
    },
    [setAutomationHistory]
  );

  const handleAutomation = useCallback(
    async (action: AutomationAction, payload?: Record<string, unknown>) => {
      try {
        if (!token) {
          logAutomation(`Simulation ${action}`);
          return;
        }
        if (manualMode) {
          logAutomation("Mode manuel: action en attente");
          return;
        }
        if (sensitiveValidation && (action === "script" || action === "webhook")) {
          logAutomation("Validation requise pour cette action");
          return;
        }
        const res = await apiAutomation(token, { action, payload });
        if (res?.id) setLastAutomationId(String(res.id));
        logAutomation(res?.detail || `Action ${action} exécutée`);
      } catch (err) {
        const message = (err as Error).message || "Erreur automation";
        logAutomation(`Erreur automation: ${message}`);
      }
    },
    [logAutomation, manualMode, sensitiveValidation, token]
  );

  const runScript = useCallback(() => {
    logAutomation("Automation: script script de maintenance");
    void handleAutomation("script", { target: "script de maintenance" });
  }, [handleAutomation]);

  const callApi = useCallback(() => {
    void handleAutomation("api", { target: "/agent/chat-summary" });
  }, [handleAutomation]);

  const createFileAction = useCallback(() => {
    void handleAutomation("file", { target: "notes/quick-capture.md" });
  }, [handleAutomation]);

  const sendMessageAction = useCallback(() => {
    void handleAutomation("message", { message: "Ping envoyé à l'agent" });
  }, [handleAutomation]);

  const triggerWebhook = useCallback(() => {
    void handleAutomation("webhook", { target: "zapier/make" });
  }, [handleAutomation]);

  const rollbackAutomation = useCallback(async () => {
    try {
      if (!lastAutomationId) {
        logAutomation("Aucune action à annuler");
        return;
      }
      if (!token) {
        logAutomation("Rollback simulé (mode démo)");
        return;
      }
      const res = await apiAutomationRollback(token, { id: lastAutomationId, reason: "user rollback" });
      logAutomation(res.detail || "Rollback effectué");
    } catch (err) {
      const message = (err as Error).message || "Erreur rollback";
      const entry = `Erreur rollback: ${message}`;
      setAutomationHistory((prev) => [entry, ...prev].slice(0, 10));
      setActionStatus(entry);
    }
  }, [lastAutomationId, token, logAutomation]);

  const runCommand = useCallback(
    async (command: string) => {
      const cmd = command.trim();
      if (!cmd) return;
      try {
        if (!token) {
          setCommandHistory((prev) => [cmd, ...prev].slice(0, 10));
          logAutomation(`Commande (démo): ${cmd}`);
          return;
        }
        const res = await apiCommand(token, { command: cmd });
        setCommandHistory((prev) => [cmd, ...prev].slice(0, 10));
        logAutomation(res.output || `Commande envoyée: ${cmd}`);
      } catch (err) {
        const message = (err as Error).message || "Erreur commande";
        const entry = `Erreur commande: ${message}`;
        setAutomationHistory((prev) => [entry, ...prev].slice(0, 10));
        setActionStatus(entry);
      } finally {
        setCommandInput("");
      }
    },
    [token, logAutomation]
  );

  const toList = (value: string) =>
    value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

  const removeNewMilestone = (id: string) => {
    setNewProjectMilestones((prev) => prev.filter((m) => (m.id || m.title) !== id));
  };

  const addNewMilestone = () => {
    if (!newMilestoneTitle || !newMilestoneStart || !newMilestoneEnd) return false;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setNewProjectMilestones((prev) => [
      ...prev,
      {
        id,
        title: newMilestoneTitle,
        start: newMilestoneStart,
        end: newMilestoneEnd,
        level: newMilestoneLevel || undefined,
      },
    ]);
    setNewMilestoneTitle("");
    setNewMilestoneStart("");
    setNewMilestoneEnd("");
    setNewMilestoneLevel("");
    return true;
  };

  const triggerDownload = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const createProject = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("Authentification requise");
      return apiCreateProject(token, {
        name: newProjectName,
        progress: Number(newProjectProgress) || 0,
        description: newProjectDescription || undefined,
        objectives: toList(newProjectObjectives),
        due_date: newProjectDueDate || undefined,
        subgoals: toList(newProjectSubgoals),
        blockers: newProjectBlockers,
        milestones_dates: newProjectMilestones.length ? newProjectMilestones : undefined,
      });
    },
    onSuccess: () => {
      setNewProjectName("");
      setNewProjectProgress("0");
      setNewProjectDescription("");
      setNewProjectObjectives("");
      setNewProjectDueDate("");
      setNewProjectSubgoals("");
      setNewProjectBlockers([]);
      setNewProjectMilestones([]);
      setShowCreateProjectModal(false);
      queryClient.invalidateQueries({ queryKey: ["projects", token] });
    },
    onError: (err) => setActionStatus(`Création projet: ${(err as Error).message}`),
  });

  const createTask = useMutation({
    mutationFn: () =>
      apiCreateTask(token as string, {
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        priority: newTaskPriority,
        deadline: newTaskDeadline || undefined,
        duration_minutes: newTaskDuration ? Number(newTaskDuration) : undefined,
        category: newTaskCategory || null,
        energy: newTaskEnergy ? Number(newTaskEnergy) : null,
        parent_task_id: newTaskParentId ? Number(newTaskParentId) : null,
        dependencies: newTaskDependencies
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean)
          .map((d) => Number(d)),
        order_index: newTaskOrder ? Number(newTaskOrder) : undefined,
        project_id: newTaskProjectId ? Number(newTaskProjectId) : null,
      }),
    onSuccess: () => {
      setNewTaskTitle("");
      setNewTaskDeadline("");
      setNewTaskDescription("");
      setNewTaskPriority("normale");
      setNewTaskDuration("");
      setNewTaskCategory("");
      setNewTaskEnergy("");
      setNewTaskProjectId("");
      setNewTaskParentId("");
      setNewTaskDependencies("");
      setNewTaskOrder("");
      setShowTaskModal(false);
      queryClient.invalidateQueries({ queryKey: ["tasks", token] });
    },
    onError: (err) => setActionStatus(`Création tâche: ${(err as Error).message}`),
  });

  const createProjectTask = useMutation({
    mutationFn: (payload: { projectId: string; title: string; deadline?: string }) =>
      apiCreateTask(token as string, {
        title: payload.title,
        deadline: payload.deadline || undefined,
        project_id: Number(payload.projectId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", token] });
    },
    onError: (err) => setActionStatus(`Création tâche projet: ${(err as Error).message}`),
  });

  const updateTask = useMutation({
    mutationFn: (taskId: string) => apiUpdateTask(token as string, Number(taskId), { status: "terminee" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", token] }),
    onError: (err) => setActionStatus(`Maj tâche: ${(err as Error).message}`),
  });

  const updateTaskStatus = useMutation({
    mutationFn: (payload: { taskId: string; status: Task["status"] }) =>
      apiUpdateTask(token as string, Number(payload.taskId), { status: payload.status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", token] }),
    onError: (err) => setActionStatus(`Maj tâche: ${(err as Error).message}`),
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => apiDeleteTask(token as string, Number(taskId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", token] }),
    onError: (err) => setActionStatus(`Suppression tâche: ${(err as Error).message}`),
  });

  const updateProjectMilestones = useMutation({
    mutationFn: (payload: { projectId: string; milestones: ProjectMilestone[] }) => {
      if (!token) throw new Error("Authentification requise");
      return apiUpdateProjectMilestones(token, Number(payload.projectId), { milestones_dates: payload.milestones });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", token] }),
    onError: (err) => setActionStatus(`Maj jalons: ${(err as Error).message}`),
  });

  const updateProjectMeta = useMutation({
    mutationFn: (payload: { projectId: string; data: Partial<Project> }) => {
      if (!token) throw new Error("Authentification requise");
      return apiUpdateProject(token, Number(payload.projectId), payload.data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", token] }),
    onError: (err) => setActionStatus(`Maj projet: ${(err as Error).message}`),
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => {
      if (!token) throw new Error("Authentification requise");
      return apiDeleteProject(token, Number(projectId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", token] });
      setActiveProject(null);
    },
    onError: (err) => setActionStatus(`Suppression projet: ${(err as Error).message}`),
  });

  const resolveBlockerQuick = useCallback(
    (project: Project, blockerId: string) => {
      if (!token) {
        setActionStatus("Connectez-vous pour gérer les blocages de projet.");
        return;
      }
      const updatedBlockers = (project.blockers ?? []).map((blocker, index) => {
        const key = blocker.id || `${blocker.title}-${index}`;
        if (key === blockerId) {
          return { ...blocker, status: "resolu" };
        }
        return blocker;
      });
      updateProjectMeta.mutate({ projectId: project.id, data: { blockers: updatedBlockers } });
    },
    [token, updateProjectMeta]
  );

  const createEventQuick = useMutation({
    mutationFn: (payload: CreateEventInput) => apiCreateEvent(token as string, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", token] }),
    onError: (err) => setActionStatus(`Création événement: ${(err as Error).message}`),
  });

  const createEvent = useMutation({
    mutationFn: () =>
      apiCreateEvent(token as string, {
        title: newEventTitle,
        start: newEventStart,
        end: newEventEnd,
        kind: "fixe",
        category: newEventCategory,
        description: newEventDescription || null,
        note: newEventNote || null,
        location: newEventLocation || null,
        url: newEventUrl || null,
        color: newEventColor || null,
        important: newEventImportant,
        is_all_day: newEventAllDay,
        attachments: splitLines(newEventAttachments),
        recurrence: newEventRecurrence || null,
        recurrence_interval: newEventRecurrenceInterval ? Number(newEventRecurrenceInterval) : null,
        recurrence_until: newEventUntil || null,
        recurrence_custom: newEventRecurrenceCustom || null,
      }),
    onSuccess: () => {
      setNewEventTitle("");
      setNewEventStart("");
      setNewEventEnd("");
      setNewEventDescription("");
      setNewEventNote("");
      setNewEventLocation("");
      setNewEventUrl("");
      setNewEventCategory("general");
      setNewEventColor("#2563eb");
      setNewEventImportant(false);
      setNewEventAllDay(false);
      setNewEventAttachments("");
      setNewEventRecurrence("");
      setNewEventRecurrenceInterval("1");
      setNewEventRecurrenceCustom("");
      setNewEventUntil("");
      queryClient.invalidateQueries({ queryKey: ["events", token] });
    },
    onError: (err) => setActionStatus(`Création événement: ${(err as Error).message}`),
  });

  const updateEvent = useMutation({
    mutationFn: (payload: {
      id: string;
      title: string;
      start: string;
      end: string;
      kind: AgendaEvent["type"];
      category?: string | null;
      note?: string | null;
      description?: string | null;
      location?: string | null;
      url?: string | null;
      color?: string | null;
      important?: boolean | null;
      is_all_day?: boolean | null;
      attachments?: string[] | null;
      recurrence?: AgendaEvent["recurrence"];
      recurrence_interval?: number | null;
      recurrence_until?: string | null;
      recurrence_custom?: string | null;
    }) =>
      apiUpdateEvent(token as string, Number(payload.id), {
        title: payload.title,
        start: payload.start,
        end: payload.end,
        kind: payload.kind,
        category: payload.category ?? null,
        description: payload.description ?? null,
        note: payload.note ?? null,
        location: payload.location ?? null,
        url: payload.url ?? null,
        color: payload.color ?? null,
        important: payload.important ?? null,
        is_all_day: payload.is_all_day ?? null,
        attachments: payload.attachments ?? null,
        recurrence: payload.recurrence ?? null,
        recurrence_interval: payload.recurrence_interval ?? null,
        recurrence_until: payload.recurrence_until ?? null,
        recurrence_custom: payload.recurrence_custom ?? null,
      }),
    onSuccess: () => {
      setEditingEvent(null);
      queryClient.invalidateQueries({ queryKey: ["events", token] });
    },
    onError: (err) => setActionStatus(`Maj événement: ${(err as Error).message}`),
  });

  const updatePreferences = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Authentification requise");
      const daysOff = prefDaysOff
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      const painful = prefPainfulTasks
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      return apiUserPreferencesUpdate(token, {
        productive_hours: prefProductiveStart || prefProductiveEnd ? [{ start: prefProductiveStart || undefined, end: prefProductiveEnd || undefined }] : [],
        daily_load_limit_hours: prefLoadLimit ? Number(prefLoadLimit) : null,
        session_duration_minutes: prefSession ? Number(prefSession) : null,
        days_off: daysOff,
        painful_tasks: painful,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["preferences", token], data);
      setActionStatus("Préférences enregistrées");
    },
    onError: (err) => setActionStatus(`Maj préférences: ${(err as Error).message}`),
  });

  const chatMutation = useMutation({
    mutationFn: (payload: { message: string; tone: "formel" | "detendu"; meta?: Record<string, unknown> }) =>
      apiAgentChat(token as string, payload.message, payload.tone, payload.meta),
    onSuccess: (resp, variables) => {
      const now = new Date().toISOString();
      const userMessage = variables?.message ?? chatInput;
      const nextHistory: ChatMessage[] = [
        ...chatHistory,
        { id: `u-${now}`, role: "user", content: userMessage, createdAt: now },
        { id: `a-${now}`, role: "assistant", content: resp.reply, createdAt: now },
      ];
      setChatHistory(nextHistory);
      setChatInput("");
      setPendingMessage(null);
      setClarifyPrompt(null);
    },
    onError: (err) => setActionStatus(`Chat agent: ${(err as Error).message}`),
  });

  const chatSummary = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("Authentification requise");
      const messages = chatHistory.map((m) => ({ role: m.role, content: m.content }));
      return apiChatSummary(token, messages);
    },
    onSuccess: (resp) => setSummaryText(resp.summary),
    onError: (err) => setActionStatus(`Résumé: ${(err as Error).message}`),
  });

  const agentPlan = useMutation({
    mutationFn: (payload?: { date?: string; mode?: "day" | "week"; reason?: PlanReason | undefined }) => {
      if (!token) throw new Error("Authentification requise");
      const date = payload?.date ?? selectedDate.toISOString();
      const mode = payload?.mode ?? planMode;
      const reason = payload?.reason ?? (planReason || undefined);
      return apiAgentPlan(token, { date, mode, reason });
    },
    onSuccess: (resp) => {
      setActionStatus(resp.message || "Planning généré");
      queryClient.invalidateQueries({ queryKey: ["events", token] });
    },
    onError: (err) => setActionStatus(`Planification: ${(err as Error).message}`),
  });

  const pushNotifications = useMutation({
    mutationFn: (payload: Parameters<typeof apiPushNotifications>[1]) => {
      if (!token) throw new Error("Authentification requise");
      return apiPushNotifications(token, payload);
    },
    onError: (err) => setActionStatus(`Notifications: ${(err as Error).message}`),
  });

  const createStudySubject = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("Authentification requise");
      return apiStudySubjectCreate(token, {
        name: newSubjectName,
        description: newSubjectDesc || undefined,
        ue_code: newSubjectUe || undefined,
      });
    },
    onSuccess: (subject) => {
      setNewSubjectName("");
      setNewSubjectUe("");
      setNewSubjectDesc("");
      const id = String(subject.id);
      setPlanSubjectId(id);
      setNewCardSubjectId(id);
      queryClient.invalidateQueries({ queryKey: ["study-subjects", token] });
    },
    onError: (err) => setActionStatus(`Sujet: ${(err as Error).message}`),
  });

  const updateStudySubject = useMutation({
    mutationFn: (payload: { id: string; name: string; description?: string; ue_code?: string }) => {
      if (!token) throw new Error("Authentification requise");
      return apiStudySubjectUpdate(token, Number(payload.id), {
        name: payload.name,
        description: payload.description,
        ue_code: payload.ue_code,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study-subjects", token] }),
    onError: (err) => setActionStatus(`Sujet: ${(err as Error).message}`),
  });

  const deleteStudySubject = useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error("Authentification requise");
      return apiStudySubjectDelete(token, Number(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-subjects", token] });
      queryClient.invalidateQueries({ queryKey: ["study-plans", token] });
    },
    onError: (err) => setActionStatus(`Sujet: ${(err as Error).message}`),
  });

  const generateStudyPlan = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("Authentification requise");
      if (!planSubjectId) throw new Error("Choisissez un sujet");
      const topics = toList(planTopics);
      return apiStudyPlanGenerate(token, {
        subject_id: Number(planSubjectId),
        topics: topics ?? [],
        exam_date: planExamDate || undefined,
        total_minutes: planSessionMinutes ? Number(planSessionMinutes) * Number(planSessionsPerDay || "1") : undefined,
        session_minutes: planSessionMinutes ? Number(planSessionMinutes) : undefined,
        sessions_per_day: planSessionsPerDay ? Number(planSessionsPerDay) : undefined,
      });
    },
    onSuccess: (plan) => {
      setPlanTopics("");
      queryClient.invalidateQueries({ queryKey: ["study-plans", token] });
      queryClient.invalidateQueries({ queryKey: ["study-sessions-due", token] });
      setActionStatus(plan.title ? `Plan généré: ${plan.title}` : "Plan généré");
    },
    onError: (err) => setActionStatus(`Plan: ${(err as Error).message}`),
  });

  const updateStudyPlan = useMutation({
    mutationFn: (payload: { id: string; title: string; exam_date?: string; total_minutes?: number }) => {
      if (!token) throw new Error("Authentification requise");
      return apiStudyPlanUpdate(token, Number(payload.id), payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study-plans", token] }),
    onError: (err) => setActionStatus(`Plan: ${(err as Error).message}`),
  });

  const deleteStudyPlan = useMutation({
    mutationFn: (id: string) => {
      if (!token) throw new Error("Authentification requise");
      return apiStudyPlanDelete(token, Number(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-plans", token] });
      queryClient.invalidateQueries({ queryKey: ["study-sessions-due", token] });
    },
    onError: (err) => setActionStatus(`Plan: ${(err as Error).message}`),
  });

  const updateStudySession = useMutation({
    mutationFn: (payload: { id: string; status: "done" | "skipped" }) => {
      if (!token) throw new Error("Authentification requise");
      return apiStudySessionUpdate(token, Number(payload.id), { status: payload.status } as { status: typeof payload.status });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study-sessions-due", token] }),
    onError: (err) => setActionStatus(`Séance: ${(err as Error).message}`),
  });

  const createStudyCard = useMutation({
    mutationFn: (payload: { subjectId: string; front: string; back: string }) => {
      if (!token) throw new Error("Authentification requise");
      return apiStudyCardCreate(token, {
        subject_id: Number(payload.subjectId),
        front: payload.front,
        back: payload.back,
      });
    },
    onSuccess: () => {
      setNewCardFront("");
      setNewCardBack("");
      queryClient.invalidateQueries({ queryKey: ["study-cards-due", token] });
    },
    onError: (err) => setActionStatus(`Carte: ${(err as Error).message}`),
  });

  const reviewStudyCard = useMutation({
    mutationFn: (payload: { id: string; score: number }) => {
      if (!token) throw new Error("Authentification requise");
      return apiStudyCardReview(token, Number(payload.id), payload.score);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["study-cards-due", token] }),
    onError: (err) => setActionStatus(`Révision: ${(err as Error).message}`),
  });

  const runStudyAssist = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("Authentification requise");
      return apiStudyAssist(token, {
        subject: assistSubject,
        topic: assistTopic || undefined,
        content: assistContent || undefined,
        mode: assistMode,
        difficulty: assistDifficulty || undefined,
        items: assistItems ? Number(assistItems) : undefined,
      });
    },
    onSuccess: (resp) => setAssistOutput(resp.output),
    onError: (err) => setActionStatus(`Assist: ${(err as Error).message}`),
  });

  const allEvents = useMemo(() => sortEvents(agendaEventsQuery.data ?? demoEvents), [agendaEventsQuery.data]);
  const filteredEvents = useMemo(() => {
    const controllerEvents = agendaEventsFiltered ?? [];
    if (controllerEvents.length) return sortEvents(controllerEvents);
    return allEvents.filter((e) => {
      if (!filterTypes.fixe && e.type === "fixe") return false;
      if (!filterTypes.propose && e.type === "propose") return false;
      if (filterImportant && !e.important) return false;
      return true;
    });
  }, [agendaEventsFiltered, allEvents, filterImportant, filterTypes]);

  const fuse = useMemo(
    () =>
      new Fuse<AgendaEvent>(filteredEvents, {
        keys: ["title", "note", "description", "location", "url"],
        threshold: 0.35,
        ignoreLocation: true,
        includeScore: true,
      }),
    [filteredEvents]
  );

  const searchResults = useMemo(() => {
    if (agendaEventsFiltered?.length) return agendaSearchResults;
    if (!searchQuery.trim()) return [];
    return fuse.search(searchQuery.trim()).map((m) => m.item).slice(0, 12);
  }, [agendaEventsFiltered?.length, agendaSearchResults, fuse, searchQuery]);

  const dayEvents = useMemo(() => {
    if (agendaDayEvents.length) return agendaDayEvents;
    return filteredEvents.filter((e) => isSameDay(new Date(e.start), selectedDate));
  }, [agendaDayEvents, filteredEvents, selectedDate]);
  const projectNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projectsData ?? demoProjects) {
      map[String(p.id)] = p.name;
    }
    return map;
  }, [projectsData]);
  const tasksWithNames = useMemo(() => {
    const base = tasksData ?? demoTasks;
    return base.map((t) => ({
      ...t,
      projectName: t.projectId ? projectNameById[t.projectId] ?? t.projectName : t.projectName,
    }));
  }, [projectNameById, tasksData]);

  const tasksByProject = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasksWithNames) {
      const key = t.projectId ?? "__indep";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [tasksWithNames]);

  const sortedProjects = useMemo(() => {
    const source = projectsData ?? demoProjects;
    const filtered = projectRiskOnly
      ? source.filter((p) => (p.risks?.length ?? 0) > 0 || (p.blockers?.filter((b) => b.status !== "resolu").length ?? 0) > 0)
      : source;
    const withRiskScore = filtered.map((p) => {
      const riskScore = (p.risks?.length ?? 0) + (p.blockers?.filter((b) => b.status !== "resolu").length ?? 0);
      return { project: p, riskScore };
    });
    const sorted = [...withRiskScore].sort((a, b) => {
      if (projectSort === "alphabetique") return a.project.name.localeCompare(b.project.name);
      if (projectSort === "risk") return b.riskScore - a.riskScore;
      return (b.project.progress ?? 0) - (a.project.progress ?? 0);
    });
    return sorted.map((item) => item.project);
  }, [projectRiskOnly, projectSort, projectsData]);

  const todayTasks = useMemo(() => tasksWithNames, [tasksWithNames]);

  const exportTasksAs = useCallback(
    (format: "json" | "csv") => {
      if (!tasksWithNames.length) {
        setActionStatus("Aucune tâche à exporter.");
        return;
      }
      if (format === "json") {
        triggerDownload(new Blob([JSON.stringify(tasksWithNames, null, 2)], { type: "application/json" }), "taches.json");
        return;
      }
      const rows = [
        ["id", "titre", "statut", "deadline", "projet"].join(","),
        ...tasksWithNames.map((t) =>
          [t.id, t.title, t.status, t.deadline ?? "", t.projectName ?? ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
        ),
      ];
      triggerDownload(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }), "taches.csv");
    },
    [setActionStatus, tasksWithNames, triggerDownload]
  );

  const exportProjectsAs = useCallback(
    (format: "json" | "csv") => {
      const source = projectsData ?? demoProjects;
      if (!source.length) {
        setActionStatus("Aucun projet à exporter.");
        return;
      }
      if (format === "json") {
        triggerDownload(new Blob([JSON.stringify(source, null, 2)], { type: "application/json" }), "projets.json");
        return;
      }
      const rows = [
        ["id", "nom", "avancement", "echeance"].join(","),
        ...source.map((p) =>
          [p.id, p.name, p.progress, p.due_date ?? ""].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
        ),
      ];
      triggerDownload(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }), "projets.csv");
    },
    [projectsData, setActionStatus, triggerDownload]
  );

  useEffect(() => {
    setQuickKanban(buildKanban(todayTasks));
  }, [todayTasks]);

  useEffect(() => {
    if (!studySubjects.length) return;
    if (!planSubjectId) setPlanSubjectId(studySubjects[0].id);
    if (!newCardSubjectId) setNewCardSubjectId(studySubjects[0].id);
    if (!assistSubject) setAssistSubject(studySubjects[0].name);
  }, [assistSubject, newCardSubjectId, planSubjectId, studySubjects]);

  const updateGoal = (idx: number, value: string) => {
    setDailyGoals((prev) => prev.map((g, i) => (i === idx ? value : g)));
  };

  const toggleGoal = (idx: number) => {
    setDailyGoalsDone((prev) => prev.map((done, i) => (i === idx ? !done : done)));
  };

  const saveCheckIn = () => {
    setCheckInSaved(true);
    setActionStatus("Check-in enregistré");
  };

  const planTaskToEvent = (task: Task) => {
    if (!token) {
      setActionStatus("Connectez-vous pour planifier cette tâche.");
      return;
    }
    const start = new Date();
    const durationMinutes = task.durationMinutes ?? 60;
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    createEventQuick.mutate({
      title: task.title,
      start: start.toISOString(),
      end: end.toISOString(),
      kind: "propose",
      category: "tache",
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (!token) {
      setActionStatus("Connectez-vous pour supprimer une tâche.");
      return;
    }
    if (!window.confirm("Supprimer cette tâche ?")) return;
    setQuickKanban((prev) => ({
      a_faire: prev.a_faire.filter((t) => t.id !== taskId),
      en_cours: prev.en_cours.filter((t) => t.id !== taskId),
      terminee: prev.terminee.filter((t) => t.id !== taskId),
    }));
    deleteTask.mutate(taskId);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!token) {
      setActionStatus("Connectez-vous pour supprimer un événement.");
      return;
    }
    if (!window.confirm("Supprimer cet événement ?")) return;
    agendaDeleteEvent.mutate(eventId, {
      onSuccess: () => {
        setEditingEvent((prev) => (prev?.id === eventId ? null : prev));
        setActionStatus("Événement supprimé");
      },
      onError: (err) => setActionStatus(`Suppression événement: ${(err as Error).message}`),
    });
  };

  const handleIcsUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!token) {
      setActionStatus("Connectez-vous pour importer un fichier ICS.");
      return;
    }
    importIcs.mutate(file, {
      onSuccess: (data: unknown) => {
        const imported = (data as { imported?: number } | undefined)?.imported ?? 0;
        const plural = imported > 1 ? "s" : "";
        setActionStatus(`ICS importé (${imported} évènement${plural})`);
      },
      onError: (err) => setActionStatus(`Import ICS: ${(err as Error).message}`),
    });
  };

  const handleExportIcs = () => {
    if (!token) {
      setActionStatus("Connectez-vous pour exporter votre agenda.");
      return;
    }
    exportIcs.mutate(undefined, {
      onSuccess: (blob) => {
        triggerDownload(blob, "agenda.ics");
        setActionStatus("Agenda exporté (.ics)");
      },
      onError: (err) => setActionStatus(`Export ICS: ${(err as Error).message}`),
    });
  };

  const openEditModal = (event: AgendaEvent) => {
    setEditingEvent(event);
    setEditTitle(event.title);
    setEditStart(toLocalDateTimeInput(event.start));
    setEditEnd(toLocalDateTimeInput(event.end));
    setEditNote(event.note ?? "");
    setEditDescription(event.description ?? "");
    setEditLocation(event.location ?? "");
    setEditUrl(event.url ?? "");
    setEditCategory(event.category ?? "general");
    setEditColor(event.color ?? "#2563eb");
    setEditImportant(Boolean(event.important));
    setEditAllDay(Boolean(event.isAllDay));
    setEditAttachments((event.attachments || []).join("\n"));
    setEditRecurrence(event.recurrence || "");
    setEditRecurrenceInterval(event.recurrenceInterval ? String(event.recurrenceInterval) : "1");
    setEditRecurrenceCustom(event.recurrenceCustom || "");
    setEditUntil(event.recurrenceUntil ? toLocalDateTimeInput(event.recurrenceUntil) : "");
  };

  const submitEdit = () => {
    if (!editingEvent || !token) return;
    updateEvent.mutate({
      id: editingEvent.id,
      title: editTitle || editingEvent.title,
      start: editStart ? new Date(editStart).toISOString() : editingEvent.start,
      end: editEnd ? new Date(editEnd).toISOString() : editingEvent.end,
      kind: editingEvent.type,
      category: editCategory,
      description: editDescription || null,
      note: editNote || null,
      location: editLocation || null,
      url: editUrl || null,
      color: editColor || null,
      important: editImportant,
      is_all_day: editAllDay,
      attachments: splitLines(editAttachments),
      recurrence: editRecurrence || null,
      recurrence_interval: editRecurrenceInterval ? Number(editRecurrenceInterval) : null,
      recurrence_until: editUntil ? new Date(editUntil).toISOString() : null,
      recurrence_custom: editRecurrenceCustom || null,
    });
  };

  const quickAction = useCallback(
    (action: QuickAction) => {
      if (!token) {
        setActionStatus("Connectez-vous pour lancer l'agent.");
        return;
      }
      const messages: Record<QuickAction, string> = {
        organiser: "L'agent prépare un planning optimisé...",
        bilan: "L'agent rassemble les stats du jour...",
        optimiser: "L'agent cherche des créneaux pour optimiser la semaine...",
      };
      setActionStatus(messages[action]);
      const mode = action === "optimiser" ? "week" : planMode;
      const reason =
        action === "optimiser"
          ? "optimisation"
          : action === "bilan"
            ? "retard"
            : planReason || undefined;
      agentPlan.mutate({ date: selectedDate.toISOString(), mode, reason });
    },
    [agentPlan, planMode, planReason, selectedDate, setActionStatus, token]
  );

  const agendaViewModeRender = useMemo(() => {
    if (viewMode === "jour") {
      if (!dayEvents.length) return <p className="text-sm text-slate-600">Aucun événement pour cette date.</p>;
      return dayEvents.map((event) => (
        <AgendaItem key={event.id} event={event} onEdit={() => openEditModal(event)} onDelete={() => handleDeleteEvent(event.id)} />
      ));
    }
    if (viewMode === "semaine") return <WeekView focusDate={selectedDate} events={filteredEvents} onEdit={openEditModal} onDelete={handleDeleteEvent} />;
    if (viewMode === "mois")
      return (
        <CalendarGrid
          focusDate={selectedDate}
          events={filteredEvents}
          onSelect={(d) => {
            setSelectedDate(d);
            setViewMode("jour");
          }}
        />
      );
    if (viewMode === "annee") return <YearView focusDate={selectedDate} events={filteredEvents} onSelect={(d) => setSelectedDate(d)} />;
    return <ListView events={filteredEvents} onEdit={openEditModal} onDelete={handleDeleteEvent} />;
  }, [dayEvents, filteredEvents, handleDeleteEvent, openEditModal, selectedDate, setSelectedDate, setViewMode, viewMode]);

  const pendingTasks = todayTasks.filter((t) => t.status !== "terminee").length;
  const visibleEventsForLoad = useMemo(() => (viewMode === "jour" ? dayEvents : filteredEvents), [viewMode, dayEvents, filteredEvents]);
  const loadHours = useMemo(() => computeLoad(visibleEventsForLoad), [visibleEventsForLoad]);
  const workStart = preferencesData?.productive_hours?.[0]?.start ?? "08:00";
  const workEnd = preferencesData?.productive_hours?.[0]?.end ?? "18:00";
  const overloadLimit = preferencesData?.daily_load_limit_hours ?? 8;
  const dayAnalysis = useMemo(
    () => analyzeDay(dayEvents, selectedDate, workStart, workEnd, overloadLimit),
    [dayEvents, overloadLimit, selectedDate, workEnd, workStart]
  );

  const synthRange = useMemo(() => {
    const start = synthScope === "day" ? startOfDay(selectedDate) : startOfWeek(selectedDate);
    const end = new Date(start);
    end.setDate(start.getDate() + (synthScope === "day" ? 1 : 7));
    return { start, end };
  }, [selectedDate, synthScope]);

  const synthEvents = useMemo(() => filteredEvents.filter((e) => inRange(new Date(e.start), synthRange.start, synthRange.end)), [filteredEvents, synthRange.end, synthRange.start]);
  const weeklyLoads = useMemo(() => computeDailyLoads(filteredEvents, synthRange.start, synthRange.end), [filteredEvents, synthRange.end, synthRange.start]);
  const overloadedDays = useMemo(() => weeklyLoads.filter((d) => d.hours > overloadLimit), [weeklyLoads, overloadLimit]);
  const underUsedDays = useMemo(() => weeklyLoads.filter((d) => d.hours < computeWorkWindowHours(workStart, workEnd) - 1), [weeklyLoads, workEnd, workStart]);

  const synthTasks = useMemo(
    () =>
      tasksWithNames.filter((t) => {
        if (!t.deadline) return true;
        return inRange(new Date(t.deadline), synthRange.start, synthRange.end);
      }),
    [synthRange.end, synthRange.start, tasksWithNames]
  );

  const synthLoadHours = useMemo(() => computeLoad(synthEvents), [synthEvents]);
  const synthOpenTasks = useMemo(() => synthTasks.filter((t) => t.status !== "terminee").length, [synthTasks]);

  const filteredAgentLogs = useMemo(() => {
    if (!historyData?.agent_logs) return [];
    if (agentHistoryFilter === "all") return historyData.agent_logs;
    return historyData.agent_logs.filter((log) => {
      const action = log.action || "";
      if (agentHistoryFilter === "plan") return action.startsWith("plan");
      if (agentHistoryFilter === "chat") return action.startsWith("chat");
      if (agentHistoryFilter === "automation") return action.startsWith("automation");
      return true;
    });
  }, [agentHistoryFilter, historyData?.agent_logs]);

  const overdueTasks = useMemo(() => {
    const now = new Date();
    return tasksWithNames.filter((t) => t.status !== "terminee" && t.deadline && new Date(t.deadline).getTime() < now.getTime());
  }, [tasksWithNames]);

  const nextEvents = useMemo(() => {
    const now = new Date();
    return sortEvents(synthEvents).filter((e) => new Date(e.start) > now);
  }, [synthEvents]);

  const timelineNext = useMemo(() => {
    const limit = new Date();
    limit.setHours(limit.getHours() + 4);
    return nextEvents.filter((e) => new Date(e.start) <= limit).slice(0, 4);
  }, [nextEvents]);

  const synthAlerts = useMemo(() => {
    const items: Array<{ title: string; tone: "info" | "warn"; detail: string }> = [];
    if (overdueTasks.length) items.push({ title: "Tâches en retard", tone: "warn", detail: `${overdueTasks.length} à replanifier` });
    if (synthLoadHours > 6) items.push({ title: "Charge élevée", tone: "warn", detail: `${synthLoadHours.toFixed(1)} h prévues` });
    if (!items.length) items.push({ title: "Rien à signaler", tone: "info", detail: "Planning stable" });
    return items;
  }, [overdueTasks.length, synthLoadHours]);

  const synthSummaryText = useMemo(() => {
    const loadH = synthLoadHours.toFixed(1);
    const openCount = synthOpenTasks;
    const overdue = overdueTasks.length;
    const nextLabel = nextEvents.length ? `${new Date(nextEvents[0].start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · ${nextEvents[0].title}` : "Aucun bloc planifié";
    return `Charge ${loadH} h, ${openCount} tâches ouvertes, ${overdue} en retard. Prochain : ${nextLabel}.`;
  }, [nextEvents, overdueTasks.length, synthLoadHours, synthOpenTasks]);

  const buildLocalFeedback = useCallback(
    (scope: FeedbackScope): FeedbackStats => {
      const anchor = new Date(selectedDate);
      const start =
        scope === "week"
          ? startOfWeek(anchor)
          : scope === "month"
            ? new Date(anchor.getFullYear(), anchor.getMonth(), 1)
            : startOfDay(anchor);
      const end = new Date(start);
      if (scope === "week") end.setDate(start.getDate() + 7);
      else if (scope === "month") end.setMonth(start.getMonth() + 1);
      else end.setDate(start.getDate() + 1);

      const inScope = (dt: Date) => inRange(dt, start, end);
      const scopedEvents = filteredEvents.filter((e) => inScope(new Date(e.start)));
      const plannedHoursLocal = computeLoad(scopedEvents.filter((e) => e.type === "propose"));
      const actualHoursLocal = computeLoad(scopedEvents.filter((e) => e.type !== "propose"));
      const scopedTasks = tasksWithNames.filter((t) => !t.deadline || inScope(new Date(t.deadline)));
      const doneTasks = scopedTasks.filter((t) => t.status === "terminee");
      const deferredTasksLocal = tasksWithNames.filter((t) => t.deadline && new Date(t.deadline) < start && t.status !== "terminee");

      const durationsByTask: Record<string, number> = {};
      for (const evt of scopedEvents) {
        if (!evt.taskId) continue;
        const minutes = (new Date(evt.end).getTime() - new Date(evt.start).getTime()) / 60000;
        durationsByTask[evt.taskId] = (durationsByTask[evt.taskId] || 0) + minutes;
      }

      const estimate_adjustments = tasksWithNames
        .filter((t) => t.durationMinutes && durationsByTask[t.id])
        .map((t, idx) => {
          const actual = durationsByTask[t.id] || 0;
          const planned = t.durationMinutes || 0;
          const ratio = planned ? actual / planned : 0;
          const delta = actual - planned;
          const parsedId = Number(t.id);
          const safeTaskId = Number.isFinite(parsedId) ? parsedId : undefined;
          return {
            task_id: safeTaskId,
            title: t.title,
            planned_minutes: planned || undefined,
            actual_minutes: Number(actual.toFixed(1)),
            delta_minutes: Number(delta.toFixed(1)),
            ratio: Number(ratio.toFixed(2)),
            suggested_minutes: Math.round(actual),
            note: "Ajuster l'estimation pour coller à la réalité",
          };
        })
        .filter((a) => a.ratio < 0.9 || a.ratio > 1.1);

      const bucketHours: Record<string, number> = {};
      const bucketEvents: Record<string, number> = {};
      for (const evt of scopedEvents.filter((e) => e.type !== "propose")) {
        const startHour = new Date(evt.start).getHours();
        const label = `${String(Math.floor(startHour / 2) * 2).padStart(2, "0")}:00-${String(Math.floor(startHour / 2) * 2 + 2).padStart(2, "0")}:00`;
        const hours = (new Date(evt.end).getTime() - new Date(evt.start).getTime()) / 3600000;
        bucketHours[label] = (bucketHours[label] || 0) + hours;
        bucketEvents[label] = (bucketEvents[label] || 0) + 1;
      }

      const habit_windows = Object.keys(bucketHours)
        .map((label) => ({ window: label, events: bucketEvents[label], hours: Number(bucketHours[label].toFixed(2)) }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 3);

      const completion = scopedTasks.length ? Number((doneTasks.length / scopedTasks.length).toFixed(3)) : 0;

      return {
        scope,
        start: start.toISOString(),
        end: end.toISOString(),
        planned_hours: Number(plannedHoursLocal.toFixed(2)),
        actual_hours: Number(actualHoursLocal.toFixed(2)),
        tasks_planned: scopedTasks.length,
        tasks_done: doneTasks.length,
        completion_rate: completion,
        deferred_tasks: deferredTasksLocal.map((t, idx) => {
          const parsedId = Number(t.id);
          const safeId = Number.isFinite(parsedId) ? parsedId : idx + 1;
          return {
            id: safeId,
            title: t.title,
            deadline: t.deadline,
            status: t.status,
            late_days: t.deadline
              ? Math.max(0, Math.floor((start.getTime() - new Date(t.deadline).getTime()) / (1000 * 60 * 60 * 24)))
              : null,
          };
        }),
        estimate_adjustments,
        habit_windows,
      };
    },
    [selectedDate, filteredEvents, tasksWithNames],
  );

  const feedbackStats = useMemo(() => feedbackQuery.data ?? buildLocalFeedback(feedbackScope), [buildLocalFeedback, feedbackQuery.data, feedbackScope]);
  const feedbackLoading = feedbackQuery.isFetching;
  const feedbackScopeLabels: Record<FeedbackScope, string> = {
    day: "Bilan du jour",
    week: "Bilan de la semaine",
    month: "Bilan du mois",
  };
  const feedbackRangeLabel = useMemo(() => {
    const start = new Date(feedbackStats.start);
    const end = new Date(feedbackStats.end);
    const endAdj = new Date(end.getTime() - 1);
    return `${start.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → ${endAdj.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
  }, [feedbackStats.end, feedbackStats.start]);
  const motivationInsights = useMemo(() => {
    const completion = Math.round((feedbackStats.completion_rate || 0) * 100);
    const encouragements: string[] = [];
    const alerts: string[] = [];
    const rewards: string[] = [];

    if (completion >= 80) encouragements.push("Super rythme, continue comme ça.");
    if (checkInMood >= 8) encouragements.push("Belle énergie aujourd'hui, profite-en pour les tâches exigeantes.");
    if (!encouragements.length) encouragements.push("Chaque petite avancée compte, focus sur la prochaine tâche.");

    if (completion < 40 && pendingTasks > 3) alerts.push("Risque de décrochage: prioriser 1 tâche clé et la terminer.");
    if (feedbackStats.deferred_tasks.length > 0) alerts.push("Des reports s'accumulent, planifie un créneau rattrapage.");
    if (loadHours > overloadLimit) alerts.push("Charge élevée, allège ou découpe une tâche.");

    const goalsDone = dailyGoalsDone.filter(Boolean).length;
    if (goalsDone >= 3 || completion >= 90) rewards.push("Badge Focus: objectifs du jour atteints.");
    if (completion >= 70 && checkInMood >= 7) rewards.push("Badge Momentum: progression régulière.");

    return { encouragements, alerts, rewards };
  }, [checkInMood, dailyGoalsDone, feedbackStats.completion_rate, feedbackStats.deferred_tasks.length, loadHours, overloadLimit, pendingTasks]);

  const synthActions = useMemo(() => {
    const actions: Array<{ title: string; detail: string; onClick: () => void }> = [];
    if (overdueTasks.length) {
      actions.push({ title: "Replanifier les retards", detail: `${overdueTasks.length} tâche(s) en retard`, onClick: () => setViewMode("jour") });
    }
    const open = synthTasks.filter((t) => t.status !== "terminee").length;
    if (open > 3) {
      actions.push({ title: "Bloquer un focus", detail: "Réserver 90 min pour avancer", onClick: () => quickAction("organiser") });
    }
    if (!actions.length) {
      actions.push({ title: "Optimiser la semaine", detail: "Lancer le plan IA", onClick: () => quickAction("optimiser") });
    }
    return actions;
  }, [overdueTasks.length, quickAction, setViewMode, synthTasks]);

  const decisionSupport = useMemo(() => {
    const projects = projectsData ?? demoProjects;
    const allBlockers = projects.flatMap((p) => p.blockers ?? []);
    const openBlockers = allBlockers.filter((b) => !((b.status ?? "").toLowerCase().includes("res")));
    const dueSoonProjects = projects.filter((p) => p.due_date && p.progress < 80 && new Date(p.due_date).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000);
    const missingProjectTasks = tasksWithNames.filter((t) => t.projectId && !projectNameById[t.projectId]);
    const highNoDeadline = tasksWithNames.filter((t) => t.priority === "haute" && !t.deadline && t.status !== "terminee");
    const constraints: string[] = [];
    if (openBlockers.length) constraints.push(`${openBlockers.length} blocage(s) actifs`);
    if (overdueTasks.length) constraints.push(`${overdueTasks.length} tâche(s) en retard`);
    if (dueSoonProjects.length) constraints.push(`${dueSoonProjects.length} projet(s) proches de l'échéance (<7j)`);

    const loadSummary = `Charge ${synthLoadHours.toFixed(1)} h (${synthScope === "day" ? "jour" : "semaine"}), ${overloadedDays.length} jour(s) au-dessus du seuil`;

    const incoherences: string[] = [];
    if (missingProjectTasks.length) incoherences.push(`${missingProjectTasks.length} tâche(s) liées à un projet absent`);
    if (highNoDeadline.length) incoherences.push(`${highNoDeadline.length} priorité(s) haute sans échéance`);
    if (!incoherences.length) incoherences.push("Aucune incohérence repérée");

    const urgentTask = overdueTasks[0];
    const blockerTitle = openBlockers[0]?.title;
    const actions = [
      urgentTask ? `Planifier ${urgentTask.title} avant ${new Date(urgentTask.deadline as string).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : null,
      blockerTitle ? `Lever le blocage "${blockerTitle}"` : null,
      dueSoonProjects[0] ? `Sécuriser ${dueSoonProjects[0].name} (jalon <7j)` : null,
    ].filter(Boolean) as string[];

    const arbitrages = [
      overdueTasks.length ? "Prioriser retards vs nouvelles demandes" : null,
      openBlockers.length ? "Allouer 30 min d'escalade pour blocages critiques" : null,
      synthLoadHours > overloadLimit ? "Réduire la charge en déplaçant des tâches basse priorité" : null,
    ].filter(Boolean) as string[];

    const justifications = [
      overdueTasks.length ? `${overdueTasks.length} retard(s) → risque de dérive planning` : null,
      openBlockers.length ? `${openBlockers.length} blocage(s) → dépendances bloquantes` : null,
      overloadedDays.length ? `${overloadedDays.length} jour(s) surchargés` : null,
    ].filter(Boolean) as string[];

    const planSteps = [
      "Scanner les retards et blocages (5 min)",
      actions[0] ? `Bloquer un créneau pour ${actions[0]}` : "Bloquer 60–90 min de focus",
      openBlockers.length ? "Escalader un blocage critique" : "Valider l'absence de blocages critiques",
      dueSoonProjects.length ? "Valider le jalon du projet le plus proche" : "Confirmer la stabilité des jalons",
      "Mettre à jour le plan et notifier l'équipe",
    ];

    const dynamicHint = overloadedDays.length
      ? "Recalibrer si la charge dépasse le seuil sur 2 jours d'affilée"
      : "Rafraîchir après chaque tâche critique terminée";

    return { constraints, loadSummary, incoherences, actions, arbitrages, justifications, planSteps, dynamicHint };
  }, [projectsData, tasksWithNames, projectNameById, overdueTasks, synthLoadHours, synthScope, overloadedDays.length, overloadLimit, demoProjects]);

  const reminders = useMemo(() => {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const openTasks = tasksWithNames.filter((t) => t.status !== "terminee");
    const noDeadline = openTasks.filter((t) => !t.deadline).slice(0, 3);
    const dueSoon = openTasks.filter((t) => t.deadline && new Date(t.deadline) <= in24h).slice(0, 3);
    const overdue = overdueTasks.slice(0, 3);

    const simple = [
      ...noDeadline.map((t) => `Ajouter une échéance à "${t.title}"`),
      nextEvents.length ? `Préparer ${nextEvents[0].title} (${new Date(nextEvents[0].start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })})` : null,
    ].filter(Boolean) as string[];

    const conditional = [
      ...dueSoon.map((t) => `Relancer si "${t.title}" n'est pas planifiée d'ici 24h`),
      overdue.length ? `Notifier dérive : ${overdue.length} tâche(s) en retard` : null,
    ].filter(Boolean) as string[];

    const smart = [] as string[];
    if (synthLoadHours > overloadLimit) smart.push("Alléger la journée: déplacer 1 tâche basse priorité");
    if (openTasks.some((t) => t.priority === "haute" && !t.deadline)) smart.push("Fixer une échéance aux priorités hautes");
    if (openTasks.some((t) => t.deadline && new Date(t.deadline) <= in48h && t.status !== "terminee")) smart.push("Bloquer un créneau focus pour les deadlines <48h");
    if (!smart.length) smart.push("Rien à signaler côté rappels intelligents");

    return { simple, conditional, smart };
  }, [tasksWithNames, overdueTasks, nextEvents, synthLoadHours, overloadLimit]);

  const anticipation = useMemo(() => {
    const overloadWarnings = weeklyLoads
      .filter((d) => d.hours > overloadLimit)
      .map((d) => `${d.date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })} · ${d.hours.toFixed(1)} h (>${overloadLimit} h)`);

    const soonDeadlines = tasksWithNames.filter((t) => t.deadline && t.status !== "terminee" && new Date(t.deadline).getTime() - Date.now() < 72 * 60 * 60 * 1000);
    const delayWarnings = soonDeadlines.slice(0, 3).map((t) => `Risque de retard: ${t.title} avant ${new Date(t.deadline as string).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`);

    const preventiveSuggestions = [] as string[];
    if (overloadWarnings.length) preventiveSuggestions.push("Répartir la charge sur d'autres jours (<8h)");
    if (delayWarnings.length) preventiveSuggestions.push("Programmer un bloc focus sur la première deadline");
    if (!preventiveSuggestions.length) preventiveSuggestions.push("Planning stable, surveiller les nouveaux ajouts");

    return { overloadWarnings, delayWarnings, preventiveSuggestions };
  }, [weeklyLoads, overloadLimit, tasksWithNames]);

  useEffect(() => {
    if (!token) return;
    const payload = { reminders, anticipation, context: synthSummaryText };
    const signature = JSON.stringify(payload);
    if (signature === lastSignalsRef.current) return;
    lastSignalsRef.current = signature;
    pushNotifications.mutate(payload);
  }, [anticipation, reminders, synthSummaryText, token, pushNotifications]);

  const alertsFeed = useMemo(() => {
    const base = synthAlerts.filter((a) => a.title !== "Rien à signaler");
    const items = [...base];

    if (reminders.conditional.length) items.push({ title: "Rappels à surveiller", tone: "info" as const, detail: reminders.conditional[0] });
    if (anticipation.overloadWarnings.length) {
      items.push({ title: "Surcharge prévisible", tone: "warn" as const, detail: anticipation.overloadWarnings[0] });
    } else if (anticipation.delayWarnings.length) {
      items.push({ title: "Risque de retard", tone: "warn" as const, detail: anticipation.delayWarnings[0] });
    }

    if (!items.length) return synthAlerts;
    return items;
  }, [anticipation.delayWarnings, anticipation.overloadWarnings, reminders.conditional, synthAlerts]);

  const copySummary = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(synthSummaryText);
    setActionStatus("Synthèse copiée");
  };

  const shareSummary = async () => {
    if (typeof navigator === "undefined") return;
    if ("share" in navigator) {
      const shareApi = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
      if (shareApi.share) {
        try {
          await shareApi.share({ text: synthSummaryText, title: "Synthèse rapide" });
          setActionStatus("Synthèse partagée");
          return;
        } catch (err) {
          setActionStatus((err as Error).message);
        }
      }
    }
    await copySummary();
  };

  const addQuickLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setQuickLinks((prev) => [...prev, { id, title: newLinkTitle.trim(), url: normalizeUrl(newLinkUrl.trim()) }]);
    setNewLinkTitle("");
    setNewLinkUrl("");
    setShowQuickLinkForm(false);
  };

  const removeQuickLink = (id: string) => {
    setQuickLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const editQuickLink = (id: string) => {
    const link = quickLinks.find((l) => l.id === id);
    if (!link) return;
    setEditingQuickLinkId(id);
    setEditLinkTitle(link.title);
    setEditLinkUrl(link.url);
    setShowQuickLinkModal(true);
  };

  const saveQuickLink = () => {
    if (!editingQuickLinkId || !editLinkTitle.trim() || !editLinkUrl.trim()) return;
    setQuickLinks((prev) => prev.map((l) => (l.id === editingQuickLinkId ? { ...l, title: editLinkTitle.trim(), url: normalizeUrl(editLinkUrl.trim()) } : l)));
    setShowQuickLinkModal(false);
    setEditingQuickLinkId(null);
  };

  const handleSendChat = (overrideMessage?: string, force = false) => {
    if (!token) {
      setActionStatus("Connectez-vous pour chatter.");
      return;
    }
    const text = (overrideMessage ?? chatInput).trim();
    if (!text) return;

    if (!force && isAmbiguous(text)) {
      setPendingMessage(text);
      setClarifyPrompt("Le message paraît ambigu. Préciser ou envoyer quand même ?");
      return;
    }

    const structured = detectStructuredCommand(text);
    const meta = structured ? { structuredCommand: structured } : undefined;
    const message = structured ? `[CMD:${structured.command}] ${structured.content}` : text;
    chatMutation.mutate({ message, tone: chatTone, meta });
  };

  const confirmSendPending = () => {
    if (pendingMessage) handleSendChat(pendingMessage, true);
  };

  const cancelQuickLink = () => {
    setShowQuickLinkModal(false);
    setEditingQuickLinkId(null);
  };

  const FeedbackSection = () => (
    <section className="grid gap-6 lg:grid-cols-3">
      <CardContainer
        title={feedbackScopeLabels[feedbackScope]}
        icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
        className="lg:col-span-2"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{feedbackRangeLabel}</span>
          <div className="flex gap-1">
            {(["day", "week", "month"] as FeedbackScope[]).map((scope) => (
              <button
                key={scope}
                onClick={() => setFeedbackScope(scope)}
                className={`rounded-md px-2 py-1 font-semibold ${feedbackScope === scope ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}
              >
                {scope === "day" ? "Jour" : scope === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
          {feedbackLoading ? <span className="text-slate-500">Calcul...</span> : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-slate-800">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-slate-600">Charge planifiée</p>
            <p className="text-xl font-semibold text-slate-900">{feedbackStats.planned_hours.toFixed(1)} h</p>
            <p className="text-xs text-slate-500">{feedbackStats.actual_hours.toFixed(1)} h réalisées</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-slate-600">Taux de complétion</p>
            <p className="text-xl font-semibold text-slate-900">{Math.round(feedbackStats.completion_rate * 100)}%</p>
            <p className="text-xs text-slate-500">{feedbackStats.tasks_done} / {feedbackStats.tasks_planned || 0} tâches</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-1">
            <p className="text-xs font-semibold text-slate-600">Tâches reportées</p>
            <p className="text-xl font-semibold text-slate-900">{feedbackStats.deferred_tasks.length}</p>
            <p className="text-xs text-slate-500">À rattraper sur la période</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-800">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <p className="text-xs font-semibold text-slate-600">Détails charge vs réalisé</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(100, (feedbackStats.actual_hours / Math.max(0.1, feedbackStats.planned_hours || 1)) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">{feedbackStats.actual_hours.toFixed(1)} h / {feedbackStats.planned_hours.toFixed(1)} h</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.min(100, (feedbackStats.tasks_done / Math.max(1, feedbackStats.tasks_planned)) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">{feedbackStats.tasks_done} tâches terminées</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <p className="text-xs font-semibold text-slate-600">Tâches reportées</p>
            {feedbackStats.deferred_tasks.length ? (
              <ul className="space-y-1 text-[12px] text-slate-700">
                {feedbackStats.deferred_tasks.slice(0, 3).map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-md bg-amber-50 px-2 py-1">
                    <span className="font-semibold text-amber-800">{t.title}</span>
                    <span className="text-[11px] text-amber-700">{t.late_days ? `${t.late_days} j` : "report"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-600">Aucun report détecté.</p>
            )}
          </div>
        </div>
      </CardContainer>

      <CardContainer title="Statistiques" icon={<BarChart className="h-5 w-5 text-blue-600" />} className="hidden md:block lg:col-span-1">
        <div className="space-y-3 text-sm text-slate-800">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Planifié</span>
              <span>{feedbackStats.planned_hours.toFixed(1)} h</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.min(100, feedbackStats.planned_hours * 10)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Réalisé</span>
              <span>{feedbackStats.actual_hours.toFixed(1)} h</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${Math.min(100, feedbackStats.actual_hours * 10)}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Tâches terminées</span>
              <span>{feedbackStats.tasks_done}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${Math.min(100, (feedbackStats.tasks_done / Math.max(1, feedbackStats.tasks_planned)) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-600">{feedbackStats.tasks_planned} prévues sur la période</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Report / retard</span>
              <span>{feedbackStats.deferred_tasks.length}</span>
            </div>
            <p className="text-xs text-slate-600">Focus sur les prochaines actions à replanifier.</p>
          </div>
        </div>
      </CardContainer>

      <CardContainer title="Amélioration continue" icon={<Sparkles className="h-5 w-5 text-amber-600" />} className="hidden md:block lg:col-span-1">
        <div className="space-y-3 text-sm text-slate-800">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <p className="text-xs font-semibold text-slate-600">Ajuster mes estimations</p>
            {feedbackStats.estimate_adjustments.length ? (
              <ul className="space-y-1 text-[12px] text-slate-700">
                {feedbackStats.estimate_adjustments.slice(0, 3).map((adj) => (
                  <li key={adj.task_id ?? adj.title} className="rounded-md bg-indigo-50 px-2 py-1">
                    <span className="font-semibold text-indigo-900">{adj.title}</span>
                    <span className="ml-2 text-[11px] text-indigo-700">→ {adj.suggested_minutes} min</span>
                    <span className="ml-2 text-[11px] text-indigo-600">({adj.ratio}x)</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-600">Pas d'ajustement nécessaire, continue ainsi.</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <p className="text-xs font-semibold text-slate-600">Habitudes apprises</p>
            {feedbackStats.habit_windows.length ? (
              <ul className="space-y-1 text-[12px] text-slate-700">
                {feedbackStats.habit_windows.map((h) => (
                  <li key={h.window} className="flex items-center justify-between rounded-md bg-emerald-50 px-2 py-1">
                    <span className="font-semibold text-emerald-800">{h.window}</span>
                    <span className="text-[11px] text-emerald-700">{h.hours.toFixed(1)} h · {h.events} évènement(s)</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-600">Pas assez de données pour déduire des habitudes.</p>
            )}
          </div>
        </div>
      </CardContainer>
    </section>
  );

  const AgendaAndChatSection = () => (
    <section className="grid gap-6 lg:grid-cols-3">
      <CardContainer title="Agenda du jour" icon={<CalendarClock className="h-5 w-5 text-blue-600" />} className="lg:col-span-2">
        <div className="flex flex-col gap-3">
          {token ? (
            <p className="text-xs text-slate-500">Agenda chargé depuis l&apos;API.</p>
          ) : (
            <p className="text-xs text-slate-500">Connectez-vous pour voir vos événements synchronisés.</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold transition hover:border-slate-300 hover:shadow-sm">
              <input type="file" accept=".ics,text/calendar" className="hidden" onChange={handleIcsUpload} />
              <Sparkles className="h-4 w-4" />
              Importer un ICS
            </label>
            {importIcs.status === "pending" ? <span>Import en cours...</span> : null}
            <button
              onClick={handleExportIcs}
              disabled={!token || exportIcs.status === "pending"}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold transition hover:border-slate-300 hover:shadow-sm disabled:opacity-60"
            >
              Exporter agenda
            </button>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={selectedDate.toISOString().slice(0, 10)}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="rounded-md border border-slate-200 px-3 py-1 text-xs"
              />
              <div className="flex rounded-md border border-slate-200 text-xs font-semibold text-slate-700">
                {(
                  [
                    ["jour", "Jour"],
                    ["semaine", "Semaine"],
                    ["mois", "Mois"],
                    ["annee", "Année"],
                    ["liste", "Liste"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setViewMode(key)}
                    className={`px-2 py-1 ${viewMode === key ? "bg-slate-900 text-white" : "bg-transparent"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex rounded-md border border-slate-200 text-xs font-semibold text-slate-700">
                <button onClick={() => shiftDate(viewMode, -1)} className="px-2 py-1">
                  ◀
                </button>
                <button onClick={() => setSelectedDate(new Date())} className="px-2 py-1">
                  Aujourd&apos;hui
                </button>
                <button onClick={() => shiftDate(viewMode, 1)} className="px-2 py-1">
                  ▶
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
            >
              Ajouter
            </button>
            <button
              onClick={() => setShowSearchModal(true)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
            >
              Rechercher
            </button>
          </div>
          {token ? null : null}
          {eventsLoading ? (
            <p className="text-sm text-slate-600">Chargement de l&apos;agenda...</p>
          ) : viewMode === "jour" ? (
            dayEvents.length ? (
              dayEvents.map((event) => (
                <AgendaItem key={event.id} event={event} onEdit={() => openEditModal(event)} onDelete={() => handleDeleteEvent(event.id)} />
              ))
            ) : (
              <p className="text-sm text-slate-600">Aucun événement pour cette date.</p>
            )
          ) : viewMode === "semaine" ? (
            <WeekView focusDate={selectedDate} events={filteredEvents} onEdit={openEditModal} onDelete={handleDeleteEvent} />
          ) : viewMode === "mois" ? (
            <CalendarGrid
              focusDate={selectedDate}
              events={filteredEvents}
              onSelect={(d) => {
                setSelectedDate(d);
                setViewMode("jour");
              }}
            />
          ) : viewMode === "annee" ? (
            <YearView focusDate={selectedDate} events={filteredEvents} onSelect={(d) => setSelectedDate(d)} />
          ) : (
            <ListView events={filteredEvents} onEdit={openEditModal} onDelete={handleDeleteEvent} />
          )}
        </div>
      </CardContainer>

      <CardContainer title="Chat avec l&apos;agent" icon={<MessageCircle className="h-5 w-5 text-amber-600" />} className="lg:col-span-1">
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Ton</span>
              <div className="flex rounded-md border border-slate-200">
                {(["formel", "detendu"] as const).map((tone) => (
                  <button
                    key={tone}
                    onClick={() => setChatTone(tone)}
                    className={`px-2 py-1 text-[11px] font-semibold ${chatTone === tone ? "bg-slate-900 text-white" : "text-slate-700"}`}
                  >
                    {tone === "formel" ? "Formel" : "Détendu"}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => chatSummary.mutate()}
              disabled={!token || chatSummary.status === "pending"}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 hover:border-slate-300 disabled:opacity-60"
            >
              Résumer
            </button>
          </div>
          <div className="flex flex-col gap-3 rounded-xl bg-white/70 p-3 shadow-inner shadow-slate-100">
            {chatHistory.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
          </div>
          {summaryText ? (
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-600">Résumé</p>
              <p className="mt-1 whitespace-pre-line text-sm text-slate-800">{summaryText}</p>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={token ? "Écrire au coach IA" : "Connectez-vous pour chatter"}
              className="min-h-[80px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-slate-400"
            />
            {clarifyPrompt ? (
              <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span>{clarifyPrompt}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setClarifyPrompt(null);
                      setPendingMessage(null);
                    }}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold hover:underline"
                  >
                    Préciser
                  </button>
                  <button
                    onClick={confirmSendPending}
                    className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white"
                  >
                    Envoyer quand même
                  </button>
                </div>
              </div>
            ) : null}
            <button
              onClick={() => handleSendChat()}
              disabled={!token || !chatInput.trim() || chatMutation.status === "pending"}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:shadow-sm disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              Envoyer
            </button>
          </div>
        </div>
      </CardContainer>
    </section>
  );

  const TasksAndProjectsSection = () => (
    <section className="grid gap-6 lg:grid-cols-3">
      <CardContainer title="Kanban rapide" icon={<ListChecks className="h-5 w-5 text-emerald-600" />} className="lg:col-span-3">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500">Glissez-déposez vos tâches du jour pour suivre l&apos;avancée en un coup d&apos;œil.</p>
          {tasksLoading ? (
            <p className="text-sm text-slate-600">Chargement des tâches...</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {(["a_faire", "en_cours", "terminee"] as const).map((col) => (
                <div
                  key={col}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData("text/plain");
                    if (!taskId) return;
                    if (!token) {
                      setActionStatus("Connectez-vous pour mettre à jour une tâche.");
                      return;
                    }
                    setQuickKanban((prev) => moveTaskLocal(prev, taskId, col));
                    updateTaskStatus.mutate({ taskId, status: col });
                  }}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                    <span>{kanbanLabel(col)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{quickKanban[col].length}</span>
                  </div>
                  <div className="mt-2 space-y-2 text-xs text-slate-700 min-h-[120px]">
                    {quickKanban[col].length ? (
                      quickKanban[col].map((t) => (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                          className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                              <p className="text-[11px] text-slate-500">{t.projectName ?? (t.projectId ? `Projet ${t.projectId}` : "Indépendant")}</p>
                              {t.deadline ? <p className="text-[11px] text-slate-500">Échéance {formatTime(t.deadline)}</p> : null}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <button
                                className="text-[10px] font-semibold text-blue-700 underline underline-offset-2"
                                onClick={() => planTaskToEvent(t)}
                              >
                                Planifier
                              </button>
                              <button
                                className="text-[10px] font-semibold text-rose-700 underline underline-offset-2"
                                onClick={() => handleDeleteTask(t.id)}
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-500">Glissez une tâche ici</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContainer>

      <CardContainer title="Tâches du jour" icon={<ListChecks className="h-5 w-5 text-emerald-600" />} className="lg:col-span-2">
        <div className="flex flex-col gap-3">
          {token ? (
            <p className="text-xs text-slate-500">Données en direct avec authentification.</p>
          ) : (
            <p className="text-xs text-slate-500">Connectez-vous pour charger vos tâches stockées côté serveur.</p>
          )}
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              <span className="font-semibold">Export :</span>
              <button
                type="button"
                onClick={() => exportTasksAs("json")}
                className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
              >
                JSON
              </button>
              <button
                type="button"
                onClick={() => exportTasksAs("csv")}
                className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
              >
                CSV
              </button>
            </div>
            {token ? (
              <button
                onClick={() => setShowTaskModal(true)}
                className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
              >
                <Plus className="h-4 w-4" /> Nouvelle tâche
              </button>
            ) : null}
          </div>
          {tasksLoading ? (
            <p className="text-sm text-slate-600">Chargement des tâches...</p>
          ) : todayTasks.length ? (
            todayTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onDone={() => updateTask.mutate(task.id)}
                onDelete={() => handleDeleteTask(task.id)}
              />
            ))
          ) : (
            <p className="text-sm text-slate-600">Aucune tâche pour aujourd&apos;hui.</p>
          )}
        </div>
      </CardContainer>

      <h2 className="sr-only">Projets & jalons</h2>
      <CardContainer title="Projets / jalons" icon={<CheckCircle2 className="h-5 w-5 text-indigo-600" />} className="lg:col-span-1">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <p>{token ? "Projets chargés depuis l'API." : "Connectez-vous pour vos projets en base."}</p>
            {token ? (
              <button
                onClick={() => setShowCreateProjectModal(true)}
                className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouveau projet
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] text-slate-600">
            <span className="font-semibold">Export :</span>
            <button
              type="button"
              onClick={() => exportProjectsAs("json")}
              className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              JSON
            </button>
            <button
              type="button"
              onClick={() => exportProjectsAs("csv")}
              className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              CSV
            </button>
          </div>
          {token && newProjectMilestones.length ? (
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              <span className="rounded-full bg-indigo-50 px-2 py-1 font-semibold text-indigo-700">{newProjectMilestones.length} jalon(s) en brouillon</span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span className="font-semibold">Trier :</span>
            <button
              onClick={() => setProjectSort("progress")}
              className={`rounded-full px-2 py-1 ${projectSort === "progress" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              Avancement
            </button>
            <button
              onClick={() => setProjectSort("risk")}
              className={`rounded-full px-2 py-1 ${projectSort === "risk" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              Risque
            </button>
            <button
              onClick={() => setProjectSort("alphabetique")}
              className={`rounded-full px-2 py-1 ${projectSort === "alphabetique" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              A→Z
            </button>
            <label className="ml-auto inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
              <input type="checkbox" checked={projectRiskOnly} onChange={(e) => setProjectRiskOnly(e.target.checked)} />
              <span>Risque uniquement</span>
            </label>
          </div>
          {projectsLoading ? (
            <p className="text-sm text-slate-600">Chargement des projets...</p>
          ) : sortedProjects.length ? (
            sortedProjects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                onOpen={() => setActiveProject(project)}
                tasks={tasksByProject[String(project.id)] ?? []}
                onResolveBlocker={(blockerId) => resolveBlockerQuick(project, blockerId)}
              />
            ))
          ) : (
            <p className="text-sm text-slate-600">Aucun projet actif pour le moment.</p>
          )}
        </div>
      </CardContainer>
    </section>
  );

  const isDashboard = view === "dashboard";
  const pageTitle = useMemo(() => {
    switch (view) {
      case "agenda":
        return "Agenda";
      case "tasks-projects":
        return "Tâches & Projets";
      case "agent":
        return "Agent";
      case "study":
        return "Étude";
      case "automations":
        return "Automations";
      case "commands":
        return "Commandes";
      case "feedback":
        return "Feedback";
      case "links":
        return "Liens";
      default:
        return "Tableau de bord";
    }
  }, [view]);

  return (
    <div className="min-h-screen bg-transparent text-[color:var(--foreground)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            {isDashboard ? (
              <>
                <p className="text-sm text-slate-600">Tableau de bord personnel</p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Bonjour, voici votre journée pilotée par l&apos;agent IA</h1>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">Section dédiée</p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-300"
              aria-label="Basculer le thème clair/sombre"
            >
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {token ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                  <PlayCircle className="h-4 w-4" />
                  Connecté{email ? ` · ${email}` : ""}
                </span>
                <button
                  onClick={clearAuth}
                  className="text-xs font-semibold text-slate-600 underline underline-offset-2 hover:text-slate-800"
                >
                  Se déconnecter
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
              >
                <PlayCircle className="h-4 w-4" />
                Se connecter
              </Link>
            )}
          </div>
        </header>

        {isDashboard ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<Timer className="h-5 w-5 text-indigo-600" />}
                title="Charge du jour"
                value={`${loadHours.toFixed(1)} h`}
                detail="Inclus événements fixes et blocs proposés"
              />
              <StatCard
                icon={<ListChecks className="h-5 w-5 text-emerald-600" />}
                title="Tâches restantes"
                value={pendingTasks}
                detail="À finir aujourd'hui"
              />
              <HeatmapCard events={visibleEventsForLoad} />
              <StatCard
                icon={<CalendarClock className="h-5 w-5 text-blue-600" />}
                title="Blocs focus"
                value={demoStats.focusBlocks}
                detail="Proposés par l'agent"
              />
              <StatCard
                icon={<MessageCircle className="h-5 w-5 text-amber-600" />}
                title="Alertes"
                value="Rien à signaler"
                detail="Planning stable"
              />
            </section>

            <section className="flex flex-wrap gap-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="text-[11px] uppercase tracking-wide text-slate-500">Horizon</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPlanMode("day")}
                    className={`rounded-md px-2 py-1 ${planMode === "day" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
                  >
                    Jour
                  </button>
                  <button
                    onClick={() => setPlanMode("week")}
                    className={`rounded-md px-2 py-1 ${planMode === "week" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}
                  >
                    Semaine
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="text-[11px] uppercase tracking-wide text-slate-500">Synthèse</span>
                <button
                  onClick={() => setSynthScope("day")}
                  className={`rounded-md px-2 py-1 ${synthScope === "day" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  Jour
                </button>
                <button
                  onClick={() => setSynthScope("week")}
                  className={`rounded-md px-2 py-1 ${synthScope === "week" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}
                >
                  Semaine
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="text-[11px] uppercase tracking-wide text-slate-500">Recherche</span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Fuse.js (événements, tâches, projets)"
                  className="rounded-md border border-slate-200 px-3 py-1 text-sm"
                />
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  Ouvrir
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                <span className="text-[11px] uppercase tracking-wide text-slate-500">Filtres</span>
                <label className="inline-flex items-center gap-1">
                  <input type="checkbox" checked={filterImportant} onChange={(e) => setFilterImportant(e.target.checked)} />
                  Important
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={filterTypes.fixe}
                    onChange={(e) => setFilterTypes({ ...filterTypes, fixe: e.target.checked })}
                  />
                  Fixé
                </label>
                <label className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={filterTypes.propose}
                    onChange={(e) => setFilterTypes({ ...filterTypes, propose: e.target.checked })}
                  />
                  Proposé
                </label>
              </div>
            </section>

            <section className="flex flex-wrap items-center gap-3">
              <ActionButton onClick={() => quickAction("organiser")} icon={<Sparkles className="h-4 w-4" />} label="Plan du jour" />
              <ActionButton onClick={() => quickAction("bilan")} icon={<CheckCircle2 className="h-4 w-4" />} label="Bilan rapide" />
              <ActionButton onClick={() => quickAction("optimiser")} icon={<TrendingUp className="h-4 w-4" />} label="Optimiser la semaine" />
              {actionStatus ? <span className="text-sm text-slate-600">{actionStatus}</span> : null}
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
          <CardContainer title="Analyse temporelle" icon={<Timer className="h-5 w-5 text-amber-600" />} className="hidden md:block lg:col-span-3">
            <div className="grid gap-4 md:grid-cols-3 text-sm text-slate-800">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[12px] font-semibold text-slate-600">Créneaux libres</p>
                {dayAnalysis.freeSlots.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-700">
                    {dayAnalysis.freeSlots.slice(0, 4).map((slot) => (
                      <li key={slot.start.toISOString()} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                        <span>{slot.start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="text-slate-500">→</span>
                        <span>{slot.end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="text-[11px] text-slate-500">{slot.durationMinutes} min</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-600">Pas de créneau libre dans la plage productive.</p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[12px] font-semibold text-slate-600">Conflits détectés</p>
                {dayAnalysis.conflicts.length ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-700">
                    {dayAnalysis.conflicts.map((c, idx) => (
                      <li key={`${c.a.id}-${c.b.id}-${idx}`} className="rounded-md bg-rose-50 px-2 py-1 text-rose-800">
                        {c.a.title} / {c.b.title} ({c.overlapMinutes} min)
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-slate-600">Aucun chevauchement aujourd&apos;hui.</p>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
                <p className="text-[12px] font-semibold text-slate-600">Charge & opportunités</p>
                <p className="text-sm font-semibold text-slate-900">{dayAnalysis.load.toFixed(1)} h prévues</p>
                <p className="text-xs text-slate-600">Fenêtre productive {workStart} – {workEnd} ({dayAnalysis.windowHours.toFixed(1)} h)</p>
                {dayAnalysis.overload ? (
                  <p className="rounded-md bg-rose-50 px-2 py-1 text-[12px] font-semibold text-rose-800">Journée surchargée (limite {overloadLimit} h)</p>
                ) : null}
                {dayAnalysis.underUsedHours >= 1 ? (
                  <p className="rounded-md bg-emerald-50 px-2 py-1 text-[12px] font-semibold text-emerald-800">
                    Temps sous-exploité : {dayAnalysis.underUsedHours.toFixed(1)} h libres
                  </p>
                ) : null}
                {overloadedDays.length ? (
                  <div className="text-xs text-slate-700">
                    <p className="font-semibold text-amber-700">Jours surchargés ({overloadedDays.length})</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {overloadedDays.map((d) => (
                        <span key={d.date.toISOString()} className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">
                          {d.date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })} · {d.hours.toFixed(1)} h
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">Aucune surcharge sur la période.</p>
                )}
                {underUsedDays.length ? (
                  <div className="text-xs text-slate-700">
                    <p className="font-semibold text-emerald-700">Jours sous-exploités ({underUsedDays.length})</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {underUsedDays.map((d) => (
                        <span key={d.date.toISOString()} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                          {d.date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })} · {d.hours.toFixed(1)} h
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </CardContainer>

          <CardContainer
            title="Raisonnement & décision"
            icon={<Brain className="h-5 w-5 text-purple-600" />}
            className="h-full w-full lg:col-span-2"
          >
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-[1.1fr_1.1fr_1fr] text-sm text-slate-800">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm leading-snug">
                <p className="text-xs font-semibold text-slate-600">Analyse</p>
                <ul className="mt-2 space-y-2 text-[12px] text-slate-700">
                  {decisionSupport.constraints.map((c, idx) => (
                    <li key={`c-${idx}`} className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      <span>{c}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <Timer className="h-3.5 w-3.5 text-slate-500" />
                    <span>{decisionSupport.loadSummary}</span>
                  </li>
                  {decisionSupport.incoherences.map((c, idx) => (
                    <li key={`i-${idx}`} className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm leading-snug">
                <p className="text-xs font-semibold text-slate-600">Prise de décision</p>
                <div className="mt-2 space-y-2 text-[11px] text-slate-700">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-800">Choix d’actions</p>
                    <ul className="mt-1 space-y-1">
                      {decisionSupport.actions.length ? (
                        decisionSupport.actions.map((a, idx) => <li key={`a-${idx}`}>• {a}</li>)
                      ) : (
                        <li>• Rien de bloquant</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-800">Arbitrage</p>
                    <ul className="mt-1 space-y-1">
                      {decisionSupport.arbitrages.length ? decisionSupport.arbitrages.map((a, idx) => <li key={`arb-${idx}`}>• {a}</li>) : <li>• Aucun arbitrage critique</li>}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-800">Justification</p>
                    <ul className="mt-1 space-y-1">
                      {decisionSupport.justifications.length ? decisionSupport.justifications.map((j, idx) => <li key={`j-${idx}`}>• {j}</li>) : <li>• Situation stable</li>}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm leading-snug">
                <p className="text-xs font-semibold text-slate-600">Planification automatique</p>
                <ol className="mt-2 space-y-2 text-[12px] text-slate-700 list-decimal list-inside">
                  {decisionSupport.planSteps.map((step, idx) => (
                    <li key={`p-${idx}`}>{step}</li>
                  ))}
                </ol>
                <p className="mt-2 text-[11px] font-semibold text-slate-600">Ajustement dynamique</p>
                <p className="text-[12px] text-slate-700">{decisionSupport.dynamicHint}</p>
              </div>
            </div>
          </CardContainer>

          <CardContainer
            title="Proactivité & rappels"
            icon={<BellRing className="h-5 w-5 text-indigo-600" />}
            className="h-full w-full lg:col-span-1"
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-3 text-sm text-slate-800 leading-relaxed">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <p className="text-sm font-semibold text-slate-700">Rappels simples</p>
                <ul className="space-y-1.5">
                  {reminders.simple.length ? reminders.simple.map((r, idx) => <li key={`rs-${idx}`}>• {r}</li>) : <li>• Aucun rappel nécessaire</li>}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <p className="text-sm font-semibold text-slate-700">Rappels conditionnels</p>
                <ul className="space-y-1.5">
                  {reminders.conditional.length ? reminders.conditional.map((r, idx) => <li key={`rc-${idx}`}>• {r}</li>) : <li>• Rien à surveiller</li>}
                </ul>
                <p className="text-xs text-slate-500">Déclenchés en cas de non-planification ou de retard.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <p className="text-sm font-semibold text-slate-700">Relances intelligentes</p>
                <ul className="space-y-1.5">
                  {reminders.smart.length ? reminders.smart.map((r, idx) => <li key={`ri-${idx}`}>• {r}</li>) : <li>• Aucune relance</li>}
                </ul>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-3 text-sm text-slate-800 leading-relaxed">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-1.5">
                <p className="text-sm font-semibold text-slate-700">Prévenir la surcharge</p>
                <ul className="space-y-1.5">
                  {anticipation.overloadWarnings.length ? anticipation.overloadWarnings.map((w, idx) => <li key={`ow-${idx}`}>• {w}</li>) : <li>• Aucune surcharge détectée</li>}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-1.5">
                <p className="text-sm font-semibold text-slate-700">Prévenir les retards</p>
                <ul className="space-y-1.5">
                  {anticipation.delayWarnings.length ? anticipation.delayWarnings.map((w, idx) => <li key={`dw-${idx}`}>• {w}</li>) : <li>• Aucun risque immédiat</li>}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-1.5">
                <p className="text-sm font-semibold text-slate-700">Suggestions préventives</p>
                <ul className="space-y-1.5">
                  {anticipation.preventiveSuggestions.map((w, idx) => <li key={`ps-${idx}`}>• {w}</li>)}
                </ul>
              </div>
            </div>
          </CardContainer>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <CardContainer title="Motivation & discipline" icon={<HeartPulse className="h-5 w-5 text-rose-600" />} className="hidden md:block lg:col-span-2">
            <div className="grid gap-4 md:grid-cols-3 text-sm text-slate-800">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600">Check-in quotidien</p>
                  {checkInSaved ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">OK</span> : null}
                </div>
                <label className="flex items-center gap-3 text-xs text-slate-600">
                  <span>Motivation</span>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={checkInMood}
                    onChange={(e) => setCheckInMood(Number(e.target.value))}
                    className="w-full accent-rose-600"
                  />
                  <span className="text-sm font-semibold text-slate-900">{checkInMood}/10</span>
                </label>
                <textarea
                  value={checkInNote}
                  onChange={(e) => setCheckInNote(e.target.value)}
                  placeholder="Une phrase sur ton état d'esprit"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm"
                  rows={3}
                />
                <button onClick={saveCheckIn} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800">
                  Enregistrer le check-in
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <p className="text-xs font-semibold text-slate-600">Objectifs du jour</p>
                <div className="space-y-2">
                  {dailyGoals.map((goal, idx) => (
                    <div key={`goal-${idx}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={dailyGoalsDone[idx]}
                        onChange={() => toggleGoal(idx)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <input
                        type="text"
                        value={goal}
                        onChange={(e) => updateGoal(idx, e.target.value)}
                        placeholder={`Objectif ${idx + 1}`}
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm shadow-sm"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500">3 cibles max pour rester focalisé.</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600">Encouragements</p>
                  <ul className="mt-1 space-y-1 text-[12px] text-slate-700">
                    {motivationInsights.encouragements.map((e, i) => (
                      <li key={`enc-${i}`}>• {e}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600">Alertes de décrochage</p>
                  <ul className="mt-1 space-y-1 text-[12px] text-rose-700">
                    {motivationInsights.alerts.length ? motivationInsights.alerts.map((e, i) => <li key={`al-${i}`}>• {e}</li>) : <li className="text-slate-500">• RAS pour l'instant</li>}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600">Récompenses symboliques</p>
                  {motivationInsights.rewards.length ? (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {motivationInsights.rewards.map((r, i) => (
                        <span key={`rw-${i}`} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                          <Trophy className="h-3.5 w-3.5" />
                          {r}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-slate-500">Complète tes objectifs pour débloquer un badge.</p>
                  )}
                </div>
              </div>
            </div>
          </CardContainer>

          <CardContainer title="Routine discipline" icon={<Flag className="h-5 w-5 text-indigo-600" />} className="hidden md:block lg:col-span-1">
            <div className="space-y-3 text-sm text-slate-800">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <p className="text-xs font-semibold text-slate-600">Mini-checklist</p>
                <ul className="space-y-1 text-[12px] text-slate-700">
                  <li>• Bloquer 1 créneau focus (30-60 min)</li>
                  <li>• Lancer la première tâche en &lt; 5 minutes</li>
                  <li>• Pause courte après 2 blocs</li>
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <p className="text-xs font-semibold text-slate-600">Signal d'alerte</p>
                <p className="text-[12px] text-slate-700">Si 2 alertes ou plus apparaissent, réduis la charge et termine un seul objectif.</p>
              </div>
            </div>
          </CardContainer>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <CardContainer title="Sécurité & contrôle" icon={<ShieldCheck className="h-5 w-5 text-emerald-700" />} className="hidden md:block lg:col-span-2">
            <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-800">
              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Mode manuel</span>
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <span className="text-[11px] text-slate-500">Off</span>
                    <input
                      type="checkbox"
                      checked={manualMode}
                      onChange={(e) => setManualMode(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] text-slate-900">On</span>
                  </label>
                </div>
                <p className="text-[12px] text-slate-600">
                  En mode manuel, chaque action doit être confirmée avant exécution.
                </p>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Validation actions sensibles</span>
                  <input
                    type="checkbox"
                    checked={sensitiveValidation}
                    onChange={(e) => setSensitiveValidation(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[12px] text-slate-600">Scripts et webhooks requièrent une validation explicite.</p>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-700">Statut</p>
                <p className="text-[12px] text-slate-600">Dernière action: {automationHistory[0] ?? "N/A"}</p>
                <p className="text-[12px] text-slate-600">Dernier ID: {lastAutomationId ?? "N/A"}</p>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-700">Rollback</p>
                <p className="text-[12px] text-slate-600">Annule la dernière action enregistrée (log).</p>
                <button
                  onClick={rollbackAutomation}
                  disabled={!automationHistory.length}
                  className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <Undo2 className="h-4 w-4" /> Rollback
                </button>
              </div>
            </div>
          </CardContainer>

          <CardContainer title="Journal d'actions" icon={<ShieldCheck className="h-5 w-5 text-slate-700" />} className="hidden md:block lg:col-span-1">
            <div className="space-y-2 text-sm text-slate-800">
              {automationHistory.length ? (
                <ul className="space-y-1 text-[12px] text-slate-700">
                  {automationHistory.map((entry, idx) => (
                    <li key={`audit-${idx}`} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                      <span>{entry}</span>
                      <span className="text-[11px] text-slate-500">#{automationHistory.length - idx}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-slate-600">Aucune action enregistrée.</p>
              )}
            </div>
          </CardContainer>
        </section>

          </>
        ) : null}

        {view === "commands" && (
          <section className="grid gap-6 lg:grid-cols-3">
            <CardContainer title="CLI / commandes rapides" icon={<Terminal className="h-5 w-5 text-slate-800" />} className="hidden md:block lg:col-span-2">
            <div className="space-y-3 text-sm text-slate-800">
              <div className="flex flex-wrap gap-2 text-[12px] text-slate-700">
                {["bilan", "sync agenda", "deploy staging", "cleanup"].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => runCommand(cmd)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold shadow-sm hover:bg-slate-50"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <label className="text-xs font-semibold text-slate-700">Entrer une commande</label>
                <div className="flex gap-2">
                  <input
                    value={commandInput}
                    onChange={(e) => setCommandInput(e.target.value)}
                    placeholder="ex: deploy staging"
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    onClick={() => runCommand(commandInput)}
                    className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                  >
                    <TerminalSquare className="h-4 w-4" /> Exécuter
                  </button>
                </div>
                <p className="text-[12px] text-slate-600">Enregistre et trace chaque commande (API REST).</p>
              </div>
            </div>
            </CardContainer>

            <CardContainer title="Historique des commandes" icon={<TerminalSquare className="h-5 w-5 text-slate-700" />} className="hidden md:block lg:col-span-1">
            <div className="space-y-2 text-sm text-slate-800">
              {commandHistory.length ? (
                <ul className="space-y-1 text-[12px] text-slate-700">
                  {commandHistory.map((entry, idx) => (
                    <li key={`cmd-${idx}`} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                      <span>{entry}</span>
                      <span className="text-[11px] text-slate-500">#{commandHistory.length - idx}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-slate-600">Aucune commande exécutée.</p>
              )}
            </div>
            </CardContainer>
          </section>
        )}

        {(isDashboard || view === "automations") && (
          <section className="grid gap-6 lg:grid-cols-3">
            <CardContainer title="Automatisation & actions" icon={<TerminalSquare className="h-5 w-5 text-slate-800" />} className="hidden md:block lg:col-span-2">
            <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-800">
              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-600">Exécution de scripts</p>
                <p className="text-[12px] text-slate-600">Déclenche un script d'automatisation (placeholder).</p>
                <button onClick={runScript} className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800">
                  <TerminalSquare className="h-4 w-4" /> Lancer un script
                </button>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-600">Appels API</p>
                <p className="text-[12px] text-slate-600">Envoie une requête simulée (GET/POST).</p>
                <button onClick={callApi} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500">
                  <Globe2 className="h-4 w-4" /> Appeler une API
                </button>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-600">Création de fichiers</p>
                <p className="text-[12px] text-slate-600">Génère un fichier virtuel pour capture rapide.</p>
                <button onClick={createFileAction} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500">
                  <FilePlus2 className="h-4 w-4" /> Créer un fichier
                </button>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-600">Envoi de messages</p>
                <p className="text-[12px] text-slate-600">Préviens un canal ou l'agent.</p>
                <button onClick={sendMessageAction} className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-500">
                  <Send className="h-4 w-4" /> Envoyer un message
                </button>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
                <p className="text-xs font-semibold text-slate-600">Webhooks</p>
                <p className="text-[12px] text-slate-600">Déclenchement simulé (Zapier/Make, etc.).</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={triggerWebhook} className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-purple-500">
                    <Webhook className="h-4 w-4" /> Déclencher
                  </button>
                </div>
              </div>
            </div>
            </CardContainer>

            <CardContainer title="Historique des actions" icon={<Send className="h-5 w-5 text-slate-700" />} className="hidden md:block lg:col-span-1">
            <div className="space-y-2 text-sm text-slate-800">
              {automationHistory.length ? (
                <ul className="space-y-1 text-[12px] text-slate-700">
                  {automationHistory.map((entry, idx) => (
                    <li key={`auto-${idx}`} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
                      <span>{entry}</span>
                      <span className="text-[11px] text-slate-500">#{automationHistory.length - idx}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[12px] text-slate-600">Aucune action exécutée pour l'instant.</p>
              )}
            </div>
            </CardContainer>
          </section>
        )}

        {(isDashboard || view === "feedback") && (
          <FeedbackView
            feedbackScope={feedbackScope}
            setFeedbackScope={setFeedbackScope}
            feedbackScopeLabels={feedbackScopeLabels}
            feedbackRangeLabel={feedbackRangeLabel}
            feedbackLoading={feedbackLoading}
            feedbackStats={feedbackStats}
          />
        )}

        {(isDashboard || view === "feedback" || view === "agent") && (
          <>
            <h2 className="sr-only">Logs agent</h2>
            <PreferencesView
            token={token}
            preferencesLoading={preferencesLoading}
            prefProductiveStart={prefProductiveStart}
            prefProductiveEnd={prefProductiveEnd}
            prefLoadLimit={prefLoadLimit}
            prefSession={prefSession}
            prefDaysOff={prefDaysOff}
            prefPainfulTasks={prefPainfulTasks}
            setPrefProductiveStart={setPrefProductiveStart}
            setPrefProductiveEnd={setPrefProductiveEnd}
            setPrefLoadLimit={setPrefLoadLimit}
            setPrefSession={setPrefSession}
            setPrefDaysOff={setPrefDaysOff}
            setPrefPainfulTasks={setPrefPainfulTasks}
            updatePreferences={updatePreferences}
            historyLoading={historyLoading}
            historyData={historyData}
            agentHistoryFilter={agentHistoryFilter}
            setAgentHistoryFilter={setAgentHistoryFilter}
            filteredAgentLogs={filteredAgentLogs}
            />
          </>
        )}

        {(view === "agenda" || view === "agent") && (
          <AgendaChatView
            token={token}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            viewMode={viewMode}
            setViewMode={setViewMode}
            eventsLoading={eventsLoading}
            dayEvents={dayEvents}
            filteredEvents={filteredEvents}
            viewModeRender={agendaViewModeRender}
            setShowAddModal={setShowAddModal}
            setShowSearchModal={setShowSearchModal}
            handleIcsUpload={handleIcsUpload}
            importIcsLoading={importIcs.status === "pending"}
            exportIcs={exportIcs}
            handleDeleteEvent={handleDeleteEvent}
            openEditModal={openEditModal}
            setViewModeDay={() => setSelectedDate(new Date())}
            shiftDate={shiftDate}
            handleSendChat={() => handleSendChat()}
            chatSummary={chatSummary}
            chatTone={chatTone}
            setChatTone={setChatTone}
            chatHistory={chatHistory}
            chatInput={chatInput}
            setChatInput={setChatInput}
            clarifyPrompt={clarifyPrompt}
            pendingMessage={pendingMessage}
            confirmSendPending={confirmSendPending}
            setClarifyPrompt={setClarifyPrompt}
            setPendingMessage={setPendingMessage}
            summaryText={summaryText}
            chatMutationLoading={chatMutation.status === "pending"}
          />
        )}

        {(isDashboard || view === "study") && (
          <StudyView
            token={token}
            setActionStatus={(msg) => setActionStatus(msg)}
            studySubjects={studySubjects}
            studySubjectsFetching={studySubjectsQuery.isFetching}
            newSubjectName={newSubjectName}
            setNewSubjectName={setNewSubjectName}
            newSubjectUe={newSubjectUe}
            setNewSubjectUe={setNewSubjectUe}
            newSubjectDesc={newSubjectDesc}
            setNewSubjectDesc={setNewSubjectDesc}
            onCreateSubject={() => createStudySubject.mutate()}
            createSubjectLoading={createStudySubject.status === "pending"}
            onUpdateSubject={(payload) => updateStudySubject.mutate(payload)}
            onDeleteSubject={(id) => deleteStudySubject.mutate(id)}
            planSubjectId={planSubjectId}
            setPlanSubjectId={setPlanSubjectId}
            planTopics={planTopics}
            setPlanTopics={setPlanTopics}
            planExamDate={planExamDate}
            setPlanExamDate={setPlanExamDate}
            planSessionsPerDay={planSessionsPerDay}
            setPlanSessionsPerDay={setPlanSessionsPerDay}
            planSessionMinutes={planSessionMinutes}
            setPlanSessionMinutes={setPlanSessionMinutes}
            onGeneratePlan={() => generateStudyPlan.mutate()}
            generatePlanLoading={generateStudyPlan.status === "pending"}
            studyPlans={studyPlans}
            onUpdatePlan={(payload) => updateStudyPlan.mutate(payload)}
            onDeletePlan={(id) => deleteStudyPlan.mutate(id)}
            studySessionsDue={studySessionsDue}
            studySessionsDueFetching={studySessionsDueQuery.isFetching}
            onUpdateSession={(payload) => updateStudySession.mutate(payload)}
            newCardSubjectId={newCardSubjectId}
            setNewCardSubjectId={setNewCardSubjectId}
            newCardFront={newCardFront}
            setNewCardFront={setNewCardFront}
            newCardBack={newCardBack}
            setNewCardBack={setNewCardBack}
            onCreateCard={(payload) => createStudyCard.mutate(payload)}
            createCardLoading={createStudyCard.status === "pending"}
            studyCardsDue={studyCardsDue}
            studyCardsDueFetching={studyCardsDueQuery.isFetching}
            onReviewCard={(payload) => reviewStudyCard.mutate(payload)}
            assistSubject={assistSubject}
            setAssistSubject={setAssistSubject}
            assistTopic={assistTopic}
            setAssistTopic={setAssistTopic}
            assistContent={assistContent}
            setAssistContent={setAssistContent}
            assistMode={assistMode}
            setAssistMode={setAssistMode}
            assistDifficulty={assistDifficulty}
            setAssistDifficulty={setAssistDifficulty}
            assistItems={assistItems}
            setAssistItems={setAssistItems}
            onRunAssist={() => runStudyAssist.mutate()}
            runAssistLoading={runStudyAssist.status === "pending"}
            assistOutput={assistOutput ?? ""}
          />
        )}

        {(isDashboard || view === "tasks-projects") && <TasksAndProjectsSection />}

        {(isDashboard || view === "links") && (
          <LinksView
            synthScope={synthScope}
            setSynthScope={setSynthScope}
            copySummary={copySummary}
            shareSummary={shareSummary}
            quickAction={quickAction}
            synthLoadHours={synthLoadHours}
            synthOpenTasks={synthOpenTasks}
            overdueCount={overdueTasks.length}
            nextEvents={nextEvents}
            alertsFeed={alertsFeed}
            timelineNext={timelineNext}
            synthActions={synthActions}
            quickLinks={quickLinks}
            showQuickLinkForm={showQuickLinkForm}
            setShowQuickLinkForm={setShowQuickLinkForm}
            newLinkTitle={newLinkTitle}
            newLinkUrl={newLinkUrl}
            setNewLinkTitle={setNewLinkTitle}
            setNewLinkUrl={setNewLinkUrl}
            addQuickLink={addQuickLink}
            removeQuickLink={removeQuickLink}
            editQuickLink={editQuickLink}
            showQuickLinkModal={showQuickLinkModal}
            cancelQuickLink={cancelQuickLink}
            editLinkTitle={editLinkTitle}
            setEditLinkTitle={setEditLinkTitle}
            editLinkUrl={editLinkUrl}
            setEditLinkUrl={setEditLinkUrl}
            saveQuickLink={saveQuickLink}
            faviconUrl={faviconUrl}
          />
        )}

        {activeProject ? (
          <ProjectModal
            project={activeProject}
            tasks={tasksByProject[String(activeProject.id)] ?? []}
            onClose={() => setActiveProject(null)}
            onMoveTask={(taskId, status) => updateTaskStatus.mutate({ taskId, status })}
            onPlanTask={(task) => planTaskToEvent(task)}
            onUpdateMilestones={(milestones) => updateProjectMilestones.mutate({ projectId: activeProject.id, milestones })}
            savingMilestones={updateProjectMilestones.status === "pending"}
            onAddTask={(title, deadline) => createProjectTask.mutate({ projectId: activeProject.id, title, deadline })}
            savingTask={createProjectTask.status === "pending"}
            onDeleteTask={(taskId) => handleDeleteTask(taskId)}
            onUpdateMeta={(data) => updateProjectMeta.mutate({ projectId: activeProject.id, data })}
            savingMeta={updateProjectMeta.status === "pending"}
            onDeleteProject={() => deleteProjectMutation.mutate(activeProject.id)}
            deletingProject={deleteProjectMutation.status === "pending"}
          />
        ) : null}

        {showCreateProjectModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowCreateProjectModal(false)} />
            <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl shadow-slate-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Nouveau projet</p>
                  <h4 className="text-lg font-semibold text-slate-900">Créer un projet</h4>
                </div>
                <button onClick={() => setShowCreateProjectModal(false)} className="rounded-md px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  Fermer
                </button>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Nom du projet"
                    className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700">
                    %
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newProjectProgress}
                      onChange={(e) => setNewProjectProgress(e.target.value)}
                      className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs"
                    />
                  </label>
                </div>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Décrire le projet"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                />
                <textarea
                  value={newProjectObjectives}
                  onChange={(e) => setNewProjectObjectives(e.target.value)}
                  placeholder="Objectifs (séparés par virgule ou nouvelle ligne)"
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <textarea
                    value={newProjectSubgoals}
                    onChange={(e) => setNewProjectSubgoals(e.target.value)}
                    placeholder="Sous-objectifs / jalons internes"
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                    rows={3}
                  />
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                      <input
                        type="text"
                        value={newBlockerTitle}
                        onChange={(e) => setNewBlockerTitle(e.target.value)}
                        placeholder="Titre du blocage"
                        className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                      />
                      <select
                        value={newBlockerStatus}
                        onChange={(e) => setNewBlockerStatus(e.target.value)}
                        className="rounded-md border border-slate-200 px-2 py-2 text-sm"
                      >
                        {blockerStatusOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          if (!newBlockerTitle.trim()) return;
                          const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
                          setNewProjectBlockers((prev) => [...prev, { id, title: newBlockerTitle.trim(), status: newBlockerStatus }]);
                          setNewBlockerTitle("");
                          setNewBlockerStatus("ouvert");
                        }}
                        className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                      >
                        Ajouter
                      </button>
                    </div>
                    {newProjectBlockers.length ? (
                      <div className="space-y-2 rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700">
                        {newProjectBlockers.map((b) => (
                          <div key={b.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1">
                            <span className="font-semibold text-slate-900">{b.title}</span>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold">{b.status}</span>
                              <button
                                onClick={() => setNewProjectBlockers((prev) => prev.filter((x) => x.id !== b.id))}
                                className="text-[11px] font-semibold text-rose-700 hover:underline"
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">Ajoutez vos blocages connus.</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                  <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700">
                    Échéance globale
                    <input
                      type="date"
                      value={newProjectDueDate}
                      onChange={(e) => setNewProjectDueDate(e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                  <button
                    onClick={() => setShowNewProjectMilestoneModal(true)}
                    className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter un jalon
                  </button>
                  {newProjectMilestones.length ? (
                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">
                      {newProjectMilestones.length} jalon(s) en brouillon
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">Aucun jalon ajouté.</span>
                  )}
                </div>
                {newProjectMilestones.length ? (
                  <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700 max-h-48 overflow-auto">
                    {newProjectMilestones.map((m) => (
                      <div key={m.id || m.title} className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{m.title}</span>
                          <span className="text-[10px] text-slate-500">{m.start} → {m.end}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {m.level ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold">{m.level}</span> : null}
                          <button onClick={() => removeNewMilestone(m.id || m.title)} className="text-[10px] font-semibold text-rose-600 hover:underline">
                            Suppr.
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateProjectModal(false)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => createProject.mutate()}
                  disabled={!newProjectName || createProject.status === "pending"}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {createProject.status === "pending" ? "Ajout..." : "Créer"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showNewProjectMilestoneModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowNewProjectMilestoneModal(false)} />
            <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl shadow-slate-300">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Nouveau jalon projet</p>
                  <h4 className="text-lg font-semibold text-slate-900">Ajouter un jalon au projet en cours de création</h4>
                </div>
                <button onClick={() => setShowNewProjectMilestoneModal(false)} className="rounded-md px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                  Fermer
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600">Titre</label>
                  <input
                    type="text"
                    value={newMilestoneTitle}
                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Ex: Phase de design"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600">Début</label>
                  <input
                    type="date"
                    value={newMilestoneStart}
                    onChange={(e) => setNewMilestoneStart(e.target.value)}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-semibold text-slate-600">Fin</label>
                  <input
                    type="date"
                    value={newMilestoneEnd}
                    onChange={(e) => setNewMilestoneEnd(e.target.value)}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-600">Niveau</label>
                  <select
                    value={newMilestoneLevel}
                    onChange={(e) => setNewMilestoneLevel(e.target.value)}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Non spécifié</option>
                    <option value="Haut">Haut</option>
                    <option value="Moyen">Moyen</option>
                    <option value="Bas">Bas</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setShowNewProjectMilestoneModal(false)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    const ok = addNewMilestone();
                    if (ok) setShowNewProjectMilestoneModal(false);
                  }}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Ajouter le jalon
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {editingEvent ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setEditingEvent(null)} />
            <div className="relative z-10 mt-20 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl shadow-slate-300">
              <h3 className="text-lg font-semibold text-slate-900">Modifier l&apos;événement</h3>
              <p className="mt-1 text-xs text-slate-600">
                {formatTime(editingEvent.start)} – {formatTime(editingEvent.end)}
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Titre"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Début</label>
                    <input
                      type="datetime-local"
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Fin</label>
                    <input
                      type="datetime-local"
                      value={editEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <input type="checkbox" checked={editAllDay} onChange={(e) => setEditAllDay(e.target.checked)} />
                    Toute la journée
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                    <input type="checkbox" checked={editImportant} onChange={(e) => setEditImportant(e.target.checked)} />
                    Important
                  </label>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Note</label>
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Notes ou lien visio"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="min-h-[80px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Détails"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Lieu</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">URL</label>
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <label className="text-xs font-semibold text-slate-600">Couleur</label>
                  <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Catégorie</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    {eventCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Pièces jointes</label>
                  <textarea
                    value={editAttachments}
                    onChange={(e) => setEditAttachments(e.target.value)}
                    className="min-h-[60px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Une URL par ligne"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Récurrence</label>
                    <select
                      value={editRecurrence}
                      onChange={(e) => setEditRecurrence(e.target.value as typeof editRecurrence)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">Non récurrent</option>
                      <option value="daily">Quotidien</option>
                      <option value="weekly">Hebdomadaire</option>
                      <option value="monthly">Mensuel</option>
                      <option value="yearly">Annuel</option>
                      <option value="custom">Personnalisé</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Jusqu&apos;au</label>
                    <input
                      type="datetime-local"
                      value={editUntil}
                      onChange={(e) => setEditUntil(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                {editRecurrence ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-600">Intervalle</label>
                      <input
                        type="number"
                        min={1}
                        value={editRecurrenceInterval}
                        onChange={(e) => setEditRecurrenceInterval(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    {editRecurrence === "custom" ? (
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-slate-600">Règle personnalisée</label>
                        <input
                          type="text"
                          value={editRecurrenceCustom}
                          onChange={(e) => setEditRecurrenceCustom(e.target.value)}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => handleDeleteEvent(editingEvent.id)}
                  disabled={agendaDeleteEvent.status === "pending"}
                  className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-60"
                >
                  {agendaDeleteEvent.status === "pending" ? "Suppression..." : "Supprimer"}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingEvent(null)}
                    className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={submitEdit}
                    disabled={!editTitle || !editStart || !editEnd || updateEvent.status === "pending"}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showAddModal && token ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowAddModal(false)} />
            <div className="relative z-10 mt-16 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl shadow-slate-300">
              <h3 className="text-lg font-semibold text-slate-900">Ajouter un événement</h3>
              <div className="mt-4 grid gap-3 text-sm text-slate-800 md:grid-cols-2">
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Titre"
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
                <input
                  type="text"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  placeholder="Lieu (Google Maps)"
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
                <input
                  type="datetime-local"
                  value={newEventStart}
                  onChange={(e) => setNewEventStart(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
                <input
                  type="datetime-local"
                  value={newEventEnd}
                  onChange={(e) => setNewEventEnd(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
                <input
                  type="url"
                  value={newEventUrl}
                  onChange={(e) => setNewEventUrl(e.target.value)}
                  placeholder="URL associée"
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
                <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                  <label className="text-xs font-semibold text-slate-600">Couleur</label>
                  <input type="color" value={newEventColor} onChange={(e) => setNewEventColor(e.target.value)} />
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={newEventAllDay} onChange={(e) => setNewEventAllDay(e.target.checked)} />
                    Toute la journée
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-amber-700">
                    <input type="checkbox" checked={newEventImportant} onChange={(e) => setNewEventImportant(e.target.checked)} />
                    Important
                  </label>
                </div>
                <select
                  value={newEventCategory}
                  onChange={(e) => setNewEventCategory(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  {eventCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <textarea
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  placeholder="Description"
                  className="rounded-md border border-slate-200 px-3 py-2 md:col-span-2"
                />
                <textarea
                  value={newEventNote}
                  onChange={(e) => setNewEventNote(e.target.value)}
                  placeholder="Notes"
                  className="rounded-md border border-slate-200 px-3 py-2 md:col-span-2"
                />
                <textarea
                  value={newEventAttachments}
                  onChange={(e) => setNewEventAttachments(e.target.value)}
                  placeholder="Pièces jointes (une URL par ligne)"
                  className="rounded-md border border-slate-200 px-3 py-2 md:col-span-2"
                />
                <div className="flex flex-col gap-2 rounded-md border border-slate-200 px-3 py-2 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-600">Récurrence</label>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={newEventRecurrence}
                      onChange={(e) => setNewEventRecurrence(e.target.value as typeof newEventRecurrence)}
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">Non récurrent</option>
                      <option value="daily">Quotidien</option>
                      <option value="weekly">Hebdomadaire</option>
                      <option value="monthly">Mensuel</option>
                      <option value="yearly">Annuel</option>
                      <option value="custom">Personnalisé</option>
                    </select>
                    {newEventRecurrence ? (
                      <input
                        type="number"
                        min={1}
                        value={newEventRecurrenceInterval}
                        onChange={(e) => setNewEventRecurrenceInterval(e.target.value)}
                        className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Intervalle"
                      />
                    ) : null}
                    {newEventRecurrence === "custom" ? (
                      <input
                        type="text"
                        value={newEventRecurrenceCustom}
                        onChange={(e) => setNewEventRecurrenceCustom(e.target.value)}
                        className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                        placeholder="Règle personnalisée"
                      />
                    ) : null}
                    <input
                      type="datetime-local"
                      value={newEventUntil}
                      onChange={(e) => setNewEventUntil(e.target.value)}
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Fin récurrence"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    createEvent.mutate();
                    setShowAddModal(false);
                  }}
                  disabled={!newEventTitle || !newEventStart || !newEventEnd || createEvent.status === "pending"}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showTaskModal && token ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowTaskModal(false)} />
            <div className="relative z-10 mt-16 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl shadow-slate-300">
              <h3 className="text-lg font-semibold text-slate-900">Nouvelle tâche</h3>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-800">
                <div className="grid gap-2 md:grid-cols-3">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Titre"
                    className="rounded-md border border-slate-200 px-3 py-2"
                  />
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                    className="rounded-md border border-slate-200 px-3 py-2"
                  >
                    <option value="basse">Basse</option>
                    <option value="normale">Normale</option>
                    <option value="haute">Haute</option>
                  </select>
                  <input
                    type="datetime-local"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="rounded-md border border-slate-200 px-3 py-2"
                  />
                </div>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Description"
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
                <div className="grid gap-2 md:grid-cols-4">
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(e.target.value)}
                    placeholder="Durée (min)"
                    className="rounded-md border border-slate-200 px-3 py-2"
                  />
                  <input
                    type="text"
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    placeholder="Catégorie"
                    className="rounded-md border border-slate-200 px-3 py-2"
                  />
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={newTaskEnergy}
                    onChange={(e) => setNewTaskEnergy(e.target.value)}
                    placeholder="Énergie (0-10)"
                    className="rounded-md border border-slate-200 px-3 py-2"
                  />
                  <select
                    value={newTaskProjectId}
                    onChange={(e) => setNewTaskProjectId(e.target.value)}
                    className="rounded-md border border-slate-200 px-3 py-2"
                  >
                    <option value="">Projet (optionnel)</option>
                    {(projectsData ?? demoProjects).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <input
                    type="number"
                    value={newTaskParentId}
                    onChange={(e) => setNewTaskParentId(e.target.value)}
                    placeholder="Parent ID (sous-tâche)"
                    className="rounded-md border border-slate-200 px-3 py-2"
                  />
                  <input
                    type="text"
                    value={newTaskDependencies}
                    onChange={(e) => setNewTaskDependencies(e.target.value)}
                    placeholder="Dépendances (IDs, virgules)"
                    className="rounded-md border border-slate-200 px-3 py-2"
                  />
                  <input
                    type="number"
                    value={newTaskOrder}
                    onChange={(e) => setNewTaskOrder(e.target.value)}
                    placeholder="Ordre"
                    className="rounded-md border border-slate-200 px-3 py-2"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  onClick={() => createTask.mutate()}
                  disabled={!newTaskTitle || createTask.status === "pending"}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  Créer la tâche
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showSearchModal ? (
          <div className="fixed inset-0 z-50 flex items-start justify-center">
            <div className="absolute inset-0 bg-slate-900/40" onClick={() => setShowSearchModal(false)} />
            <div className="relative z-10 mt-24 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl shadow-slate-300">
              <h3 className="text-lg font-semibold text-slate-900">Rechercher un événement</h3>
              <div className="mt-4 flex flex-col gap-3 text-sm text-slate-800">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Titre, note, lieu..."
                  className="rounded-md border border-slate-200 px-3 py-2"
                />
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs">
                    <input
                      type="checkbox"
                      checked={filterImportant}
                      onChange={(e) => setFilterImportant(e.target.checked)}
                    />
                    Important seulement
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs">
                    <input
                      type="checkbox"
                      checked={filterTypes.fixe}
                      onChange={(e) => setFilterTypes((f) => ({ ...f, fixe: e.target.checked }))}
                    />
                    Fixes
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs">
                    <input
                      type="checkbox"
                      checked={filterTypes.propose}
                      onChange={(e) => setFilterTypes((f) => ({ ...f, propose: e.target.checked }))}
                    />
                    Proposés
                  </label>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Résultats (recherche floue)</p>
                {searchQuery.trim() ? (
                  searchResults.length ? (
                    searchResults.map((evt) => (
                      <button
                        key={evt.id}
                        onClick={() => {
                          openEditModal(evt);
                          setShowSearchModal(false);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm transition hover:border-slate-300 hover:bg-slate-100"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: evt.color || "#3b82f6" }} />
                          <div className="flex-1">
                            <p className="font-semibold text-slate-900">{evt.title}</p>
                            <p className="text-xs text-slate-600">{formatDateRange(evt.start, evt.end, evt.isAllDay)}</p>
                            {evt.location ? <p className="text-[11px] text-slate-500">📍 {evt.location}</p> : null}
                          </div>
                          {evt.important ? (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">★</span>
                          ) : null}
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">Aucun résultat pour cette requête.</p>
                  )
                ) : (
                  <p className="text-xs text-slate-500">Saisissez un terme pour lancer la recherche floue.</p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TaskRow({ task, onDone, onDelete }: { task: Task; onDone?: () => void; onDelete?: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <StatusDot status={task.status} />
        <div>
          <p className="text-sm font-medium text-slate-900">{task.title}</p>
          <p className="text-xs text-slate-500">{task.projectName ?? (task.projectId ? `Projet ${task.projectId}` : "Indépendant")}</p>
          {task.category ? <p className="text-[11px] text-slate-500">Catégorie · {task.category}</p> : null}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <PriorityBadge priority={task.priority} />
        {task.deadline ? <span>Échéance {formatTime(task.deadline)}</span> : null}
        {task.durationMinutes ? <span>{task.durationMinutes} min</span> : null}
        {typeof task.energy === "number" ? <span>Énergie {task.energy}</span> : null}
        {onDone && task.status !== "terminee" ? (
          <button onClick={onDone} className="text-xs font-semibold text-emerald-700 underline underline-offset-2">
            Marquer fait
          </button>
        ) : null}
        {onDelete ? (
          <button onClick={onDelete} className="text-xs font-semibold text-rose-700 underline underline-offset-2">
            Supprimer
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AgendaItem({ event, onEdit, onDelete }: { event: AgendaEvent; onEdit?: () => void; onDelete?: () => void }) {
  const staticMap = event.location ? staticMapUrl(event.location) : null;
  return (
    <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className="mt-1 h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: event.color || "#3b82f6" }}
        />
        <div>
          <p className="text-sm font-medium text-slate-900">{event.title}</p>
          <p className="text-xs text-slate-600">
            {event.isAllDay ? "Toute la journée" : `${formatTime(event.start)} – ${formatTime(event.end)}`}
          </p>
          {event.note ? <p className="mt-1 text-xs text-slate-500">{event.note}</p> : null}
          {event.location ? (
            <a
              className="text-xs text-slate-500 hover:text-blue-700 hover:underline"
              href={mapsUrl(event.location)}
              target="_blank"
              rel="noreferrer"
            >
              📍 {event.location}
            </a>
          ) : null}
          {event.url ? (
            <a className="text-xs text-blue-700 underline" href={event.url} target="_blank" rel="noreferrer">
              Ouvrir le lien
            </a>
          ) : null}
          {staticMap ? (
            <a href={mapsUrl(event.location!)} target="_blank" rel="noreferrer" className="mt-2 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={staticMap}
                alt={`Carte pour ${event.location}`}
                className="h-28 w-48 rounded-lg border border-slate-200 object-cover shadow-sm"
                loading="lazy"
              />
            </a>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-700">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
          {event.type === "fixe" ? "Fixe" : "Proposé par l&apos;IA"}
        </span>
        {event.important ? <span className="rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-700">★ Important</span> : null}
        {event.recurrence ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700">
            {event.recurrence === "daily"
              ? "Quotidien"
              : event.recurrence === "weekly"
                ? "Hebdomadaire"
                : event.recurrence === "monthly"
                  ? "Mensuel"
                  : event.recurrence === "yearly"
                    ? "Annuel"
                    : "Récurrent"}
          </span>
        ) : null}
        {onEdit ? (
          <button className="underline underline-offset-2" onClick={onEdit}>
            Modifier
          </button>
        ) : null}
        {onDelete ? (
          <button className="underline underline-offset-2 text-rose-700" onClick={onDelete}>
            Supprimer
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CalendarGrid({
  focusDate,
  events,
  onSelect,
}: {
  focusDate: Date;
  events: AgendaEvent[];
  onSelect: (d: Date) => void;
}) {
  const [month, setMonth] = useState<Date>(new Date(focusDate));
  const grid = buildMonthGrid(month, events);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-800">
        <button
          className="rounded-md border border-slate-200 px-2 py-1 text-xs"
          onClick={() => setMonth(addMonths(month, -1))}
        >
          ◀
        </button>
        <span>
          {month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </span>
        <button
          className="rounded-md border border-slate-200 px-2 py-1 text-xs"
          onClick={() => setMonth(addMonths(month, 1))}
        >
          ▶
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500">
        {"LMMJVSD".split("").map((d, idx) => (
          <div key={`${d}-${idx}`}>{d}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2 text-center text-sm">
        {grid.map((cell) => (
          <button
            key={cell.key}
            onClick={() => onSelect(cell.date)}
            className={`flex h-14 flex-col items-center justify-center rounded-md border text-slate-800 transition ${
              isSameDay(cell.date, focusDate)
                ? "border-slate-900 bg-slate-900 text-white"
                : cell.inMonth
                  ? "border-slate-200 bg-white hover:border-slate-300"
                  : "border-slate-100 bg-slate-50 text-slate-400"
            }`}
          >
            <span className="text-xs font-semibold">{cell.date.getDate()}</span>
            <span className="mt-1 flex gap-1">
              {cell.events.slice(0, 3).map((_, idx) => (
                <span key={idx} className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              ))}
              {cell.events.length > 3 ? <span className="text-[10px] font-semibold">+{cell.events.length - 3}</span> : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function WeekView({ focusDate, events, onEdit, onDelete }: { focusDate: Date; events: AgendaEvent[]; onEdit: (e: AgendaEvent) => void; onDelete?: (id: string) => void }) {
  const start = startOfWeek(focusDate);
  const days = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(start);
    d.setDate(start.getDate() + idx);
    const dayEvents = events.filter((e) => isSameDay(new Date(e.start), d));
    return { date: d, events: dayEvents };
  });

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {days.map((day) => (
        <div key={day.date.toISOString()} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-semibold text-slate-700">
            {day.date.toLocaleDateString("fr-FR", { weekday: "long", month: "short", day: "numeric" })}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {day.events.length ? (
              day.events.map((evt) => (
                <AgendaItem key={evt.id} event={evt} onEdit={() => onEdit(evt)} onDelete={onDelete ? () => onDelete(evt.id) : undefined} />
              ))
            ) : (
              <p className="text-xs text-slate-500">Aucun événement</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function YearView({ focusDate, events, onSelect }: { focusDate: Date; events: AgendaEvent[]; onSelect: (d: Date) => void }) {
  const year = focusDate.getFullYear();
  const months = Array.from({ length: 12 }).map((_, m) => {
    const base = new Date(year, m, 1);
    const inMonth = events.filter((e) => isSameMonth(new Date(e.start), base));
    return { month: base, events: inMonth };
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {months.map((m) => (
        <button
          key={m.month.getMonth()}
          onClick={() => onSelect(m.month)}
          className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-slate-300"
        >
          <span className="text-sm font-semibold text-slate-800">
            {m.month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
          </span>
          <span className="text-xs text-slate-600">{m.events.length} événement(s)</span>
        </button>
      ))}
    </div>
  );
}

function ListView({ events, onEdit, onDelete }: { events: AgendaEvent[]; onEdit: (e: AgendaEvent) => void; onDelete?: (id: string) => void }) {
  const sorted = sortEvents(events);
  return sorted.length ? (
    <div className="flex flex-col gap-2">
      {sorted.map((evt) => (
        <AgendaItem key={evt.id} event={evt} onEdit={() => onEdit(evt)} onDelete={onDelete ? () => onDelete(evt.id) : undefined} />
      ))}
    </div>
  ) : (
    <p className="text-sm text-slate-600">Aucun événement.</p>
  );
}

function ProjectRow({ project, tasks, onOpen, onResolveBlocker }: { project: Project; tasks: Task[]; onOpen: () => void; onResolveBlocker?: (blockerId: string) => void }) {
  const columns = buildKanban(tasks);
  const health = computeProjectHealth(project.progress, tasks, project.due_date, project.blockers);
  const dueLabel = project.due_date ? new Date(project.due_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : null;
  const blockersCount = project.blockers?.length ?? 0;
  const objectivesCount = project.objectives?.length ?? 0;
  const subgoalCount = project.subgoals?.length ?? 0;

  return (
    <button
      onClick={onOpen}
      className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{project.name}</p>
        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${health.badge}`}>{health.label}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${project.progress}%` }} />
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
        <span>{project.progress}% complété</span>
        <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
        <span>{tasks.filter((t) => t.status !== "terminee").length} tâches ouvertes</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
        {dueLabel ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 font-semibold text-slate-800">
            <Timer className="h-3 w-3" /> Échéance {dueLabel}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 font-semibold text-slate-700">Sans échéance</span>
        )}
        <span className="inline-flex items-center rounded-full bg-white px-2 py-1 font-semibold text-slate-700">{objectivesCount} objectif(s)</span>
        <span className="inline-flex items-center rounded-full bg-white px-2 py-1 font-semibold text-slate-700">{subgoalCount} sous-objectif(s)</span>
        <span className="inline-flex items-center rounded-full bg-white px-2 py-1 font-semibold text-slate-700">{blockersCount} blocage(s)</span>
        {project.blockers?.length ? (
          <span className="flex flex-wrap gap-1">
            {project.blockers.slice(0, 3).map((b, idx) => {
              const key = b.id || `${b.title}-${idx}`;
              const isResolved = (b.status || "").toLowerCase().includes("res");
              return (
                <span
                  key={key}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${isResolved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                >
                  {b.title}
                  {b.status ? <span className="rounded bg-white px-1 py-px text-[9px] font-semibold text-slate-700">{b.status}</span> : null}
                  {!isResolved && onResolveBlocker ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onResolveBlocker(key);
                      }}
                      className="rounded bg-white px-1 py-px text-[9px] font-semibold text-emerald-700 hover:bg-emerald-50"
                    >
                      Résoudre
                    </button>
                  ) : null}
                </span>
              );
            })}
            {project.blockers.length > 3 ? <span className="text-[10px] font-semibold text-slate-500">+{project.blockers.length - 3}</span> : null}
          </span>
        ) : null}
      </div>
      {project.description ? <p className="mt-2 text-[11px] text-slate-600">{project.description}</p> : null}
      {project.milestones?.length ? (
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600">
          {project.milestones.slice(0, 3).map((m) => (
            <span key={m} className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              {m}
            </span>
          ))}
          {project.milestones.length > 3 ? <span className="text-[11px] font-semibold text-slate-500">+{project.milestones.length - 3}</span> : null}
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
        {(["a_faire", "en_cours", "terminee"] as const).map((col) => (
          <span key={col} className="flex items-center justify-between rounded-md bg-slate-50 px-2 py-1">
            <span className="font-semibold">{kanbanLabel(col)}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700">{columns[col].length}</span>
          </span>
        ))}
      </div>
    </button>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";
  return (
    <div
      className={`flex flex-col gap-1 rounded-lg px-3 py-2 ${
        isAssistant ? "bg-slate-900 text-white" : "bg-white text-slate-800 border border-slate-200"
      }`}
    >
      <span className="text-xs font-semibold opacity-70">{isAssistant ? "Agent" : "Moi"}</span>
      <p className="text-sm leading-relaxed">{message.content}</p>
    </div>
  );
}

function ProjectModal({
  project,
  tasks,
  onClose,
  onMoveTask,
  onPlanTask,
  onUpdateMilestones,
  onAddTask,
  onDeleteTask,
  onUpdateMeta,
  onDeleteProject,
  savingTask = false,
  savingMilestones = false,
  savingMeta = false,
  deletingProject = false,
}: {
  project: Project;
  tasks: Task[];
  onClose: () => void;
  onMoveTask: (taskId: string, status: Task["status"]) => void;
  onPlanTask: (task: Task) => void;
  onUpdateMilestones: (milestones: ProjectMilestone[]) => void;
  onAddTask: (title: string, deadline?: string) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateMeta: (data: Partial<Project>) => void;
  onDeleteProject: () => void;
  savingTask?: boolean;
  savingMilestones?: boolean;
  savingMeta?: boolean;
  deletingProject?: boolean;
}) {
  const [kanbanColumns, setKanbanColumns] = useState(buildKanban(tasks));
  useEffect(() => {
    setKanbanColumns(buildKanban(tasks));
  }, [tasks]);

  const [metaDescription, setMetaDescription] = useState(project.description ?? "");
  const [metaObjectives, setMetaObjectives] = useState((project.objectives ?? []).join("\n"));
  const [metaDueDate, setMetaDueDate] = useState(project.due_date ?? "");
  const [metaSubgoals, setMetaSubgoals] = useState((project.subgoals ?? []).join("\n"));
  const [metaBlockers, setMetaBlockers] = useState<ProjectBlocker[]>(project.blockers ?? []);
  const [metaBlockerTitle, setMetaBlockerTitle] = useState("");
  const [metaBlockerStatus, setMetaBlockerStatus] = useState("ouvert");

  useEffect(() => {
    setMetaDescription(project.description ?? "");
    setMetaObjectives((project.objectives ?? []).join("\n"));
    setMetaDueDate(project.due_date ?? "");
    setMetaSubgoals((project.subgoals ?? []).join("\n"));
    setMetaBlockers(project.blockers ?? []);
    setMetaBlockerTitle("");
    setMetaBlockerStatus("ouvert");
  }, [project.id, project.description, project.objectives, project.due_date, project.subgoals, project.blockers]);

  const health = computeProjectHealth(project.progress, tasks, project.due_date, project.blockers);
  const milestones = project.milestones ?? [];
  const milestonesDated = useMemo(() => project.milestones_dates ?? [], [project.milestones_dates]);
  const [editableMilestones, setEditableMilestones] = useState<ProjectMilestone[]>(milestonesDated);
  const [draftMilestoneTitle, setDraftMilestoneTitle] = useState("");
  const [draftMilestoneStart, setDraftMilestoneStart] = useState("");
  const [draftMilestoneEnd, setDraftMilestoneEnd] = useState("");
  const [draftMilestoneLevel, setDraftMilestoneLevel] = useState("");
  const [projectTaskTitle, setProjectTaskTitle] = useState("");
  const [projectTaskDeadline, setProjectTaskDeadline] = useState("");
  const [milestoneError, setMilestoneError] = useState<string | null>(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [showEditMilestoneModal, setShowEditMilestoneModal] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMilestoneTitle, setEditMilestoneTitle] = useState("");
  const [editMilestoneStart, setEditMilestoneStart] = useState("");
  const [editMilestoneEnd, setEditMilestoneEnd] = useState("");
  const [editMilestoneLevel, setEditMilestoneLevel] = useState("");
  useEffect(() => {
    setEditableMilestones(milestonesDated);
    setDraftMilestoneTitle("");
    setDraftMilestoneStart("");
    setDraftMilestoneEnd("");
    setDraftMilestoneLevel("");
    setMilestoneError(null);
    setShowMilestoneModal(false);
    setShowEditMilestoneModal(false);
    setEditingMilestoneId(null);
  }, [project.id, milestonesDated]);
  const apiRisks = (project.risks ?? []).map((risk) => ({
    ...risk,
    badge: riskBadgeClass(risk.level),
  }));
  const risks = apiRisks.length ? apiRisks : buildRisks(project, tasks);
  const decisions = (project.decisions ?? []).length ? (project.decisions ?? []) : buildDecisions(project);
  const notifications = (project.notifications ?? []).length ? (project.notifications ?? []) : buildNotifications(project, milestones, tasks);
  const sortedMilestones = milestones.slice().sort((a, b) => a.localeCompare(b));

  const addDraftMilestone = () => {
    if (!draftMilestoneTitle || !draftMilestoneStart || !draftMilestoneEnd) {
      setMilestoneError("Titre, début et fin sont requis.");
      return false;
    }
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setEditableMilestones((prev) => [
      ...prev,
      {
        id,
        title: draftMilestoneTitle,
        start: draftMilestoneStart,
        end: draftMilestoneEnd,
        level: draftMilestoneLevel || undefined,
      },
    ]);
    setDraftMilestoneTitle("");
    setDraftMilestoneStart("");
    setDraftMilestoneEnd("");
    setDraftMilestoneLevel("");
    setMilestoneError(null);
    return true;
  };

  const removeMilestone = (id: string) => {
    setEditableMilestones((prev) => prev.filter((m) => (m.id || m.title) !== id));
  };

  const saveMilestones = () => {
    const invalid = editableMilestones.some((m) => !m.title || !m.start || !m.end);
    if (invalid) {
      setMilestoneError("Chaque jalon doit avoir un titre, un début et une fin.");
      return;
    }
    setMilestoneError(null);
    onUpdateMilestones(editableMilestones);
  };

  const openEditMilestone = (m: ProjectMilestone) => {
    setEditingMilestoneId(m.id || m.title);
    setEditMilestoneTitle(m.title || "");
    setEditMilestoneStart(m.start || "");
    setEditMilestoneEnd(m.end || "");
    setEditMilestoneLevel(m.level || "");
    setMilestoneError(null);
    setShowEditMilestoneModal(true);
  };

  const saveEditedMilestone = () => {
    if (!editingMilestoneId || !editMilestoneTitle || !editMilestoneStart || !editMilestoneEnd) {
      setMilestoneError("Titre, début et fin sont requis.");
      return;
    }
    setEditableMilestones((prev) =>
      prev.map((m) =>
        (m.id || m.title) === editingMilestoneId
          ? { ...m, title: editMilestoneTitle, start: editMilestoneStart, end: editMilestoneEnd, level: editMilestoneLevel || undefined }
          : m,
      ),
    );
    setShowEditMilestoneModal(false);
    setEditingMilestoneId(null);
  };

  const deleteEditedMilestone = () => {
    if (!editingMilestoneId) return;
    removeMilestone(editingMilestoneId);
    setShowEditMilestoneModal(false);
    setEditingMilestoneId(null);
  };

  const parseList = (value: string) =>
    value
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

  const saveMeta = () => {
    onUpdateMeta({
      description: metaDescription || undefined,
      objectives: parseList(metaObjectives),
      due_date: metaDueDate || undefined,
      subgoals: parseList(metaSubgoals),
      blockers: metaBlockers,
    });
  };

  const blockersCount = (project.blockers ?? metaBlockers).length;
  const addMetaBlocker = () => {
    if (!metaBlockerTitle.trim()) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    setMetaBlockers((prev) => [...prev, { id, title: metaBlockerTitle.trim(), status: metaBlockerStatus }]);
    setMetaBlockerTitle("");
    setMetaBlockerStatus("ouvert");
  };

  const updateMetaBlockerStatus = (id: string, status: string) => {
    setMetaBlockers((prev) => prev.map((b) => (b.id === id || (!b.id && b.title === id) ? { ...b, status } : b)));
  };

  const removeMetaBlocker = (id: string) => {
    setMetaBlockers((prev) => prev.filter((b) => (b.id ?? b.title) !== id));
  };
  const kanbanOrder: Task["status"][] = ["a_faire", "en_cours", "terminee"];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative z-10 mt-16 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl shadow-slate-300">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">Projet</p>
            <h3 className="text-2xl font-semibold text-slate-900">{project.name}</h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${health.badge}`}>{health.label}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{project.progress}%</span>
              <span className="text-xs text-slate-500">{tasks.filter((t) => t.status !== "terminee").length} tâches ouvertes</span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Fermer
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-600">Paramètres du projet</p>
                <p className="text-sm text-slate-700">Description, objectifs et blocages</p>
              </div>
              <button
                onClick={saveMeta}
                disabled={savingMeta}
                className="rounded-md bg-indigo-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingMeta ? "Sauvegarde..." : "Enregistrer"}
              </button>
            </div>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Décrire le périmètre et le résultat attendu"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                rows={3}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <textarea
                  value={metaObjectives}
                  onChange={(e) => setMetaObjectives(e.target.value)}
                  placeholder="Objectifs (ligne ou virgule)"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                />
                <textarea
                  value={metaSubgoals}
                  onChange={(e) => setMetaSubgoals(e.target.value)}
                  placeholder="Sous-objectifs / étapes"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-1 text-sm text-slate-700">
                  <span className="text-[11px] font-semibold text-slate-600">Échéance globale</span>
                  <input
                    type="date"
                    value={metaDueDate}
                    onChange={(e) => setMetaDueDate(e.target.value)}
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
                    <input
                      type="text"
                      value={metaBlockerTitle}
                      onChange={(e) => setMetaBlockerTitle(e.target.value)}
                      placeholder="Titre du blocage"
                      className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                    />
                    <select
                      value={metaBlockerStatus}
                      onChange={(e) => setMetaBlockerStatus(e.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-2 text-sm"
                    >
                      {blockerStatusOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addMetaBlocker}
                      className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                    >
                      Ajouter
                    </button>
                  </div>
                  {metaBlockers.length ? (
                    <div className="space-y-2 rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-700">
                      {metaBlockers.map((b, idx) => (
                        <div key={b.id || `${b.title}-${idx}`} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1">
                          <span className="font-semibold text-slate-900">{b.title}</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={b.status || "ouvert"}
                              onChange={(e) => updateMetaBlockerStatus(b.id || b.title, e.target.value)}
                              className="rounded-md border border-slate-200 px-2 py-1 text-[11px]"
                            >
                              {blockerStatusOptions.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeMetaBlocker(b.id || b.title)}
                              className="text-[11px] font-semibold text-rose-700 hover:underline"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">Aucun blocage. Ajoutez-en un pour suivre les risques.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
              <span>{(project.objectives ?? []).length} objectif(s)</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
              <span>{(project.subgoals ?? []).length} sous-objectif(s)</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden />
              <span>{blockersCount} blocage(s)</span>
              {project.due_date ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                  <Timer className="h-3 w-3" /> {new Date(project.due_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={saveMeta}
                disabled={savingMeta}
                className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingMeta ? "Mise à jour..." : "Mettre à jour"}
              </button>
              <button
                onClick={onDeleteProject}
                disabled={deletingProject}
                className="rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
              >
                {deletingProject ? "Suppression..." : "Supprimer le projet"}
              </button>
            </div>
            {project.blockers?.length ? (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700">
                <p className="text-[11px] font-semibold text-slate-700">Blocages</p>
                <ul className="mt-2 space-y-1">
                  {project.blockers.map((b, idx) => (
                    <li key={b.id || `${b.title}-${idx}`} className="flex items-center justify-between rounded-md bg-white px-2 py-1">
                      <span className="font-semibold text-slate-900">{b.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${((b.status || "").toLowerCase().includes("res") ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}`}>
                        {b.status || "ouvert"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-600">Kanban rapide</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-700">
              <input
                type="text"
                value={projectTaskTitle}
                onChange={(e) => setProjectTaskTitle(e.target.value)}
                placeholder="Nouvelle tâche du projet"
                className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="datetime-local"
                value={projectTaskDeadline}
                onChange={(e) => setProjectTaskDeadline(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                onClick={() => {
                  onAddTask(projectTaskTitle, projectTaskDeadline || undefined);
                  setProjectTaskTitle("");
                  setProjectTaskDeadline("");
                }}
                disabled={!projectTaskTitle || savingTask}
                className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingTask ? "Ajout..." : "Ajouter"}
              </button>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {kanbanOrder.map((col) => (
                <div
                  key={col}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData("text/plain");
                    if (!taskId) return;
                    setKanbanColumns((prev) => moveTaskLocal(prev, taskId, col));
                    onMoveTask(taskId, col);
                  }}
                  className="rounded-lg bg-white p-2 shadow-sm"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                    <span>{kanbanLabel(col)} </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px]">{kanbanColumns[col].length}</span>
                  </div>
                  <div className="mt-2 min-h-[80px] space-y-1 text-xs text-slate-700">
                    {kanbanColumns[col].length ? (
                      kanbanColumns[col].map((t) => (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                          className="rounded-md border border-slate-100 bg-slate-50 px-2 py-1 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-slate-900">{t.title}</p>
                            <div className="flex items-center gap-2">
                              <button
                                className="text-[10px] font-semibold text-blue-700 underline underline-offset-2"
                                onClick={() => onPlanTask(t)}
                              >
                                Planifier
                              </button>
                              <button
                                className="text-[10px] font-semibold text-rose-700 underline underline-offset-2"
                                onClick={() => {
                                  setKanbanColumns((prev) => ({
                                    a_faire: prev.a_faire.filter((task) => task.id !== t.id),
                                    en_cours: prev.en_cours.filter((task) => task.id !== t.id),
                                    terminee: prev.terminee.filter((task) => task.id !== t.id),
                                  }));
                                  onDeleteTask(t.id);
                                }}
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                          {t.deadline ? <p className="text-[11px] text-slate-500">Échéance {formatTime(t.deadline)}</p> : null}
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-500">Glissez une tâche ici</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-600">Timeline des jalons</p>
              <button
                onClick={() => {
                  setMilestoneError(null);
                  setShowMilestoneModal(true);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouveau jalon
              </button>
            </div>
            {editableMilestones.length ? (
              <div className="mt-3 flex flex-col gap-2">
                {buildMilestoneGantt(editableMilestones).map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-xs text-slate-700">
                    <span className="w-20 font-semibold text-slate-900">{m.title}</span>
                    <div className="flex-1 rounded-md bg-slate-100 px-2 py-1">
                      <div className="h-2 rounded-full bg-indigo-200">
                        <div className="h-2 rounded-full" style={{ width: `${m.width}%`, marginLeft: `${m.offset}%`, backgroundColor: m.color }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                        <span>{m.startLabel}</span>
                        <span>{m.endLabel}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedMilestones.length ? (
              <div className="mt-2 flex flex-col gap-3">
                {sortedMilestones.map((m, idx) => (
                  <div key={`${m}-${idx}`} className="flex items-center gap-3">
                    <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                      {idx + 1}
                    </div>
                    <div className="flex-1 rounded-lg bg-white px-3 py-2 shadow-sm">
                      <p className="text-sm font-semibold text-slate-900">{m}</p>
                      <p className="text-[11px] text-slate-500">Suivi : {health.milestoneNote}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Aucun jalon enregistré.</p>
            )}
            <div className="mt-3 space-y-2 rounded-lg bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-700">Jalons</p>
                <button
                  onClick={() => setShowMilestoneModal(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter
                </button>
              </div>
              {milestoneError ? <p className="text-[11px] text-rose-600">{milestoneError}</p> : null}
              <div className="max-h-56 space-y-2 overflow-auto">
                {editableMilestones.length ? (
                  editableMilestones.map((m) => (
                    <div key={m.id || m.title} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{m.title}</span>
                        <span className="text-[10px] text-slate-500">{m.start} → {m.end}</span>
                        {m.level ? <span className="text-[10px] text-slate-600">Niveau : {m.level}</span> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditMilestone(m)}
                          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => removeMilestone(m.id || m.title)}
                          className="text-[11px] font-semibold text-rose-600 hover:underline"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-500">Ajoutez vos jalons datés.</p>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={saveMilestones}
                  disabled={savingMilestones}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  {savingMilestones ? "Sauvegarde..." : "Enregistrer les jalons"}
                </button>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-white p-2 text-xs text-slate-600">
              Santé jalons : <span className="font-semibold text-slate-800">{health.milestoneNote}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-600">Risques</p>
            {risks.length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-800">
                {risks.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900">{r.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.badge}`}>{r.level}</span>
                    </div>
                    <p className="text-xs text-slate-600">{r.detail}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Aucun risque identifié.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-600">Décisions récentes</p>
            {decisions.length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-800">
                {decisions.map((d) => (
                  <li key={d.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="text-xs font-semibold text-slate-900">{d.title}</div>
                    <p className="text-xs text-slate-600">{d.detail}</p>
                    <p className="text-[11px] text-slate-500">{d.date}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Pas encore de décisions consignées.</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-600">Notifications</p>
            {notifications.length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-800">
                {notifications.map((n) => (
                  <li key={n.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <span>{n.message}</span>
                    <span className="text-[11px] text-slate-500">{n.when}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Aucune alerte pour le moment.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-600">Dépendances</p>
            {project.dependencies?.length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-800">
                {project.dependencies.map((d, idx) => (
                  <li key={`${d}-${idx}`} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Aucune dépendance renseignée.</p>
            )}
          </div>
        </div>
      </div>

      {showMilestoneModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowMilestoneModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl shadow-slate-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Nouveau jalon</p>
                <h4 className="text-lg font-semibold text-slate-900">Ajouter un jalon daté</h4>
              </div>
              <button onClick={() => setShowMilestoneModal(false)} className="rounded-md px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Fermer
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600">Titre</label>
                <input
                  type="text"
                  value={draftMilestoneTitle}
                  onChange={(e) => setDraftMilestoneTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Ex: Phase de test"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600">Début</label>
                <input
                  type="date"
                  value={draftMilestoneStart}
                  onChange={(e) => setDraftMilestoneStart(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600">Fin</label>
                <input
                  type="date"
                  value={draftMilestoneEnd}
                  onChange={(e) => setDraftMilestoneEnd(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600">Niveau</label>
                <select
                  value={draftMilestoneLevel}
                  onChange={(e) => setDraftMilestoneLevel(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Non spécifié</option>
                  <option value="Haut">Haut</option>
                  <option value="Moyen">Moyen</option>
                  <option value="Bas">Bas</option>
                </select>
              </div>
            </div>
            {milestoneError ? <p className="mt-3 text-[11px] text-rose-600">{milestoneError}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowMilestoneModal(false)}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  const ok = addDraftMilestone();
                  if (ok) setShowMilestoneModal(false);
                }}
                className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showEditMilestoneModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setShowEditMilestoneModal(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl shadow-slate-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Modifier le jalon</p>
                <h4 className="text-lg font-semibold text-slate-900">Ajuster ou supprimer</h4>
              </div>
              <button onClick={() => setShowEditMilestoneModal(false)} className="rounded-md px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Fermer
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600">Titre</label>
                <input
                  type="text"
                  value={editMilestoneTitle}
                  onChange={(e) => setEditMilestoneTitle(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Ex: Go/No-go"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600">Début</label>
                <input
                  type="date"
                  value={editMilestoneStart}
                  onChange={(e) => setEditMilestoneStart(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600">Fin</label>
                <input
                  type="date"
                  value={editMilestoneEnd}
                  onChange={(e) => setEditMilestoneEnd(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-600">Niveau</label>
                <select
                  value={editMilestoneLevel}
                  onChange={(e) => setEditMilestoneLevel(e.target.value)}
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Non spécifié</option>
                  <option value="Haut">Haut</option>
                  <option value="Moyen">Moyen</option>
                  <option value="Bas">Bas</option>
                </select>
              </div>
            </div>
            {milestoneError ? <p className="mt-3 text-[11px] text-rose-600">{milestoneError}</p> : null}
            <div className="mt-4 flex justify-between">
              <button
                onClick={deleteEditedMilestone}
                className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
              >
                Supprimer
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEditMilestoneModal(false)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  onClick={saveEditedMilestone}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Mettre à jour
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type StructuredCommand = { command: string; content: string; args: string[] };

type ApiProject = Awaited<ReturnType<typeof apiProjects>>[number];
type ApiStudySubject = Awaited<ReturnType<typeof apiStudySubjects>>[number];
type ApiStudyPlanItem = Awaited<ReturnType<typeof apiStudyPlans>>[number];
type ApiStudySessionItem = Awaited<ReturnType<typeof apiStudySessionsDue>>[number];
type ApiStudyCardItem = Awaited<ReturnType<typeof apiStudyCardsDue>>[number];

function mapProject(apiProject: ApiProject): Project {
  return {
    id: String(apiProject.id),
    name: apiProject.name,
    progress: apiProject.progress,
    description: apiProject.description ?? undefined,
    objectives: apiProject.objectives ?? undefined,
    due_date: apiProject.due_date ?? undefined,
    subgoals: apiProject.subgoals ?? undefined,
    blockers: apiProject.blockers ?? undefined,
    milestones: apiProject.milestones ?? undefined,
    milestones_dates: apiProject.milestones_dates ?? undefined,
    risks: apiProject.risks ?? undefined,
    decisions: apiProject.decisions ?? undefined,
    notifications: apiProject.notifications ?? undefined,
    dependencies: apiProject.dependencies ?? undefined,
  };
}

function mapStudySubject(apiSubject: ApiStudySubject): StudySubject {
  return {
    id: String(apiSubject.id),
    name: apiSubject.name,
    description: apiSubject.description ?? undefined,
    ue_code: apiSubject.ue_code ?? undefined,
  };
}

function mapStudySession(apiSession: ApiStudySessionItem): StudySession {
  return {
    id: String(apiSession.id),
    subject_id: apiSession.subject_id != null ? String(apiSession.subject_id) : undefined,
    plan_id: apiSession.plan_id != null ? String(apiSession.plan_id) : undefined,
    kind: apiSession.kind,
    topic: apiSession.topic ?? undefined,
    status: apiSession.status,
    scheduled_for: apiSession.scheduled_for ?? undefined,
    duration_minutes: apiSession.duration_minutes,
    completed_at: apiSession.completed_at ?? undefined,
    difficulty: apiSession.difficulty ?? undefined,
    notes: apiSession.notes ?? undefined,
  };
}

function mapStudyPlan(apiPlan: ApiStudyPlanItem): StudyPlan {
  return {
    id: String(apiPlan.id),
    title: apiPlan.title,
    subject_id: apiPlan.subject_id != null ? String(apiPlan.subject_id) : undefined,
    exam_date: apiPlan.exam_date ?? undefined,
    total_minutes: apiPlan.total_minutes ?? undefined,
    sessions: (apiPlan.sessions ?? []).map((s) => mapStudySession(s as ApiStudySessionItem)),
  };
}

function mapStudyCard(apiCard: ApiStudyCardItem): StudyCard {
  return {
    id: String(apiCard.id),
    subject_id: apiCard.subject_id != null ? String(apiCard.subject_id) : undefined,
    front: apiCard.front,
    back: apiCard.back,
    due_at: apiCard.due_at,
    interval_days: apiCard.interval_days,
    ease: apiCard.ease,
    streak: apiCard.streak,
    last_score: apiCard.last_score ?? undefined,
  };
}

function detectStructuredCommand(text: string): StructuredCommand | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const parts = trimmed.slice(1).split(/\s+/);
  const command = parts.shift()?.toLowerCase();
  if (!command) return null;
  const content = parts.join(" ");
  return { command, content, args: parts };
}

function isAmbiguous(text: string) {
  const lower = text.toLowerCase();
  const tokens = lower.split(/\s+/);
  if (tokens.length <= 3) return true;
  if (lower.includes("ça") || lower.includes("ceci") || lower.includes("cela")) return true;
  return false;
}

function sortEvents(events: AgendaEvent[]) {
  return [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

function toLocalDateTimeInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function normalizeUrl(url: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function hostnameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

function faviconUrl(url: string) {
  const host = hostnameFromUrl(url);
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
}

function splitLines(value: string): string[] | null {
  const lines = value
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : null;
}

function mapsUrl(location: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function staticMapUrl(location: string) {
  const key = process.env.NEXT_PUBLIC_MAPS_API_KEY;
  if (!key) return null;
  const params = new URLSearchParams({
    key,
    size: "400x200",
    scale: "2",
    zoom: "15",
    maptype: "roadmap",
    markers: `color:red|${location}`,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function addMonths(base: Date, delta: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function buildMonthGrid(month: Date, events: AgendaEvent[]) {
  const start = startOfWeek(startOfMonth(month));
  const cells = [] as Array<{ key: string; date: Date; inMonth: boolean; events: AgendaEvent[] }>;
  for (let i = 0; i < 42; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = current.toISOString().split("T")[0] + i;
    const dayEvents = events.filter((e) => isSameDay(new Date(e.start), current));
    cells.push({
      key,
      date: current,
      inMonth: current.getMonth() === month.getMonth(),
      events: dayEvents,
    });
  }
  return cells;
}

function weekLoadHeatmap(events: AgendaEvent[]) {
  const start = startOfWeek(new Date());
  const days = Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date(start);
    date.setDate(start.getDate() + idx);
    const daily = events.filter((e) => isSameDay(new Date(e.start), date));
    const hours = computeLoad(daily);
    return { date, hours };
  });
  const max = Math.max(...days.map((d) => d.hours), 0.1);
  return days.map((d) => ({ ...d, ratio: Math.min(d.hours / max, 1) }));
}

function buildKanban(tasks: Task[]) {
  return tasks.reduce(
    (acc, t) => {
      acc[t.status].push(t);
      return acc;
    },
    { a_faire: [] as Task[], en_cours: [] as Task[], terminee: [] as Task[] }
  );
}

function kanbanLabel(col: Task["status"]) {
  if (col === "a_faire") return "À faire";
  if (col === "en_cours") return "En cours";
  return "Terminé";
}

function moveTaskLocal(columns: ReturnType<typeof buildKanban>, taskId: string, target: Task["status"]) {
  const next: ReturnType<typeof buildKanban> = {
    a_faire: [...columns.a_faire],
    en_cours: [...columns.en_cours],
    terminee: [...columns.terminee],
  };
  let moved: Task | undefined;
  (Object.keys(next) as Array<keyof typeof next>).forEach((col) => {
    const idx = next[col].findIndex((t) => t.id === taskId);
    if (idx >= 0) {
      [moved] = next[col].splice(idx, 1);
    }
  });
  if (moved && !next[target].some((t) => t.id === moved!.id)) {
    next[target].push({ ...moved, status: target });
  }
  return next;
}

function computeProjectHealth(progress: number, tasks: Task[], dueDate?: string, blockers: ProjectBlocker[] = []) {
  const open = tasks.filter((t) => t.status !== "terminee");
  const overdueCount = open.filter((t) => (t.deadline ? new Date(t.deadline).getTime() < Date.now() : false)).length;
  const load = open.length;
  const activeBlockers = (blockers ?? []).filter((b) => {
    const status = (b.status ?? "").toLowerCase();
    if (!status) return true;
    return ["open", "bloque", "blocked", "todo", "a_faire", "en_cours"].some((flag) => status.includes(flag));
  }).length;

  const dueMs = dueDate ? new Date(dueDate).getTime() : null;
  const daysToDue = dueMs ? Math.ceil((dueMs - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isProjectLate = daysToDue !== null && daysToDue < 0 && progress < 100;
  const dueSoon = daysToDue !== null && daysToDue >= 0 && daysToDue <= 7;

  const milestoneNote = isProjectLate
    ? "Échéance dépassée"
    : overdueCount
      ? `${overdueCount} tâche(s) en retard`
      : activeBlockers
        ? `${activeBlockers} blocage(s) à lever`
        : dueSoon
          ? `Échéance dans ${daysToDue} j`
          : "Aligné";

  if (progress >= 80 && overdueCount === 0 && activeBlockers === 0 && (!dueSoon || daysToDue === null || daysToDue > 7) && load <= 3) {
    return { label: "On track", badge: "bg-emerald-100 text-emerald-700", milestoneNote };
  }

  if (isProjectLate || overdueCount >= 2 || activeBlockers >= 2 || (dueSoon && progress < 60) || (progress < 30 && load > 5)) {
    return { label: "À risque", badge: "bg-amber-100 text-amber-700", milestoneNote };
  }

  return { label: "Surveillance", badge: "bg-blue-100 text-blue-700", milestoneNote };
}

function riskScore(project: Project) {
  const risks = project.risks ?? [];
  const hasHigh = risks.some((r) => (r.level ?? "").toLowerCase().includes("haut") || (r.level ?? "").toLowerCase().includes("eleve"));
  if (hasHigh) return 3;
  if (risks.length) return 2;
  return project.progress < 40 ? 1 : 0;
}

function riskBadgeClass(level?: string) {
  const normalized = (level ?? "").toLowerCase();
  if (normalized.includes("haut") || normalized.includes("eleve") || normalized.includes("risque") || normalized.includes("critique")) {
    return "bg-amber-100 text-amber-700";
  }
  if (normalized.includes("surveillance") || normalized.includes("moyen")) {
    return "bg-blue-100 text-blue-700";
  }
  return "bg-slate-100 text-slate-700";
}

function buildRisks(project: Project, tasks: Task[]) {
  const open = tasks.filter((t) => t.status !== "terminee");
  const overdue = open.filter((t) => (t.deadline ? new Date(t.deadline).getTime() < Date.now() : false)).length;
  const risks = [] as Array<{ id: string; title: string; detail: string; level: string; badge: string }>;

  if (overdue) {
    risks.push({
      id: `${project.id}-overdue`,
      title: "Échéances dépassées",
      detail: `${overdue} tâche(s) en retard, replanifier les jalons associés.`,
      level: "Risque",
      badge: "bg-amber-100 text-amber-700",
    });
  }

  if (project.progress < 40 && open.length > 3) {
    risks.push({
      id: `${project.id}-load`,
      title: "Charge élevée",
      detail: "Beaucoup de travail ouvert alors que l'avancement est faible.",
      level: "Surveillance",
      badge: "bg-blue-100 text-blue-700",
    });
  }

  return risks;
}

function buildDecisions(project: Project) {
  return [
    {
      id: `${project.id}-scope`,
      title: "Périmètre clarifié",
      detail: "Portée revue et priorisée pour le prochain jalon.",
      date: "Aujourd'hui",
    },
  ];
}

function buildNotifications(project: Project, milestones: string[], tasks: Task[]) {
  const open = tasks.filter((t) => t.status !== "terminee");
  const items = [] as Array<{ id: string; message: string; when: string }>;

  if (milestones.length) {
    items.push({ id: `${project.id}-m1`, message: `Jalon proche : ${milestones[0]}`, when: "Cette semaine" });
  }
  if (open.length >= 5) {
    items.push({ id: `${project.id}-load`, message: "Charge élevée, replanifiez", when: "À traiter" });
  }
  return items;
}

function buildMilestoneGantt(milestones: Project["milestones_dates"]) {
  if (!milestones || !milestones.length) return [] as Array<{
    id: string;
    title: string;
    width: number;
    offset: number;
    startLabel: string;
    endLabel: string;
    color: string;
  }>;
  const parsed = milestones
    .map((m) => {
      const start = m.start ? new Date(m.start) : null;
      const end = m.end ? new Date(m.end) : null;
      if (!start || !end) return null;
      return { ...m, start, end };
    })
    .filter(Boolean) as Array<{ id?: string; title: string; start: Date; end: Date; level?: string }>;
  if (!parsed.length) return [];
  const min = Math.min(...parsed.map((m) => m.start.getTime()));
  const max = Math.max(...parsed.map((m) => m.end.getTime()));
  const span = Math.max(max - min, 1);
  return parsed.map((m) => {
    const offset = ((m.start.getTime() - min) / span) * 100;
    const width = (Math.max(m.end.getTime() - m.start.getTime(), 1) / span) * 100;
    return {
      id: m.id || m.title,
      title: m.title,
      width,
      offset,
      startLabel: m.start.toLocaleDateString("fr-FR", { month: "short", day: "numeric" }),
      endLabel: m.end.toLocaleDateString("fr-FR", { month: "short", day: "numeric" }),
      color: milestoneColor(m.level),
    };
  });
}

function milestoneColor(level?: string) {
  const norm = (level || "").toLowerCase();
  if (norm.includes("haut") || norm.includes("eleve")) return "#f97316"; // orange
  if (norm.includes("moy")) return "#22c55e"; // green medium
  return "#2563eb"; // default blue
}

