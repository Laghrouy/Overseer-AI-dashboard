"use client";

import { createContext, useContext } from "react";

export type DashboardView =
  | "dashboard"
  | "agenda"
  | "tasks-projects"
  | "agent"
  | "study"
  | "automations"
  | "commands"
  | "feedback"
  | "links";

export const DashboardViewContext = createContext<DashboardView>("dashboard");

export function useDashboardView(): DashboardView {
  return useContext(DashboardViewContext);
}