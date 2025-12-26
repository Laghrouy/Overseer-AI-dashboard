"use client";

/* eslint-disable react/no-unescaped-entities */

import type { JSX } from "react";
import { CheckCircle2, ListChecks, Plus } from "lucide-react";
import { CardContainer } from "../ui";
import type { Project, Task } from "@/lib/types";

export function TasksProjectsView(props: {
  token?: string | null;
  tasksLoading: boolean;
  todayTasks: Task[];
  quickKanban: Record<"a_faire" | "en_cours" | "terminee", Task[]>;
  setQuickKanban: (updater: (prev: Record<"a_faire" | "en_cours" | "terminee", Task[]>) => Record<"a_faire" | "en_cours" | "terminee", Task[]>) => void;
  moveTaskLocal: (board: Record<"a_faire" | "en_cours" | "terminee", Task[]>, taskId: string, target: Task["status"]) => Record<"a_faire" | "en_cours" | "terminee", Task[]>;
  updateTaskStatus: { mutate: (payload: { taskId: string; status: Task["status"] }) => void };
  handleDeleteTask: (id: string) => void;
  planTaskToEvent: (task: Task) => void;
  kanbanLabel: (col: Task["status"]) => string;
  updateTaskMutation: { mutate: (taskId: string) => void };
  setShowTaskModal: (v: boolean) => void;
  exportTasksAs: (format: "json" | "csv") => void;
  projectsLoading: boolean;
  sortedProjects: Project[];
  projectSort: "progress" | "risk" | "alphabetique";
  setProjectSort: (v: "progress" | "risk" | "alphabetique") => void;
  projectRiskOnly: boolean;
  setProjectRiskOnly: (v: boolean) => void;
  setShowCreateProjectModal: (v: boolean) => void;
  exportProjectsAs: (format: "json" | "csv") => void;
  tasksByProject: Record<string, Task[]>;
  setActiveProject: (p: Project | null) => void;
  resolveBlockerQuick: (project: Project, blockerId: string) => void;
  TaskRowComponent: (props: { task: Task; onDone?: () => void; onDelete?: () => void }) => JSX.Element;
  ProjectRowComponent: (props: { project: Project; tasks: Task[]; onOpen: () => void; onResolveBlocker?: (blockerId: string) => void }) => JSX.Element;
}) {
  const {
    token,
    tasksLoading,
    todayTasks,
    quickKanban,
    setQuickKanban,
    moveTaskLocal,
    updateTaskStatus,
    handleDeleteTask,
    planTaskToEvent,
    kanbanLabel,
    updateTaskMutation,
    setShowTaskModal,
    exportTasksAs,
    projectsLoading,
    sortedProjects,
    projectSort,
    setProjectSort,
    projectRiskOnly,
    setProjectRiskOnly,
    setShowCreateProjectModal,
    exportProjectsAs,
    tasksByProject,
    setActiveProject,
    resolveBlockerQuick,
    TaskRowComponent,
    ProjectRowComponent,
  } = props;

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <CardContainer title="Kanban rapide" icon={<ListChecks className="h-5 w-5 text-emerald-600" />} className="lg:col-span-3">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-slate-500">Glissez-déposez vos tâches du jour pour suivre l'avancée en un coup d'œil.</p>
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
                    if (!token) return;
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
                              {t.deadline ? <p className="text-[11px] text-slate-500">Échéance {new Date(t.deadline).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</p> : null}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <button className="text-[10px] font-semibold text-blue-700 underline underline-offset-2" onClick={() => planTaskToEvent(t)}>
                                Planifier
                              </button>
                              <button className="text-[10px] font-semibold text-rose-700 underline underline-offset-2" onClick={() => handleDeleteTask(t.id)}>
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
          {token ? (
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
              <button onClick={() => setShowTaskModal(true)} className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50">
                <Plus className="h-4 w-4" /> Nouvelle tâche
              </button>
            </div>
          ) : null}
          {tasksLoading ? (
            <p className="text-sm text-slate-600">Chargement des tâches...</p>
          ) : todayTasks.length ? (
            todayTasks.map((task) => (
              <TaskRowComponent key={task.id} task={task} onDone={() => updateTaskMutation.mutate(task.id)} onDelete={() => handleDeleteTask(task.id)} />
            ))
          ) : (
            <p className="text-sm text-slate-600">Aucune tâche pour aujourd'hui.</p>
          )}
        </div>
      </CardContainer>

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
          {token ? (
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
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
            <span className="font-semibold">Trier :</span>
            <button onClick={() => setProjectSort("progress")} className={`rounded-full px-2 py-1 ${projectSort === "progress" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
              Avancement
            </button>
            <button onClick={() => setProjectSort("risk")} className={`rounded-full px-2 py-1 ${projectSort === "risk" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
              Risque
            </button>
            <button onClick={() => setProjectSort("alphabetique")} className={`rounded-full px-2 py-1 ${projectSort === "alphabetique" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
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
              <ProjectRowComponent
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
}
