import { DEMO_STEP_DELAY_MS, PUTER_MODEL } from "./constants";
import { EXTENDED_AGENT_KEYS } from "./agent-slots";
import type { ExtendedAgentKey } from "../types/contracts";

export type DeskPreferences = {
  stepDelayMs: number;
  puterModel: string;
  extendedAgents: Record<ExtendedAgentKey, boolean>;
};

const STORAGE_KEY = "sw-desk-preferences";
const ADMIN_SESSION_KEY = "sw-desk-admin";
const ADMIN_PINS = new Set(["sw-admin", "admin", "classroom"]);

const DEFAULT_EXTENDED = Object.fromEntries(EXTENDED_AGENT_KEYS.map((key) => [key, true])) as Record<
  ExtendedAgentKey,
  boolean
>;

export const DEFAULT_DESK_PREFERENCES: DeskPreferences = {
  stepDelayMs: DEMO_STEP_DELAY_MS,
  puterModel: PUTER_MODEL,
  extendedAgents: DEFAULT_EXTENDED,
};

export const PUTER_MODEL_OPTIONS = [
  PUTER_MODEL,
  "gpt-4o-mini",
  "claude-sonnet-4",
  "meta-llama/llama-4-maverick",
] as const;

function clampStepDelay(ms: number): number {
  return Math.min(2000, Math.max(0, Math.round(ms)));
}

function defaultPreferences(): DeskPreferences {
  return { ...DEFAULT_DESK_PREFERENCES, extendedAgents: { ...DEFAULT_EXTENDED } };
}

export function loadDeskPreferences(): DeskPreferences {
  if (typeof localStorage === "undefined") return defaultPreferences();
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<DeskPreferences> | null;
    if (!raw || typeof raw !== "object") {
      return defaultPreferences();
    }
    const extendedAgents = { ...DEFAULT_EXTENDED };
    for (const key of EXTENDED_AGENT_KEYS) {
      if (typeof raw.extendedAgents?.[key] === "boolean") {
        extendedAgents[key] = raw.extendedAgents[key];
      }
    }
    const puterModel =
      typeof raw.puterModel === "string" && PUTER_MODEL_OPTIONS.includes(raw.puterModel as (typeof PUTER_MODEL_OPTIONS)[number])
        ? raw.puterModel
        : DEFAULT_DESK_PREFERENCES.puterModel;
    return {
      stepDelayMs: clampStepDelay(typeof raw.stepDelayMs === "number" ? raw.stepDelayMs : DEFAULT_DESK_PREFERENCES.stepDelayMs),
      puterModel,
      extendedAgents,
    };
  } catch {
    return defaultPreferences();
  }
}

export function saveDeskPreferences(prefs: DeskPreferences): DeskPreferences {
  const normalized: DeskPreferences = {
    stepDelayMs: clampStepDelay(prefs.stepDelayMs),
    puterModel: PUTER_MODEL_OPTIONS.includes(prefs.puterModel as (typeof PUTER_MODEL_OPTIONS)[number])
      ? prefs.puterModel
      : DEFAULT_DESK_PREFERENCES.puterModel,
    extendedAgents: { ...DEFAULT_EXTENDED, ...prefs.extendedAgents },
  };
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function enabledExtendedAgentKeys(prefs: DeskPreferences): ExtendedAgentKey[] {
  return EXTENDED_AGENT_KEYS.filter((key) => prefs.extendedAgents[key] !== false);
}

export function isDeskAdmin(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

export function unlockDeskAdmin(pin: string): boolean {
  const trimmed = pin.trim().toLowerCase();
  if (!ADMIN_PINS.has(trimmed)) return false;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
  }
  return true;
}

export function lockDeskAdmin(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }
}

export function clearSimulationSessionStorage(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem("sw-sim-session-id");
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("sw-pass-token-")) localStorage.removeItem(key);
  }
}