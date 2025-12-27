"use client";

/* eslint-disable react/no-unescaped-entities */

import { CalendarClock, Sparkles } from "lucide-react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { UserPreference } from "@/lib/api";
import { CardContainer } from "../ui";

export function PreferencesView(props: {
  token?: string | null;
  preferencesLoading: boolean;
  prefProductiveStart: string;
  prefProductiveEnd: string;
  prefLoadLimit: string;
  prefSession: string;
  prefDaysOff: string;
  prefPainfulTasks: string;
  setPrefProductiveStart: (v: string) => void;
  setPrefProductiveEnd: (v: string) => void;
  setPrefLoadLimit: (v: string) => void;
  setPrefSession: (v: string) => void;
  setPrefDaysOff: (v: string) => void;
  setPrefPainfulTasks: (v: string) => void;
  updatePreferences: UseMutationResult<UserPreference, Error, void, unknown>;
  historyLoading: boolean;
  historyData?: {
    tasks: unknown[];
    events: unknown[];
    projects: unknown[];
  } | null;
  agentHistoryFilter: "all" | "plan" | "chat" | "automation";
  setAgentHistoryFilter: (v: "all" | "plan" | "chat" | "automation") => void;
  filteredAgentLogs: Array<{ id: string | number; action: string; rationale: string; created_at: string }>;
}) {
  const {
    token,
    preferencesLoading,
    prefProductiveStart,
    prefProductiveEnd,
    prefLoadLimit,
    prefSession,
    prefDaysOff,
    prefPainfulTasks,
    setPrefProductiveStart,
    setPrefProductiveEnd,
    setPrefLoadLimit,
    setPrefSession,
    setPrefDaysOff,
    setPrefPainfulTasks,
    updatePreferences,
    historyLoading,
    historyData,
    agentHistoryFilter,
    setAgentHistoryFilter,
    filteredAgentLogs,
  } = props;

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <CardContainer title="Préférences utilisateur" icon={<Sparkles className="h-5 w-5 text-indigo-600" />} className="hidden md:block lg:col-span-2">
        <div className="flex flex-col gap-3">
          {token ? (
            <p className="text-xs text-slate-500">Vos réglages sont stockés côté API et appliqués aux suggestions.</p>
          ) : (
            <p className="text-xs text-slate-500">Connectez-vous pour enregistrer vos préférences.</p>
          )}
          {preferencesLoading ? <p className="text-sm text-slate-600">Chargement des préférences...</p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span className="text-[12px] font-semibold text-slate-600">Plage productive - début</span>
              <input
                type="time"
                value={prefProductiveStart}
                onChange={(e) => setPrefProductiveStart(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm"
                disabled={!token}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span className="text-[12px] font-semibold text-slate-600">Plage productive - fin</span>
              <input
                type="time"
                value={prefProductiveEnd}
                onChange={(e) => setPrefProductiveEnd(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm"
                disabled={!token}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span className="text-[12px] font-semibold text-slate-600">Charge max / jour (h)</span>
              <input
                type="number"
                value={prefLoadLimit}
                onChange={(e) => setPrefLoadLimit(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm"
                placeholder="ex: 6"
                min="0"
                step="0.5"
                disabled={!token}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span className="text-[12px] font-semibold text-slate-600">Durée de session (min)</span>
              <input
                type="number"
                value={prefSession}
                onChange={(e) => setPrefSession(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm"
                placeholder="ex: 50"
                min="0"
                step="5"
                disabled={!token}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
              <span className="text-[12px] font-semibold text-slate-600">Jours off (séparés par des virgules)</span>
              <input
                type="text"
                value={prefDaysOff}
                onChange={(e) => setPrefDaysOff(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm"
                placeholder="lundi, jeudi"
                disabled={!token}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
              <span className="text-[12px] font-semibold text-slate-600">Tâches douloureuses (virgules)</span>
              <input
                type="text"
                value={prefPainfulTasks}
                onChange={(e) => setPrefPainfulTasks(e.target.value)}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm"
                placeholder="rappels RH, reporting"
                disabled={!token}
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updatePreferences.mutate()}
              disabled={!token || updatePreferences.status === "pending"}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
            >
              Enregistrer
            </button>
            {updatePreferences.status === "pending" ? <span className="text-xs text-slate-600">Enregistrement...</span> : null}
          </div>
        </div>
      </CardContainer>

      <CardContainer title="Historique récent" icon={<CalendarClock className="h-5 w-5 text-blue-600" />} className="lg:col-span-1">
        <div className="flex flex-col gap-3 text-sm text-slate-700">
          {historyLoading ? <p className="text-sm text-slate-600">Chargement de l'historique...</p> : null}
          {historyData ? (
            <div className="grid grid-cols-3 gap-2 text-center text-[12px] font-semibold text-slate-600">
              <span className="rounded-lg border border-slate-200 bg-white px-2 py-1">{historyData.tasks.length} tâches</span>
              <span className="rounded-lg border border-slate-200 bg-white px-2 py-1">{historyData.events.length} événements</span>
              <span className="rounded-lg border border-slate-200 bg-white px-2 py-1">{historyData.projects.length} projets</span>
            </div>
          ) : token ? (
            <p className="text-xs text-slate-500">Aucune donnée pour l'instant.</p>
          ) : (
            <p className="text-xs text-slate-500">Connectez-vous pour charger l'historique.</p>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold text-slate-600" aria-hidden="true">Journal agent</p>
              <div className="inline-flex gap-1 rounded-full bg-slate-100 p-0.5 text-[11px] font-medium text-slate-600">
                {[
                  { key: "all", label: "Tous" },
                  { key: "plan", label: "Plan" },
                  { key: "chat", label: "Chat" },
                  { key: "automation", label: "Automation" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setAgentHistoryFilter(opt.key as typeof agentHistoryFilter)}
                    className={`rounded-full px-2 py-0.5 transition ${
                      agentHistoryFilter === opt.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {filteredAgentLogs.length ? (
              <ul className="space-y-2">
                {filteredAgentLogs.slice(0, 10).map((log) => (
                  <li key={log.id} className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700">
                    <p className="font-semibold text-slate-800">{log.action}</p>
                    <p className="text-slate-600 line-clamp-3">{log.rationale}</p>
                    <p className="text-[11px] text-slate-500">{new Date(log.created_at).toLocaleString("fr-FR")}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">Aucun log agent pour ce filtre.</p>
            )}
          </div>
        </div>
      </CardContainer>
    </section>
  );
}
