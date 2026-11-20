import type { DemoRole } from "./shared-case";

export const DEPARTMENT_SCREENS = [
  { id: "gate-map", label: "Gate Map", role: "station-ops", ready: true },
  { id: "tasks", label: "Tasks", role: "station-ops", ready: true },
  { id: "alerts", label: "Alerts", role: "station-ops", ready: true },
  { id: "flight-watch", label: "Flight Watch", role: "dispatch", ready: true },
  { id: "weather", label: "Weather", role: "dispatch", ready: true },
  { id: "alerts", label: "Alerts", role: "dispatch", ready: true },
  { id: "affected-passengers", label: "Affected Passengers", role: "customer-service", ready: true },
  { id: "rebooking", label: "Rebooking", role: "customer-service", ready: true },
  { id: "messages", label: "Messages", role: "customer-service", ready: true },
] as const;

export const SHARED_NAV = [{ id: "activity", label: "Activity", ready: true }] as const;

export const UTILITY_SCREENS = [
  { id: "decision", label: "Decision", ready: true },
  { id: "audit", label: "Audit", ready: true },
] as const;

export type UtilityScreenId = (typeof UTILITY_SCREENS)[number]["id"];

export const UTILITY_SCREEN_IDS = UTILITY_SCREENS.map((item) => item.id);

export function isUtilityScreen(id: DepartmentScreenId): id is UtilityScreenId {
  return (UTILITY_SCREEN_IDS as readonly string[]).includes(id);
}

export type SharedNavId = (typeof SHARED_NAV)[number]["id"];

export type DepartmentScreenId = (typeof DEPARTMENT_SCREENS)[number]["id"] | SharedNavId | UtilityScreenId;

export const DEFAULT_SCREEN: Record<DemoRole, DepartmentScreenId> = {
  "station-ops": "gate-map",
  dispatch: "flight-watch",
  "customer-service": "affected-passengers",
};

export function linksForRole(role: DemoRole) {
  return [...DEPARTMENT_SCREENS.filter((item) => item.role === role), ...SHARED_NAV];
}