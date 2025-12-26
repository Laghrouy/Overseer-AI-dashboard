export type Priority = "basse" | "normale" | "haute";

export type TaskStatus = "a_faire" | "en_cours" | "terminee";

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  priority: Priority;
  deadline?: string;
  durationMinutes?: number;
  category?: string;
  energy?: number;
  parentTaskId?: string;
  dependencies?: string[];
  orderIndex?: number;
  status: TaskStatus;
}

export interface ProjectRisk {
  id?: string;
  title: string;
  detail?: string;
  level?: string;
}

export interface ProjectDecision {
  id?: string;
  title: string;
  detail?: string;
  date?: string;
}

export interface ProjectNotification {
  id?: string;
  message: string;
  when?: string;
}

export interface ProjectBlocker {
  id?: string;
  title: string;
  detail?: string;
  status?: string;
}

export interface ProjectMilestone {
  id?: string;
  title: string;
  start?: string;
  end?: string;
  level?: string;
}

export interface AgendaEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: "fixe" | "propose";
  category?: string;
  description?: string;
  note?: string;
  location?: string;
  url?: string;
  color?: string;
  important?: boolean;
  isAllDay?: boolean;
  attachments?: string[];
  recurrence?: "daily" | "weekly" | "monthly" | "yearly" | "custom" | null;
  recurrenceInterval?: number | null;
  recurrenceUntil?: string;
  recurrenceCustom?: string | null;
  taskId?: string;
}

export interface Project {
  id: string;
  name: string;
  progress: number; // 0-100
  description?: string;
  objectives?: string[];
  due_date?: string;
  subgoals?: string[];
  blockers?: ProjectBlocker[];
  milestones?: string[];
  milestones_dates?: ProjectMilestone[];
  risks?: ProjectRisk[];
  decisions?: ProjectDecision[];
  notifications?: ProjectNotification[];
  dependencies?: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface StudySubject {
  id: string;
  name: string;
  description?: string;
  ue_code?: string;
}

export type StudySessionKind = "revision" | "rappel" | "exercice" | "quiz" | "resume";
export type StudySessionStatus = "planned" | "done" | "skipped";

export interface StudySession {
  id: string;
  subject_id?: string;
  plan_id?: string;
  kind: StudySessionKind;
  topic?: string;
  status: StudySessionStatus;
  scheduled_for?: string;
  duration_minutes: number;
  completed_at?: string;
  difficulty?: number;
  notes?: string;
}

export interface StudyPlan {
  id: string;
  title: string;
  subject_id?: string;
  exam_date?: string;
  total_minutes?: number;
  sessions: StudySession[];
}

export interface StudyCard {
  id: string;
  subject_id?: string;
  front: string;
  back: string;
  due_at: string;
  interval_days: number;
  ease: number;
  streak: number;
  last_score?: number;
}

export interface DailyStats {
  loadHours: number;
  tasksLeft: number;
  focusBlocks: number;
}

export type FeedbackScope = "day" | "week" | "month";

export interface FeedbackDeferredTask {
  id: number;
  title: string;
  deadline?: string;
  status: string;
  late_days?: number | null;
}

export interface FeedbackEstimateAdjustment {
  task_id?: number;
  title: string;
  planned_minutes?: number;
  actual_minutes: number;
  delta_minutes: number;
  ratio: number;
  suggested_minutes?: number;
  note?: string;
}

export interface FeedbackHabitWindow {
  window: string;
  events: number;
  hours: number;
}

export interface FeedbackStats {
  scope: FeedbackScope;
  start: string;
  end: string;
  planned_hours: number;
  actual_hours: number;
  tasks_planned: number;
  tasks_done: number;
  completion_rate: number;
  deferred_tasks: FeedbackDeferredTask[];
  estimate_adjustments: FeedbackEstimateAdjustment[];
  habit_windows: FeedbackHabitWindow[];
}
