"use client";

/* eslint-disable react/no-unescaped-entities */

import { AlertTriangle, Copy, Link2, Plus, Share2, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { CardContainer } from "../ui";
import { formatDateRange } from "../formatters";
import type { AgendaEvent } from "@/lib/types";

type QuickAction = "organiser" | "bilan" | "optimiser";

type QuickLink = { id: string; title: string; url: string };

type SynthAction = { title: string; detail: string; onClick: () => void };
type SynthAlert = { title: string; detail: string; tone: "info" | "warn" };

export function LinksView(props: {
  synthScope: "day" | "week";
  setSynthScope: (scope: "day" | "week") => void;
  copySummary: () => Promise<void> | void;
  shareSummary: () => Promise<void> | void;
  quickAction: (action: QuickAction) => void;
  synthLoadHours: number;
  synthOpenTasks: number;
  overdueCount: number;
  nextEvents: AgendaEvent[];
  alertsFeed: SynthAlert[];
  timelineNext: AgendaEvent[];
  synthActions: SynthAction[];
  quickLinks: QuickLink[];
  showQuickLinkForm: boolean;
  setShowQuickLinkForm: (value: boolean) => void;
  newLinkTitle: string;
  newLinkUrl: string;
  setNewLinkTitle: (v: string) => void;
  setNewLinkUrl: (v: string) => void;
  addQuickLink: () => void;
  removeQuickLink: (id: string) => void;
  editQuickLink: (id: string) => void;
  showQuickLinkModal: boolean;
  cancelQuickLink: () => void;
  editLinkTitle: string;
  setEditLinkTitle: (v: string) => void;
  editLinkUrl: string;
  setEditLinkUrl: (v: string) => void;
  saveQuickLink: () => void;
  faviconUrl: (url: string) => string | null;
}) {
  const {
    synthScope,
    setSynthScope,
    copySummary,
    shareSummary,
    quickAction,
    synthLoadHours,
    synthOpenTasks,
    overdueCount,
    nextEvents,
    alertsFeed,
    timelineNext,
    synthActions,
    quickLinks,
    showQuickLinkForm,
    setShowQuickLinkForm,
    newLinkTitle,
    newLinkUrl,
    setNewLinkTitle,
    setNewLinkUrl,
    addQuickLink,
    removeQuickLink,
    editQuickLink,
    showQuickLinkModal,
    cancelQuickLink,
    editLinkTitle,
    setEditLinkTitle,
    editLinkUrl,
    setEditLinkUrl,
    saveQuickLink,
    faviconUrl,
  } = props;

  return (
    <section className="flex flex-wrap items-start gap-6">
      <CardContainer
        title="Synthèse rapide"
        icon={<Sparkles className="h-5 w-5 text-slate-700" />}
        className="h-full min-w-[320px] max-w-4xl lg:w-auto"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-600">
          <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
            <button
              onClick={() => setSynthScope("day")}
              className={`rounded-full px-2 py-1 ${synthScope === "day" ? "bg-slate-900 text-white" : ""}`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setSynthScope("week")}
              className={`rounded-full px-2 py-1 ${synthScope === "week" ? "bg-slate-900 text-white" : ""}`}
            >
              Semaine
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copySummary}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-slate-300"
            >
              <Copy className="h-3.5 w-3.5" /> Copier
            </button>
            <button
              onClick={shareSummary}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-slate-300"
            >
              <Share2 className="h-3.5 w-3.5" /> Partager
            </button>
            <button
              onClick={() => quickAction("optimiser")}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <TrendingUp className="h-3.5 w-3.5" /> Appliquer le plan IA
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-4 text-sm text-slate-800">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">Charge</p>
            <p className="text-lg font-semibold text-slate-900">{synthLoadHours.toFixed(1)} h</p>
            <p className="text-[11px] text-slate-500">Période {synthScope === "day" ? "jour" : "semaine"}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">Tâches ouvertes</p>
            <p className="text-lg font-semibold text-slate-900">{synthOpenTasks}</p>
            <p className="text-[11px] text-slate-500">Incl. sans échéance</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">Retards</p>
            <p className={`text-lg font-semibold ${overdueCount ? "text-amber-700" : "text-slate-900"}`}>{overdueCount}</p>
            <p className="text-[11px] text-slate-500">À replanifier</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-500">Prochain bloc</p>
            <p className="text-sm font-semibold text-slate-900">
              {nextEvents.length
                ? `${new Date(nextEvents[0].start).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} · ${nextEvents[0].title}`
                : "Aucun"}
            </p>
            <p className="text-[11px] text-slate-500">Coordonnées visibles</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {alertsFeed.map((alert, idx) => (
            <div
              key={`${alert.title}-${idx}`}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm ${alert.tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-800"}`}
            >
              <AlertTriangle className="h-4 w-4" />
              <div className="flex-1">
                <p className="font-semibold">{alert.title}</p>
                <p className="text-[11px] text-slate-600">{alert.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-600">Prochaines 4 h</p>
            <div className="mt-2 space-y-2 text-sm text-slate-800">
              {timelineNext.length ? (
                timelineNext.map((evt) => (
                  <div key={evt.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="font-semibold">{evt.title}</p>
                    <p className="text-[11px] text-slate-600">{formatDateRange(evt.start, evt.end, evt.isAllDay)}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Aucun bloc planifié, espace libre.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-600">Actions recommandées</p>
            <div className="mt-2 space-y-2 text-sm text-slate-800">
              {synthActions.map((action, idx) => (
                <div key={`${action.title}-${idx}`} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="font-semibold">{action.title}</p>
                    <p className="text-[11px] text-slate-600">{action.detail}</p>
                  </div>
                  <button
                    onClick={action.onClick}
                    className="text-[11px] font-semibold text-indigo-700 underline underline-offset-2"
                  >
                    Faire
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContainer>

      <CardContainer
        title="Accès rapide"
        icon={<Link2 className="h-5 w-5 text-blue-600" />}
        className="h-full min-w-[280px] max-w-md lg:w-auto"
      >
        <div className="flex items-center justify-between text-xs text-slate-600">
          <p className="text-[11px] font-semibold">Vos sites favoris en tuiles.</p>
          <button
            onClick={() => setShowQuickLinkForm((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 hover:border-slate-300"
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </button>
        </div>
        {showQuickLinkForm ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <input
              type="text"
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
              placeholder="Nom du site"
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              onClick={addQuickLink}
              disabled={!newLinkTitle.trim() || !newLinkUrl.trim()}
              className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Ajouter
            </button>
          </div>
        ) : null}
        <div className="mt-3 grid gap-3 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
          {quickLinks.map((link) => {
            const fav = faviconUrl(link.url);
            const badge = link.title.slice(0, 1).toUpperCase();
            return (
              <div key={link.id} className="flex min-w-0 w-full flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                <div className="flex w-full items-start justify-between">
                  <div className="flex items-center gap-2">
                    {fav ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fav} alt="favicon" className="h-9 w-9 rounded-full" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                        {badge}
                      </div>
                    )}
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-semibold text-slate-900 line-clamp-1">{link.title}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeQuickLink(link.id)}
                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
                    aria-label="Supprimer le lien"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex w-full items-center justify-center gap-2 text-[11px]">
                  <button
                    onClick={() => editQuickLink(link.id)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-800 transition hover:border-slate-300"
                  >
                    Modifier
                  </button>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-1 items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    Ouvrir
                  </a>
                </div>
              </div>
            );
          })}
          {!quickLinks.length ? <p className="text-xs text-slate-500">Ajoutez vos liens favoris.</p> : null}
        </div>
      </CardContainer>

      {showQuickLinkModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/40" onClick={cancelQuickLink} />
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl shadow-slate-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Modifier le lien</p>
                <h4 className="text-lg font-semibold text-slate-900">Accès rapide</h4>
              </div>
              <button onClick={cancelQuickLink} className="rounded-md px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                Fermer
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-800">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Titre</label>
                <input
                  type="text"
                  value={editLinkTitle}
                  onChange={(e) => setEditLinkTitle(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2"
                  placeholder="Nom du site"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">URL</label>
                <input
                  type="text"
                  value={editLinkUrl}
                  onChange={(e) => setEditLinkUrl(e.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={cancelQuickLink}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={saveQuickLink}
                disabled={!editLinkTitle.trim() || !editLinkUrl.trim()}
                className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
