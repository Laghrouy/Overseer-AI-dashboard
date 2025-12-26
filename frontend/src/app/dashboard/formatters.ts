import { isSameDay } from "@/lib/timeUtils";

export function formatTime(value?: string) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateRange(start: string, end: string, isAllDay?: boolean) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameDay = isSameDay(startDate, endDate);
  const dayLabel = startDate.toLocaleDateString("fr-FR", { weekday: "short", month: "short", day: "numeric" });

  if (isAllDay) return `${dayLabel} · Toute la journée`;

  const startTime = formatTime(start);
  const endTime = formatTime(end);

  if (sameDay) return `${dayLabel} · ${startTime} – ${endTime}`;

  const endLabel = endDate.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
  return `${dayLabel} ${startTime} → ${endLabel} ${endTime}`;
}