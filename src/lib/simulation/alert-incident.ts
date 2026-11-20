import type { SimulationActivityEvent, SimulationState } from "./types";

export interface AlertHistoryItem {
  id: string;
  clock: string;
  actor: string;
  title: string;
  change: string;
}

export interface GateIncidentView {
  id: "gate-c14";
  title: string;
  flights: string;
  status: string;
  updated: string;
  resolved: boolean;
  fromGate: string;
  toGate: string;
  proposalLabel: string;
  flightContext: string;
  nextAction: string;
  history: AlertHistoryItem[];
}

const CLAIM_MESSAGES = new Set(["Boarding pass claimed", "Passenger joined mobile demo"]);

const EVENT_COPY: Record<string, { title: string; actor: string; clock: string }> = {
  "Schedule change": { title: "Schedule change", actor: "Dispatch", clock: "12:21" },
  "Dispatch recorded new ETA for SW 2847": { title: "Schedule change", actor: "Dispatch", clock: "12:21" },
  "Gate conflict opened": { title: "Gate conflict opened", actor: "Dispatch", clock: "12:21" },
  "Gate change approved": { title: "Gate change approved", actor: "Station Ops", clock: "12:22" },
  "Station Ops approved gate change": { title: "Gate change approved", actor: "Station Ops", clock: "12:22" },
  "Proposal rejected": { title: "Proposal rejected", actor: "Station Ops", clock: "12:22" },
  "Passenger update published": { title: "Passenger update published", actor: "Dispatch", clock: "12:22" },
};

function historyFromActivity(events: SimulationActivityEvent[]): AlertHistoryItem[] {
  const oldestFirst = [...events].reverse();
  const items: AlertHistoryItem[] = [];
  const claims: SimulationActivityEvent[] = [];
  let claimIndex = -1;

  for (const event of oldestFirst) {
    if (CLAIM_MESSAGES.has(event.message)) {
      claims.push(event);
      if (claimIndex === -1) {
        claimIndex = items.length;
        items.push({
          id: "boarding-passes-claimed",
          clock: "",
          actor: "Passenger Demo",
          title: "",
          change: "",
        });
      }
      continue;
    }
    const copy = EVENT_COPY[event.message];
    if (!copy) continue;
    items.push({
      id: event.id,
      clock: event.clock || copy.clock,
      actor: event.actor || copy.actor,
      title: copy.title,
      change: event.detail,
    });
  }

  if (claimIndex >= 0) {
    const latest = claims[claims.length - 1];
    const count = claims.length;
    items[claimIndex] = {
      id: "boarding-passes-claimed",
      clock: latest?.clock || "12:23",
      actor: "Passenger Demo",
      title: `${count} boarding ${count === 1 ? "pass" : "passes"} claimed`,
      change: "QR scans stay on the passenger phones.",
    };
  }

  return items;
}

export function buildGateIncident(state: SimulationState): GateIncidentView | null {
  const inbound = state.flights.find((flight) => flight.id === "sw2847");
  const departure = state.flights.find((flight) => flight.id === "sw412");
  if (!inbound?.delayApplied && !state.gateConflict.detected) return null;

  const resolved = state.gateConflict.approved;
  const rejected = Boolean(state.gateConflict.rejected);
  const history = historyFromActivity(state.activity);
  const boarding = (departure?.status ?? "Boarding").includes("Boarding") ? "Boarding" : departure?.status ?? "Boarding";

  let status = "Awaiting Station Ops";
  let nextAction = `Station Ops reviews the C19 proposal. SW 412 is ${boarding}.`;
  if (resolved) {
    status = "Resolved";
    nextAction = "C14 is released. SW 412 boards at C19.";
  } else if (rejected) {
    status = "Proposal rejected";
    nextAction = `The C19 proposal was rejected. SW 412 stays at C14 in ${boarding}.`;
  }

  return {
    id: "gate-c14",
    title: "Gate conflict · C14",
    flights: `${inbound?.flight ?? "SW 2847"} · ${departure?.flight ?? "SW 412"}`,
    status,
    updated: history[history.length - 1]?.clock ?? "12:21",
    resolved,
    fromGate: state.gateConflict.fromGate,
    toGate: state.gateConflict.toGate,
    proposalLabel: resolved ? "Assigned to SW 412" : "Proposed for SW 412",
    flightContext: `${departure?.flight ?? "SW 412"} · ${boarding}`,
    nextAction,
    history,
  };
}
