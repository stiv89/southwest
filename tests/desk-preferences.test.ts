import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_DESK_PREFERENCES,
  enabledExtendedAgentKeys,
  loadDeskPreferences,
  lockDeskAdmin,
  saveDeskPreferences,
  unlockDeskAdmin,
} from "../src/lib/desk-preferences";

function memoryStore(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

describe("desk preferences", () => {
  beforeEach(() => {
    const local = memoryStore();
    const session = memoryStore();
    vi.stubGlobal("localStorage", local);
    vi.stubGlobal("sessionStorage", session);
    vi.stubGlobal("window", { localStorage: local, sessionStorage: session });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists agent playback and extended agent toggles", () => {
    const saved = saveDeskPreferences({
      ...DEFAULT_DESK_PREFERENCES,
      stepDelayMs: 500,
      extendedAgents: {
        ...DEFAULT_DESK_PREFERENCES.extendedAgents,
        maintenance: false,
      },
    });
    const loaded = loadDeskPreferences();
    expect(saved.stepDelayMs).toBe(500);
    expect(loaded.stepDelayMs).toBe(500);
    expect(enabledExtendedAgentKeys(loaded)).not.toContain("maintenance");
    expect(enabledExtendedAgentKeys(loaded)).toContain("scheduling");
  });

  it("unlocks admin for the tab only", () => {
    expect(unlockDeskAdmin("wrong")).toBe(false);
    expect(unlockDeskAdmin("classroom")).toBe(true);
    lockDeskAdmin();
    expect(unlockDeskAdmin("admin")).toBe(true);
  });
});