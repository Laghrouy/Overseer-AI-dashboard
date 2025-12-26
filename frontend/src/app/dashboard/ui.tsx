"use client";

import { useMemo, type ReactNode } from "react";
import { CalendarClock } from "lucide-react";
import { useTheme } from "../providers";
import type { AgendaEvent, Task } from "@/lib/types";
import { computeLoad, isSameDay, startOfWeek } from "@/lib/timeUtils";

export function CardContainer({ title, icon, children, className = "" }: { title: string; icon: ReactNode; children: ReactNode; className?: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div
      className={`flex flex-col gap-4 rounded-xl p-5 shadow-lg shadow-slate-200 ${
        isDark ? "bg-slate-900/80 border border-slate-700 text-slate-100" : "bg-white/80 text-slate-900"
      } ${className}`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-inherit">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

export function StatCard({ icon, title, value, detail }: { icon: ReactNode; title: string; value: string | number; detail: string }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        isDark ? "border-slate-700 bg-slate-900/80 text-slate-100" : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-inherit">
          {icon}
          <span>{title}</span>
        </div>
        <span className="text-lg font-semibold text-inherit">{value}</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

export function HeatmapCard({ events }: { events: AgendaEvent[] }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const data = useMemo(() => weekLoadHeatmap(events), [events]);
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        isDark ? "border-slate-700 bg-slate-900/80 text-slate-100" : "border-slate-200 bg-white text-slate-800"
      }`}
    >
      <div className="flex items-center justify-between text-sm font-medium text-inherit">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-indigo-600" />
          <span>Charge hebdo</span>
        </div>
        <span className={isDark ? "text-xs text-slate-400" : "text-xs text-slate-500"}>Heures planifiées</span>
      </div>
      <div className={`mt-3 grid grid-cols-7 gap-1 text-center text-[11px] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
        {data.map((d, idx) => {
          const intensity = d.ratio;
          const bg = intensity === 0 ? "bg-slate-100" : intensity < 0.34 ? "bg-indigo-100" : intensity < 0.67 ? "bg-indigo-300" : "bg-indigo-500";
          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              <div className={`h-10 w-full rounded-md ${bg}`} title={`${d.hours.toFixed(1)} h`} />
              <span className="text-[10px] font-semibold">{d.date.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ActionButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
        isDark ? "border-slate-600 bg-slate-900 text-slate-100 hover:border-slate-500" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function PriorityBadge({ priority }: { priority: Task["priority"] }) {
  const map: Record<Task["priority"], string> = {
    basse: "bg-emerald-100 text-emerald-700",
    normale: "bg-blue-100 text-blue-700",
    haute: "bg-rose-100 text-rose-700",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${map[priority]}`}>{priority === "haute" ? "Haute" : priority === "normale" ? "Normale" : "Basse"}</span>;
}

export function StatusDot({ status }: { status: Task["status"] }) {
  const map: Record<Task["status"], string> = {
    a_faire: "bg-slate-300",
    en_cours: "bg-amber-400",
    terminee: "bg-emerald-500",
  };
  return <span className={`h-3 w-3 rounded-full ${map[status]}`} aria-hidden />;
}

function weekLoadHeatmap(events: AgendaEvent[]) {
  const start = startOfWeek(new Date());
  const days = Array.from({ length: 7 }).map((_, idx) => {
    const date = new Date(start);
    date.setDate(start.getDate() + idx);
    const daily = events.filter((e) => isSameDay(new Date(e.start), date));
    const hours = computeLoad(daily);
    return { date, hours };
  });
  const max = Math.max(...days.map((d) => d.hours), 0.1);
  return days.map((d) => ({ ...d, ratio: Math.min(d.hours / max, 1) }));
}