"use client";

/* eslint-disable react/no-unescaped-entities */

import { BarChart, Sparkles, TrendingUp } from "lucide-react";
import { CardContainer } from "../ui";
import type { FeedbackScope, FeedbackStats } from "@/lib/types";

export function FeedbackView({
  feedbackScope,
  setFeedbackScope,
  feedbackScopeLabels,
  feedbackRangeLabel,
  feedbackLoading,
  feedbackStats,
}: {
  feedbackScope: FeedbackScope;
  setFeedbackScope: (scope: FeedbackScope) => void;
  feedbackScopeLabels: Record<FeedbackScope, string>;
  feedbackRangeLabel: string;
  feedbackLoading: boolean;
  feedbackStats: FeedbackStats;
}) {
  return (
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
}
