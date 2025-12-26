import { AgendaEvent } from "./types";

export function computeLoad(events: AgendaEvent[]) {
  const minutes = events.reduce((acc, event) => {
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    return acc + Math.max(0, end - start);
  }, 0);
  return minutes / 1000 / 60 / 60;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfWeek(d: Date) {
  const copy = new Date(d);
  const day = (copy.getDay() + 6) % 7; // Monday=0
  copy.setDate(copy.getDate() - day);
  return copy;
}

export function inRange(value: Date, start: Date, end: Date) {
  return value >= start && value < end;
}

export function timeOnDate(base: Date, time: string) {
  const [h, m] = time.split(":").map((v) => Number(v) || 0);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export function computeWorkWindowHours(startTime: string, endTime: string) {
  const now = new Date();
  const start = timeOnDate(now, startTime || "08:00");
  const end = timeOnDate(now, endTime || "18:00");
  const hours = Math.max(0, (end.getTime() - start.getTime()) / 1000 / 60 / 60);
  return hours || 8;
}

export function computeFreeSlotsForDay(events: AgendaEvent[], day: Date, startTime: string, endTime: string, minMinutes = 30) {
  const dayStart = timeOnDate(day, startTime || "08:00");
  let dayEnd = timeOnDate(day, endTime || "18:00");
  if (dayEnd <= dayStart) {
    dayEnd = new Date(dayStart.getTime() + 8 * 60 * 60 * 1000);
  }

  const dayEvents = sortEvents(events.filter((e) => isSameDay(new Date(e.start), day)));
  const normalized = dayEvents
    .map((e) => ({ start: new Date(e.start), end: new Date(e.end) }))
    .filter((e) => e.end > dayStart && e.start < dayEnd)
    .map((e) => ({ start: e.start < dayStart ? dayStart : e.start, end: e.end > dayEnd ? dayEnd : e.end }));

  const slots: Array<{ start: Date; end: Date; durationMinutes: number }> = [];
  let cursor = dayStart;
  normalized.forEach(({ start, end }) => {
    if (start.getTime() - cursor.getTime() >= minMinutes * 60 * 1000) {
      slots.push({ start: new Date(cursor), end: new Date(start), durationMinutes: Math.round((start.getTime() - cursor.getTime()) / 60000) });
    }
    if (end > cursor) cursor = end;
  });

  if (dayEnd.getTime() - cursor.getTime() >= minMinutes * 60 * 1000) {
    slots.push({ start: new Date(cursor), end: new Date(dayEnd), durationMinutes: Math.round((dayEnd.getTime() - cursor.getTime()) / 60000) });
  }
  return slots;
}

export function detectConflictsForDay(events: AgendaEvent[], day: Date) {
  const dayEvents = sortEvents(events.filter((e) => isSameDay(new Date(e.start), day)));
  const conflicts: Array<{ a: AgendaEvent; b: AgendaEvent; overlapMinutes: number }> = [];
  let current: { event: AgendaEvent; end: Date } | null = null;
  dayEvents.forEach((event) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    if (current && start < current.end) {
      const overlapMs = current.end.getTime() - start.getTime();
      conflicts.push({ a: current.event, b: event, overlapMinutes: Math.round(overlapMs / 60000) });
      if (end > current.end) current = { event, end };
    } else {
      current = { event, end };
    }
  });
  return conflicts;
}

export function computeDailyLoads(events: AgendaEvent[], start: Date, end: Date) {
  const days: Array<{ date: Date; hours: number }> = [];
  for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
    const day = new Date(cursor);
    const dailyEvents = events.filter((e) => isSameDay(new Date(e.start), day));
    days.push({ date: day, hours: computeLoad(dailyEvents) });
  }
  return days;
}

export function analyzeDay(
  events: AgendaEvent[],
  day: Date,
  workStart: string,
  workEnd: string,
  overloadLimitHours: number
) {
  const freeSlots = computeFreeSlotsForDay(events, day, workStart, workEnd);
  const conflicts = detectConflictsForDay(events, day);
  const load = computeLoad(events.filter((e) => isSameDay(new Date(e.start), day)));
  const windowHours = computeWorkWindowHours(workStart, workEnd);
  const overload = load > overloadLimitHours;
  const underUsedHours = Math.max(0, windowHours - load);
  return { freeSlots, conflicts, load, windowHours, overload, underUsedHours };
}

export function sortEvents(events: AgendaEvent[]) {
  return [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}
