import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import Fuse from "fuse.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiAgentChat, apiChatSummary, apiCreateEvent, apiDeleteEvent, apiEvents, apiExportIcs, apiImportIcs, apiUpdateEvent } from "@/lib/api";
import type { AgendaEvent, ChatMessage } from "@/lib/types";
import { isSameDay, computeLoad, startOfWeek, inRange, computeDailyLoads, startOfDay } from "@/lib/timeUtils";
import { useAuthStore } from "@/store/auth";

export type AgendaViewMode = "jour" | "semaine" | "mois" | "annee" | "liste";

export function useAgendaController() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<AgendaViewMode>("jour");
  const [filterImportant, setFilterImportant] = useState(false);
  const [filterTypes, setFilterTypes] = useState<{ fixe: boolean; propose: boolean }>({ fixe: true, propose: true });
  const [searchQuery, setSearchQuery] = useState("");

  const eventsQuery = useQuery({
    queryKey: ["events", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const events = await apiEvents(token as string);
      return events.map<AgendaEvent>((e) => ({
        id: String(e.id),
        title: e.title,
        start: e.start,
        end: e.end,
        type: e.kind,
        category: e.category || "general",
        description: e.description ?? undefined,
        note: e.note ?? undefined,
        location: e.location ?? undefined,
        url: e.url ?? undefined,
        color: e.color ?? undefined,
        important: Boolean(e.important),
        isAllDay: Boolean(e.is_all_day),
        attachments: e.attachments ?? undefined,
        recurrence: (e.recurrence as AgendaEvent["recurrence"]) ?? null,
        recurrenceInterval: e.recurrence_interval ?? null,
        recurrenceUntil: e.recurrence_until ?? undefined,
        recurrenceCustom: e.recurrence_custom ?? null,
        taskId: e.task_id ? String(e.task_id) : undefined,
      }));
    },
  });

  const eventsData = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  const filteredEvents = useMemo(() => {
    return eventsData.filter((e) => {
      if (filterImportant && !e.important) return false;
      if (!filterTypes.fixe && e.type === "fixe") return false;
      if (!filterTypes.propose && e.type === "propose") return false;
      return true;
    });
  }, [eventsData, filterImportant, filterTypes]);

  const fuse = useMemo(() => new Fuse(filteredEvents, { keys: ["title", "description", "note", "location"], threshold: 0.3 }), [filteredEvents]);
  const searchResults = useMemo(() => (searchQuery.trim() ? fuse.search(searchQuery).map((r) => r.item).slice(0, 12) : []), [fuse, searchQuery]);

  const dayEvents = useMemo(
    () => filteredEvents.filter((e) => isSameDay(new Date(e.start), selectedDate)),
    [filteredEvents, selectedDate]
  );

  const shiftDate = useCallback(
    (mode: AgendaViewMode, delta: number) => {
      const base = new Date(selectedDate);
      if (mode === "jour" || mode === "liste") base.setDate(base.getDate() + delta);
      else if (mode === "semaine") base.setDate(base.getDate() + delta * 7);
      else if (mode === "mois") base.setMonth(base.getMonth() + delta);
      else if (mode === "annee") base.setFullYear(base.getFullYear() + delta);
      setSelectedDate(base);
    },
    [selectedDate]
  );

  const createEvent = useMutation({
    mutationFn: apiCreateEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", token] });
    },
  });

  const updateEvent = useMutation({
    mutationFn: apiUpdateEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", token] });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: apiDeleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", token] });
    },
  });

  const importIcs = useMutation({
    mutationFn: (file: File) => apiImportIcs(token as string, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events", token] }),
  });

  const exportIcs = useMutation({
    mutationFn: () => apiExportIcs(token as string),
  });

  const handleIcsUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !token) return;
    importIcs.mutate(file);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!token) return;
    deleteEvent.mutate(eventId);
  };

  // Agent chat helpers (kept minimal for agenda page)
  const [chatTone, setChatTone] = useState<"formel" | "detendu">("detendu");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [clarifyPrompt, setClarifyPrompt] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);

  const chatMutation = useMutation({
    mutationFn: () => apiAgentChat(token as string, { message: chatInput, history: chatHistory }),
    onSuccess: (reply) => {
      setChatHistory((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: chatInput }, { id: crypto.randomUUID(), role: "assistant", content: reply.reply }]);
      setChatInput("");
    },
  });

  const chatSummary = useMutation({
    mutationFn: () => apiChatSummary(token as string, chatHistory),
    onSuccess: (res) => setSummaryText(res.summary ?? res),
  });

  const confirmSendPending = useCallback(() => {
    if (pendingMessage) {
      setChatInput(pendingMessage);
      setPendingMessage(null);
      chatMutation.mutate();
    }
  }, [chatMutation, pendingMessage]);

  const viewModeHelpers = useMemo(() => {
    const synthRange = (() => {
      const start = viewMode === "jour" ? startOfDay(selectedDate) : startOfWeek(selectedDate);
      const end = new Date(start);
      end.setDate(start.getDate() + (viewMode === "jour" ? 1 : 7));
      return { start, end };
    })();
    const synthEvents = filteredEvents.filter((e) => inRange(new Date(e.start), synthRange.start, synthRange.end));
    const weeklyLoads = computeDailyLoads(filteredEvents, synthRange.start, synthRange.end);
    return {
      synthRange,
      synthEvents,
      weeklyLoads,
      loadHours: computeLoad(viewMode === "jour" ? dayEvents : filteredEvents),
    };
  }, [dayEvents, filteredEvents, selectedDate, viewMode]);

  return {
    token,
    eventsQuery,
    eventsData: filteredEvents,
    eventsLoading: eventsQuery.isLoading,
    selectedDate,
    setSelectedDate,
    viewMode,
    setViewMode,
    shiftDate,
    dayEvents,
    handleIcsUpload,
    importIcs,
    exportIcs,
    handleDeleteEvent,
    filterImportant,
    setFilterImportant,
    filterTypes,
    setFilterTypes,
    searchQuery,
    setSearchQuery,
    searchResults,
    viewModeHelpers,
    createEvent,
    updateEvent,
    deleteEvent,
    // chat
    chatTone,
    setChatTone,
    chatHistory,
    setChatHistory,
    chatInput,
    setChatInput,
    clarifyPrompt,
    setClarifyPrompt,
    pendingMessage,
    setPendingMessage,
    summaryText,
    chatSummary,
    chatMutation,
    confirmSendPending,
  } as const;
}
