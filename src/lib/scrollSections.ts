import type { RefObject } from "react";

export const DASHBOARD_SECTIONS = [
  { id: "dashboard", label: "Today" },
  { id: "operations", label: "Operations" },
  { id: "agents", label: "Agents" },
  { id: "decision", label: "Decision" },
  { id: "audit", label: "Audit" },
] as const;

export const SECTION_IDS = DASHBOARD_SECTIONS.map((section) => section.id);

export type DashboardScreenId = (typeof DASHBOARD_SECTIONS)[number]["id"];

export function scrollToSection(
  scrollRootRef: RefObject<HTMLElement | null>,
  id: string,
): void {
  const root = scrollRootRef.current;
  const target = document.getElementById(id);
  if (!root || !target) {
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const rootRect = root.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const top = root.scrollTop + (targetRect.top - rootRect.top) - 16;
  root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}