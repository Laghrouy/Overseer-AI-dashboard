import { describe, expect, it } from "vitest";
import {
  analyzeDay,
  computeFreeSlotsForDay,
  computeLoad,
  computeDailyLoads,
  computeWorkWindowHours,
  detectConflictsForDay,
  startOfDay,
} from "./timeUtils";
import type { AgendaEvent } from "./types";

describe("timeUtils", () => {
  const baseDay = startOfDay(new Date("2025-12-25T10:00:00Z"));
  const events: AgendaEvent[] = [
    { id: "e1", title: "Morning", start: "2025-12-25T08:00:00Z", end: "2025-12-25T09:00:00Z", type: "fixe" },
    { id: "e2", title: "Overlap", start: "2025-12-25T08:30:00Z", end: "2025-12-25T10:00:00Z", type: "fixe" },
    { id: "e3", title: "Afternoon", start: "2025-12-25T14:00:00Z", end: "2025-12-25T15:00:00Z", type: "propose" },
  ];

  it("computes load in hours", () => {
    expect(computeLoad(events)).toBeCloseTo(3.5);
  });

  it("finds free slots within work window", () => {
    const slots = computeFreeSlotsForDay(events, baseDay, "08:00", "18:00", 30);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].durationMinutes).toBeGreaterThan(0);
    const last = slots.at(-1)!;
    expect(last.durationMinutes).toBeGreaterThan(0);
  });

  it("detects conflicts", () => {
    const conflicts = detectConflictsForDay(events, baseDay);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].overlapMinutes).toBe(30);
  });

  it("analyzes overload and underuse", () => {
    const analysis = analyzeDay(events, baseDay, "08:00", "18:00", 2.5);
    expect(analysis.overload).toBe(true);
    expect(analysis.underUsedHours).toBeGreaterThan(0);
  });

  it("computes work window hours even if end before start", () => {
    expect(computeWorkWindowHours("18:00", "08:00")).toBeCloseTo(8);
  });

  it("snapshots daily loads over a week", () => {
    const loads = computeDailyLoads(events, baseDay, "08:00", "18:00");
    expect(loads).toMatchSnapshot();
  });
});
