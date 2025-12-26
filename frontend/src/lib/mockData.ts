import { AgendaEvent, ChatMessage, DailyStats, Project, Task } from "./types";

export const demoTasks: Task[] = [
  {
    id: "t1",
    title: "Synthèse du cours IA",
    projectName: "Études",
    priority: "haute",
    deadline: "2025-12-21T11:00:00Z",
    durationMinutes: 90,
    category: "études",
    energy: 7,
    status: "en_cours",
  },
  {
    id: "t2",
    title: "Revue du sprint perso",
    projectName: "Productivité",
    priority: "normale",
    deadline: "2025-12-21T16:00:00Z",
    durationMinutes: 45,
    category: "revue",
    energy: 5,
    status: "a_faire",
  },
  {
    id: "t3",
    title: "Lecture papier RL",
    projectName: "Études",
    priority: "basse",
    deadline: "2025-12-23T18:00:00Z",
    durationMinutes: 60,
    category: "lecture",
    energy: 3,
    status: "a_faire",
  },
  {
    id: "t4",
    title: "Inbox zéro",
    priority: "normale",
    deadline: "2025-12-21T09:30:00Z",
    durationMinutes: 20,
    category: "administratif",
    energy: 2,
    status: "terminee",
  },
];

export const demoEvents: AgendaEvent[] = [
  {
    id: "e1",
    title: "Deep work — Synthèse IA",
    start: "2025-12-21T08:00:00Z",
    end: "2025-12-21T09:30:00Z",
    type: "fixe",
    taskId: "t1",
  },
  {
    id: "e2",
    title: "Cours ML avancé",
    start: "2025-12-21T10:00:00Z",
    end: "2025-12-21T11:00:00Z",
    type: "fixe",
  },
  {
    id: "e3",
    title: "Plan proposé — Revue sprint",
    start: "2025-12-21T14:00:00Z",
    end: "2025-12-21T14:45:00Z",
    type: "propose",
    taskId: "t2",
  },
  {
    id: "e4",
    title: "Plan proposé — Lecture RL",
    start: "2025-12-21T17:00:00Z",
    end: "2025-12-21T18:00:00Z",
    type: "propose",
    taskId: "t3",
  },
];

export const demoProjects: Project[] = [
  { id: "p1", name: "Études IA", progress: 64, milestones: ["Synthèses semaine", "Flashcards"] },
  { id: "p2", name: "Santé & sport", progress: 45, milestones: ["3 séances", "8h sommeil"] },
  { id: "p3", name: "Productivité perso", progress: 72, milestones: ["Revue hebdo", "Automations"] },
];

export const demoChat: ChatMessage[] = [
  {
    id: "c1",
    role: "assistant",
    content: "J'ai généré un planning avec 2 blocs focus et une pause à 11h. Veux-tu ajuster la durée du bloc lecture?",
    createdAt: "2025-12-20T07:05:00Z",
  },
  {
    id: "c2",
    role: "user",
    content: "Ajoute 15 min de marge avant la réunion.",
    createdAt: "2025-12-20T07:08:00Z",
  },
  {
    id: "c3",
    role: "assistant",
    content: "Fait. J'ai aussi décalé la revue sprint à 14h pour lisser la charge.",
    createdAt: "2025-12-20T07:09:00Z",
  },
];

export const demoStats: DailyStats = {
  loadHours: 6.5,
  tasksLeft: 3,
  focusBlocks: 2,
};
