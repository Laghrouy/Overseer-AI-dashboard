"use client";

/* eslint-disable react/no-unescaped-entities, @typescript-eslint/no-unused-vars */

import { CalendarClock, MessageCircle, Sparkles } from "lucide-react";
import { CardContainer } from "../ui";
import type { AgendaEvent, ChatMessage } from "@/lib/types";
import type { UseMutationResult } from "@tanstack/react-query";

export function AgendaChatView(props: {
  token?: string | null;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  viewMode: "jour" | "semaine" | "mois" | "annee" | "liste";
  setViewMode: (v: "jour" | "semaine" | "mois" | "annee" | "liste") => void;
  eventsLoading: boolean;
  dayEvents: AgendaEvent[];
  filteredEvents: AgendaEvent[];
  viewModeRender: React.ReactNode;
  setShowAddModal: (v: boolean) => void;
  setShowSearchModal: (v: boolean) => void;
  handleIcsUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  importIcsLoading: boolean;
  exportIcs: UseMutationResult<Blob, Error, void, unknown>;
  handleDeleteEvent: (id: string) => void;
  openEditModal: (event: AgendaEvent) => void;
  setViewModeDay: () => void;
  shiftDate: (mode: "jour" | "semaine" | "mois" | "annee" | "liste", delta: number) => void;
  handleSendChat: () => void;
  chatSummary: UseMutationResult<{ summary: string }, Error, void, unknown>;
  chatTone: "formel" | "detendu";
  setChatTone: (v: "formel" | "detendu") => void;
  chatHistory: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  clarifyPrompt: string | null;
  pendingMessage: string | null;
  confirmSendPending: () => void;
  setClarifyPrompt: (v: string | null) => void;
  setPendingMessage: (v: string | null) => void;
  summaryText: string | null;
  chatMutationLoading: boolean;
  layout?: "column" | "row";
  showAgendaCard?: boolean;
}) {
  const {
    token,
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    eventsLoading,
    viewModeRender,
    setShowAddModal,
    setShowSearchModal,
    handleIcsUpload,
    importIcsLoading,
    exportIcs,
    shiftDate,
    setViewModeDay,
    handleSendChat,
    chatSummary,
    chatTone,
    setChatTone,
    chatHistory,
    chatInput,
    setChatInput,
    clarifyPrompt,
    confirmSendPending,
    setClarifyPrompt,
    setPendingMessage,
    summaryText,
    chatMutationLoading,
  } = props;
  const layout = props.layout ?? "column";
  const showAgendaCard = props.showAgendaCard ?? true;
  const isRowLayout = layout === "row" && showAgendaCard;
  const containerClass = isRowLayout ? "grid gap-6 lg:grid-cols-3" : "flex flex-col gap-6";
  const agendaCardClass = isRowLayout ? "lg:col-span-2" : "";
  const chatCardClass = isRowLayout ? "lg:col-span-1" : "";

  return (
    <section className={containerClass}>
      {showAgendaCard && (
        <CardContainer
          title="Agenda du jour"
          icon={<CalendarClock className="h-5 w-5 text-blue-600" />}
          className={agendaCardClass}
        >
          <div className="flex flex-col gap-3">
            {token ? (
              <p className="text-xs text-slate-500">Agenda chargé depuis l'API.</p>
            ) : (
              <p className="text-xs text-slate-500">Connectez-vous pour voir vos événements synchronisés.</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold transition hover:border-slate-300 hover:shadow-sm">
                <input type="file" accept=".ics,text/calendar" className="hidden" onChange={handleIcsUpload} />
                <Sparkles className="h-4 w-4" />
                Importer un ICS
              </label>
              {importIcsLoading ? <span>Import en cours...</span> : null}
              <button
                onClick={() => exportIcs.mutate()}
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
                  {([
                    ["jour", "Jour"],
                    ["semaine", "Semaine"],
                    ["mois", "Mois"],
                    ["annee", "Année"],
                    ["liste", "Liste"],
                  ] as const).map(([key, label]) => (
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
                  <button onClick={setViewModeDay} className="px-2 py-1">
                    Aujourd'hui
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
            {eventsLoading ? (
              <p className="text-sm text-slate-600">Chargement de l'agenda...</p>
            ) : (
              viewModeRender
            )}
          </div>
        </CardContainer>
      )}

      <CardContainer title="Chat avec l'agent" icon={<MessageCircle className="h-5 w-5 text-amber-600" />} className={chatCardClass}>
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Ton</span>
              <div className="flex rounded-md border border-slate-200">
                {(["formel", "detendu"] as const).map((tone) => (
                  <button
                    key={tone}
                    onClick={() => setChatTone(tone as typeof chatTone)}
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
              onClick={handleSendChat}
              disabled={!token || !chatInput.trim() || chatMutationLoading}
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
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm ${isUser ? "border-slate-200 bg-white" : "border-amber-100 bg-amber-50"}`}>
      <span className="text-[11px] font-semibold text-slate-500">{isUser ? "Vous" : "Agent"}</span>
      <p className="text-slate-800 whitespace-pre-line">{message.content}</p>
    </div>
  );
}
