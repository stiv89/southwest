import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoPassenger, SimulationState } from "./types";

const SESSION_KEY = "sw-sim-session-id";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function useSimulationSession() {
  const [state, setState] = useState<SimulationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);
  const [phoneOrigin, setPhoneOrigin] = useState(() => window.location.origin);

  const applyState = useCallback((next: SimulationState) => {
    sessionRef.current = next.sessionId;
    localStorage.setItem(SESSION_KEY, next.sessionId);
    setState(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
  const stored = localStorage.getItem(SESSION_KEY);

    async function boot() {
      try {
        let initial: SimulationState;
        if (stored) {
          const res = await fetch(`/api/simulation/state?sessionId=${encodeURIComponent(stored)}`);
          initial = res.ok
            ? ((await res.json()) as SimulationState)
            : await fetchJson<SimulationState>("/api/simulation/session");
        } else {
          initial = await fetchJson<SimulationState>("/api/simulation/session");
        }
        if (cancelled) return;
        applyState(initial);
        setLoading(false);
      } catch (bootError) {
        if (cancelled) return;
        setError(bootError instanceof Error ? bootError.message : "Could not load simulation.");
        setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [applyState]);

  useEffect(() => {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") return;
    let cancelled = false;
    const started = Date.now();

    async function poll() {
      while (!cancelled && Date.now() - started < 30000) {
        try {
          const res = await fetch("/api/simulation/lan-origin");
          const body = (await res.json()) as { origin?: string | null; public?: boolean };
          if (cancelled) return;
          if (body.origin) setPhoneOrigin(body.origin);
          if (body.public) return;
        } catch {
          /* tunnel still starting */
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sessionId = state?.sessionId;
    if (!sessionId) return;
    const source = new EventSource(`/api/simulation/events?sessionId=${encodeURIComponent(sessionId)}`);
    source.onmessage = (event) => {
      try {
        const next = JSON.parse(event.data) as SimulationState;
        applyState(next);
      } catch {
        /* ignore malformed */
      }
    };
    source.onerror = () => {
      /* EventSource retries */
    };
    return () => source.close();
  }, [state?.sessionId, applyState]);

  const post = useCallback(
    async (path: string, body: Record<string, unknown>) => {
      if (!sessionRef.current) throw new Error("No session.");
      const next = await fetchJson<SimulationState>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionRef.current, ...body }),
      });
      applyState(next);
      return next;
    },
    [applyState],
  );

  return {
    state,
    loading,
    error,
    simulateDelay: () => post("/api/simulation/delay", {}),
    approveGateChange: () => post("/api/simulation/approve-gate", {}),
    rejectGateChange: () => post("/api/simulation/reject-gate", {}),
    offerNewFlight: (passengerId: string) => post("/api/simulation/offer", { passengerId }),
    completeStationTask: (taskId: string) => post("/api/simulation/complete-task", { taskId }),
    passengerUrl: state
      ? `${phoneOrigin}/passenger?session=${encodeURIComponent(state.sessionId)}`
      : null,
  };
}

export function passengerStorageKey(sessionId: string) {
  return `sw-pass-token-${sessionId}`;
}

export async function joinPassengerSession(sessionId: string, token: string | null) {
  return fetchJson<{ token: string; sessionId: string; passenger: DemoPassenger }>("/api/simulation/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, token }),
  });
}

export async function acceptPassengerOffer(sessionId: string, token: string) {
  return fetchJson<{ state: SimulationState; passenger: DemoPassenger }>("/api/simulation/accept-offer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, token }),
  });
}