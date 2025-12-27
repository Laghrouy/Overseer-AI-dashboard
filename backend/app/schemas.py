from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr


class ProjectRisk(BaseModel):
    id: str | None = None
    title: str
    detail: str | None = None
    level: str | None = None


class ProjectDecision(BaseModel):
    id: str | None = None
    title: str
    detail: str | None = None
    date: str | None = None


class ProjectNotification(BaseModel):
    id: str | None = None
    message: str
    when: str | None = None


class NotificationSignals(BaseModel):
    reminders: dict
    anticipation: dict
    context: str | None = None

class ProjectBlocker(BaseModel):
    id: Optional[str] = None
    title: str
    detail: Optional[str] = None
    status: Optional[str] = None


class ProjectMilestone(BaseModel):
    id: str | None = None
    title: str
    start: str | None = None
    end: str | None = None
    level: str | None = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "normale"
    deadline: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    category: Optional[str] = None
    energy: Optional[int] = None
    parent_task_id: Optional[int] = None
    dependencies: Optional[list[int]] = None
    order_index: Optional[int] = None
    project_id: Optional[int] = None


class TaskRead(TaskCreate):
    id: int
    status: str


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    deadline: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    category: Optional[str] = None
    energy: Optional[int] = None
    parent_task_id: Optional[int] = None
    dependencies: Optional[list[int]] = None
    order_index: Optional[int] = None
    project_id: Optional[int] = None


class EventCreate(BaseModel):
    title: str
    start: datetime
    end: datetime
    kind: str = "fixe"
    category: Optional[str] = "general"
    task_id: Optional[int] = None
    description: Optional[str] = None
    note: Optional[str] = None
    location: Optional[str] = None
    url: Optional[str] = None
    color: Optional[str] = None
    important: bool = False
    is_all_day: bool = False
    attachments: Optional[list[str]] = None
    recurrence: Optional[str] = None
    recurrence_interval: Optional[int] = None
    recurrence_until: Optional[datetime] = None
    recurrence_custom: Optional[str] = None


class EventRead(EventCreate):
    id: int


class EventUpdate(BaseModel):
    title: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    kind: Optional[str] = None
    category: Optional[str] = None
    task_id: Optional[int] = None
    description: Optional[str] = None
    note: Optional[str] = None
    location: Optional[str] = None
    url: Optional[str] = None
    color: Optional[str] = None
    important: Optional[bool] = None
    is_all_day: Optional[bool] = None
    attachments: Optional[list[str]] = None
    recurrence: Optional[str] = None
    recurrence_interval: Optional[int] = None
    recurrence_until: Optional[datetime] = None
    recurrence_custom: Optional[str] = None


class ProjectCreate(BaseModel):
    name: str
    progress: float = 0
    description: Optional[str] = None
    objectives: list[str] | None = None
    due_date: Optional[datetime] = None
    subgoals: list[str] | None = None
    blockers: list[ProjectBlocker] | None = None
    milestones: list[str] | None = None
    milestones_dates: list[ProjectMilestone] | None = None
    risks: list[ProjectRisk] | None = None
    decisions: list[ProjectDecision] | None = None
    notifications: list[ProjectNotification] | None = None
    dependencies: list[str] | None = None


class ProjectRead(ProjectCreate):
    id: int


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    progress: Optional[float] = None
    description: Optional[str] = None
    objectives: list[str] | None = None
    due_date: Optional[datetime] = None
    subgoals: list[str] | None = None
    blockers: list[ProjectBlocker] | None = None
    milestones: list[str] | None = None
    milestones_dates: list[ProjectMilestone] | None = None
    risks: list[ProjectRisk] | None = None
    decisions: list[ProjectDecision] | None = None
    notifications: list[ProjectNotification] | None = None
    dependencies: list[str] | None = None


class ProjectMilestonesUpdate(BaseModel):
    milestones_dates: list[ProjectMilestone]


class AgentPlanRequest(BaseModel):
    date: Optional[datetime] = None
    mode: str = "day"  # day | week
    reason: Optional[str] = None  # retard | imprevu | annulation | report | optimisation


class AgentPlanResponse(BaseModel):
    message: str
    events: list[EventRead]
    rationale: str


class AgentChatRequest(BaseModel):
    message: str
    history: Optional[list[dict[str, str]]] = None


class AgentChatResponse(BaseModel):
    reply: str


class UserPreferenceRead(BaseModel):
    productive_hours: Optional[list[dict[str, str]]] = None
    daily_load_limit_hours: Optional[float] = None
    session_duration_minutes: Optional[int] = None
    days_off: Optional[list[str]] = None
    painful_tasks: Optional[list[str]] = None


class UserPreferenceUpdate(BaseModel):
    productive_hours: Optional[list[dict[str, str]]] = None
    daily_load_limit_hours: Optional[float] = None
    session_duration_minutes: Optional[int] = None
    days_off: Optional[list[str]] = None
    painful_tasks: Optional[list[str]] = None


class HistoryResponse(BaseModel):
    tasks: list[TaskRead]
    events: list[EventRead]
    projects: list[ProjectRead]
    agent_logs: list[dict[str, str]]


class StudySubjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    ue_code: Optional[str] = None


class StudySubjectRead(StudySubjectCreate):
    id: int


class StudySubjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    ue_code: Optional[str] = None


class StudyPlanGenerateRequest(BaseModel):
    subject_id: int
    topics: list[str]
    exam_date: Optional[datetime] = None
    total_minutes: Optional[int] = None
    session_minutes: int = 30
    sessions_per_day: int = 2


class StudySessionRead(BaseModel):
    id: int
    subject_id: Optional[int]
    plan_id: Optional[int]
    kind: str
    topic: Optional[str]
    status: str
    scheduled_for: Optional[datetime]
    duration_minutes: int
    completed_at: Optional[datetime]
    difficulty: Optional[int]
    notes: Optional[str]


class StudyPlanRead(BaseModel):
    id: int
    title: str
    subject_id: Optional[int]
    exam_date: Optional[datetime]
    total_minutes: Optional[int]
    sessions: list[StudySessionRead]


class StudyPlanUpdate(BaseModel):
    title: Optional[str] = None
    exam_date: Optional[datetime] = None
    total_minutes: Optional[int] = None


class StudySessionUpdate(BaseModel):
    status: Optional[str] = None
    completed_at: Optional[datetime] = None
    difficulty: Optional[int] = None
    notes: Optional[str] = None


class StudyCardCreate(BaseModel):
    subject_id: int
    front: str
    back: str
    due_at: Optional[datetime] = None


class StudyCardRead(BaseModel):
    id: int
    subject_id: Optional[int]
    front: str
    back: str
    due_at: datetime
    interval_days: int
    ease: float
    streak: int
    last_score: Optional[int]


class StudyCardReview(BaseModel):
    score: int  # 1-5


class StudyAssistRequest(BaseModel):
    subject: str
    topic: Optional[str] = None
    content: Optional[str] = None
    mode: str = "resume"  # resume | explication | exercices | quiz
    difficulty: str = "medium"  # easy | medium | hard
    items: int = 5


class StudyAssistResponse(BaseModel):
    output: str


class FeedbackDeferredTask(BaseModel):
    id: int
    title: str
    deadline: Optional[datetime] = None
    status: str
    late_days: Optional[int] = None


class FeedbackEstimateAdjustment(BaseModel):
    task_id: Optional[int] = None
    title: str
    planned_minutes: Optional[int] = None
    actual_minutes: float
    delta_minutes: float
    ratio: float
    suggested_minutes: Optional[int] = None
    note: Optional[str] = None


class FeedbackHabitWindow(BaseModel):
    window: str
    events: int
    hours: float


class FeedbackStats(BaseModel):
    scope: str
    start: datetime
    end: datetime
    planned_hours: float
    actual_hours: float
    tasks_planned: int
    tasks_done: int
    completion_rate: float
    deferred_tasks: list[FeedbackDeferredTask]
    estimate_adjustments: list[FeedbackEstimateAdjustment]
    habit_windows: list[FeedbackHabitWindow]


class FeedbackCommentCreate(BaseModel):
    category: Literal["suggestion", "bug", "question", "autre"]
    summary: str
    details: str
    reproduction: Optional[str] = None
    contact: Optional[str] = None


class FeedbackCommentRead(BaseModel):
    id: str
    owner_id: int
    category: Literal["suggestion", "bug", "question", "autre"]
    summary: str
    details: str
    reproduction: Optional[str] = None
    contact: Optional[str] = None
    created_at: datetime


class AutomationRequest(BaseModel):
    action: Literal["script", "api", "file", "message", "webhook"]
    target: str | None = None
    payload: dict | None = None
    message: str | None = None


class AutomationResponse(BaseModel):
    id: str
    action: str
    status: str
    detail: str
    created_at: datetime


class AutomationRollbackRequest(BaseModel):
    id: str | None = None
    reason: str | None = None


class AutomationRollbackResponse(BaseModel):
    status: str
    detail: str
    created_at: datetime


class CommandRequest(BaseModel):
    command: str
    args: list[str] | None = None


class CommandResponse(BaseModel):
    status: str
    output: str
    created_at: datetime
