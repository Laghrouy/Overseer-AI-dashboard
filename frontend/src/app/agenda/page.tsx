"use client";

/* eslint-disable react/no-unescaped-entities */

import { useState } from "react";
import { CalendarClock, Sparkles, Plus, Trash2, Pencil, ArrowLeft, ArrowRight, Search } from "lucide-react";
import { AgendaChatView } from "../dashboard/views/AgendaChatView";
import { useAgendaController, type AgendaViewMode } from "../features/agenda/controller";
import { isSameDay, startOfWeek } from "@/lib/timeUtils";
import type { AgendaEvent } from "@/lib/types";

export default function AgendaPage() {
  const ctrl = useAgendaController();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [draftNote, setDraftNote] = useState("");

  const resetDraft = () => {
    setDraftTitle("");
    setDraftStart("");
    setDraftEnd("");
    setDraftNote("");
  };

  const openCreate = () => {
    resetDraft();
    setEditingEvent(null);
    setShowAddModal(true);
  };

  const openEdit = (event: AgendaEvent) => {
    setEditingEvent(event);
    setDraftTitle(event.title);
    setDraftStart(toLocalDateTimeInput(event.start));
    setDraftEnd(toLocalDateTimeInput(event.end));
    setDraftNote(event.note ?? "");
    setShowAddModal(true);
  };

  const confirmDelete = (eventId: string) => {
    if (!ctrl.token) return;
    if (!window.confirm("Supprimer cet événement ?")) return;
    ctrl.handleDeleteEvent(eventId);
  };

  const saveEvent = () => {
    if (!draftTitle || !draftStart || !draftEnd) return;
    const payload = {
      title: draftTitle,
      start: new Date(draftStart).toISOString(),
      end: new Date(draftEnd).toISOString(),
      note: draftNote || null,
    };
    if (editingEvent) {
      ctrl.updateEvent.mutate({ id: editingEvent.id, payload: { ...payload, kind: editingEvent.type } });
    } else {
      ctrl.createEvent.mutate({ ...payload, kind: "fixe" });
    }
    setShowAddModal(false);
    resetDraft();
  };

  const agendaViewModeRender = (() => {
    const viewMode = ctrl.viewMode;
    if (viewMode === "jour") {
      if (!ctrl.dayEvents.length) return <p className="text-sm text-slate-600">Aucun événement pour cette date.</p>;
      return ctrl.dayEvents.map((event) => <AgendaItem key={event.id} event={event} onEdit={() => openEdit(event)} onDelete={() => confirmDelete(event.id)} />);
    }
    if (viewMode === "semaine") return <WeekView focusDate={ctrl.selectedDate} events={ctrl.eventsData} onEdit={openEdit} onDelete={confirmDelete} />;
    if (viewMode === "mois")
      return <CalendarGrid focusDate={ctrl.selectedDate} events={ctrl.eventsData} onSelect={(d) => ctrl.setSelectedDate(d)} />;
    if (viewMode === "annee") return <YearView focusDate={ctrl.selectedDate} events={ctrl.eventsData} onSelect={(d) => ctrl.setSelectedDate(d)} />;
    return <ListView events={ctrl.eventsData} onEdit={openEdit} onDelete={confirmDelete} />;
  })();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-white">
          <CalendarClock className="h-4 w-4" />
          <span className="text-sm font-semibold">Agenda</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
          <button onClick={() => ctrl.shiftDate(ctrl.viewMode, -1)} className="flex items-center gap-1 px-2 py-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Précédent
          </button>
          <button onClick={() => ctrl.setSelectedDate(new Date())} className="px-2 py-1 font-semibold">
            Aujourd'hui
          </button>
          <button onClick={() => ctrl.shiftDate(ctrl.viewMode, 1)} className="flex items-center gap-1 px-2 py-1">
            Suivant <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
          {(["jour", "semaine", "mois", "annee", "liste"] as AgendaViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => ctrl.setViewMode(mode)}
              className={`rounded-full px-2 py-1 ${ctrl.viewMode === mode ? "bg-slate-900 text-white" : "text-slate-700"}`}
            >
              {labelView(mode)}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm">
            <Sparkles className="h-4 w-4" /> Importer ICS
            <input type="file" accept=".ics,text/calendar" className="hidden" onChange={ctrl.handleIcsUpload} />
          </label>
          <button
            onClick={() => ctrl.exportIcs.mutate()}
            disabled={!ctrl.token || ctrl.exportIcs.status === "loading"}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm disabled:opacity-60"
          >
            Exporter
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <input
              type="date"
              value={ctrl.selectedDate.toISOString().slice(0, 10)}
              onChange={(e) => ctrl.setSelectedDate(new Date(e.target.value))}
              className="rounded-md border border-slate-200 px-3 py-1"
            />
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1">
              <label className="inline-flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={ctrl.filterImportant}
                  onChange={(e) => ctrl.setFilterImportant(e.target.checked)}
                />
                Important
              </label>
              <label className="inline-flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={ctrl.filterTypes.fixe}
                  onChange={(e) => ctrl.setFilterTypes({ ...ctrl.filterTypes, fixe: e.target.checked })}
                />
                Fixe
              </label>
              <label className="inline-flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={ctrl.filterTypes.propose}
                  onChange={(e) => ctrl.setFilterTypes({ ...ctrl.filterTypes, propose: e.target.checked })}
                />
                Proposé
              </label>
            </div>
            <div className="ml-auto flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
              <Search className="h-3.5 w-3.5" />
              <input
                value={ctrl.searchQuery}
                onChange={(e) => ctrl.setSearchQuery(e.target.value)}
                className="border-none text-sm outline-none"
                placeholder="Rechercher"
              />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {ctrl.eventsLoading ? <p className="text-sm text-slate-600">Chargement de l'agenda...</p> : agendaViewModeRender}
          </div>
          {ctrl.searchQuery.trim() && ctrl.searchResults.length ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-600">Résultats</p>
              <div className="mt-2 flex flex-col gap-2">
                {ctrl.searchResults.map((evt) => (
                  <AgendaItem key={evt.id} event={evt} onEdit={() => openEdit(evt)} onDelete={() => confirmDelete(evt.id)} />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="lg:col-span-1">
          <AgendaChatView
            token={ctrl.token}
            selectedDate={ctrl.selectedDate}
            setSelectedDate={ctrl.setSelectedDate}
            viewMode={ctrl.viewMode}
            setViewMode={ctrl.setViewMode}
            eventsLoading={ctrl.eventsLoading}
            dayEvents={ctrl.dayEvents}
            filteredEvents={ctrl.eventsData}
            viewModeRender={agendaViewModeRender}
            setShowAddModal={setShowAddModal}
            setShowSearchModal={() => {}}
            handleIcsUpload={ctrl.handleIcsUpload}
            importIcsLoading={ctrl.importIcs.isLoading}
            exportIcs={ctrl.exportIcs}
            handleDeleteEvent={ctrl.handleDeleteEvent}
            openEditModal={openEdit}
            setViewModeDay={() => ctrl.setSelectedDate(new Date())}
            shiftDate={ctrl.shiftDate}
            handleSendChat={() => ctrl.chatMutation.mutate()}
            chatSummary={ctrl.chatSummary}
            chatTone={ctrl.chatTone}
            setChatTone={ctrl.setChatTone}
            chatHistory={ctrl.chatHistory}
            chatInput={ctrl.chatInput}
            setChatInput={ctrl.setChatInput}
            clarifyPrompt={ctrl.clarifyPrompt}
            pendingMessage={ctrl.pendingMessage}
            confirmSendPending={ctrl.confirmSendPending}
            setClarifyPrompt={ctrl.setClarifyPrompt}
            setPendingMessage={ctrl.setPendingMessage}
            summaryText={ctrl.summaryText}
            chatMutationLoading={ctrl.chatMutation.isLoading}
          />
        </section>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                {editingEvent ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>{editingEvent ? "Modifier l'événement" : "Nouvel événement"}</span>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-sm text-slate-500">
                Fermer
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-600">Titre</span>
                <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-600">Début</span>
                <input type="datetime-local" value={draftStart} onChange={(e) => setDraftStart(e.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-600">Fin</span>
                <input type="datetime-local" value={draftEnd} onChange={(e) => setDraftEnd(e.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-600">Note</span>
                <textarea value={draftNote} onChange={(e) => setDraftNote(e.target.value)} className="rounded-md border border-slate-200 px-3 py-2" />
              </label>
            </div>
            <div className="mt-4 flex items-center justify-between">
              {editingEvent ? (
                <button
                  onClick={() => {
                    ctrl.handleDeleteEvent(editingEvent.id);
                    setShowAddModal(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                >
                  <Trash2 className="h-4 w-4" /> Supprimer
                </button>
              ) : <span />}
              <div className="flex gap-2">
                <button onClick={() => setShowAddModal(false)} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                  Annuler
                </button>
                <button
                  onClick={saveEvent}
                  disabled={ctrl.createEvent.isLoading || ctrl.updateEvent.isLoading}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                >
                  {editingEvent ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgendaItem({ event, onEdit, onDelete }: { event: AgendaEvent; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{event.title}</p>
          <p className="text-xs text-slate-600">
            {new Date(event.start).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} → {new Date(event.end).toLocaleTimeString("fr-FR", { timeStyle: "short" })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="rounded-full bg-slate-100 px-2 py-1">{event.type === "fixe" ? "Fixe" : "Proposé"}</span>
          {event.important ? <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">★</span> : null}
          {onEdit ? (
            <button onClick={onEdit} className="rounded-full border border-slate-200 px-2 py-1">Éditer</button>
          ) : null}
          {onDelete ? (
            <button onClick={onDelete} className="rounded-full border border-rose-200 px-2 py-1 text-rose-700">Supprimer</button>
          ) : null}
        </div>
      </div>
      {event.note ? <p className="mt-2 text-sm text-slate-700">{event.note}</p> : null}
    </div>
  );
}

function CalendarGrid({ focusDate, events, onSelect }: { focusDate: Date; events: AgendaEvent[]; onSelect: (d: Date) => void }) {
  const [month, setMonth] = useState<Date>(new Date(focusDate));
  const grid = buildMonthGrid(month, events);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-800">
        <button className="rounded-md border border-slate-200 px-2 py-1 text-xs" onClick={() => setMonth(addMonths(month, -1))}>
          ◀
        </button>
        <span>{month.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span>
        <button className="rounded-md border border-slate-200 px-2 py-1 text-xs" onClick={() => setMonth(addMonths(month, 1))}>
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

function labelView(mode: AgendaViewMode) {
  if (mode === "jour") return "Jour";
  if (mode === "semaine") return "Semaine";
  if (mode === "mois") return "Mois";
  if (mode === "annee") return "Année";
  return "Liste";
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

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(base: Date, delta: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function buildMonthGrid(month: Date, events: AgendaEvent[]) {
  const start = startOfWeek(startOfMonth(month));
  const cells = [] as Array<{ key: string; date: Date; inMonth: boolean; events: AgendaEvent[] }>;
  for (let i = 0; i < 42; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = current.toISOString().split("T")[0] + i;
    const dayEvents = events.filter((e) => isSameDay(new Date(e.start), current));
    cells.push({ key, date: current, inMonth: current.getMonth() === month.getMonth(), events: dayEvents });
  }
  return cells;
}
