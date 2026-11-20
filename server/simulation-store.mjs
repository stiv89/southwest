import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * In-memory simulation session for classroom demo (single-node).
 * Shared across dashboard tabs and passenger phones via Vite middleware.
 * The active session is also written to disk so a browser reload keeps it.
 */

const sessions = new Map();
const subscribers = new Map();
const persistEnabled = !process.env.VITEST;
const sessionFile = join(dirname(fileURLToPath(import.meta.url)), "../data/runtime/incident-session.json");

function nowIso() {
  return new Date().toISOString();
}

function scenarioClock(session) {
  const total = 12 * 60 + 20 + (session.scenarioMinute ?? 0);
  const hours = Math.floor(total / 60) % 24;
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function addActivity(session, message, detail = "", actor = "System", advance = true) {
  session.activity.unshift({
    id: `act-${session.revision}-${session.activity.length}`,
    at: nowIso(),
    clock: scenarioClock(session),
    actor,
    message,
    detail,
  });
  if (advance) session.scenarioMinute = (session.scenarioMinute ?? 0) + 1;
  session.revision += 1;
  persistSession(session);
}

function persistSession(session) {
  if (!persistEnabled) return;
  const payload = {
    ...session,
    tokens: Object.fromEntries(session.tokens),
  };
  mkdirSync(dirname(sessionFile), { recursive: true });
  writeFileSync(sessionFile, JSON.stringify(payload), "utf8");
}

function restorePersistedSession() {
  if (!persistEnabled) return;
  try {
    const raw = JSON.parse(readFileSync(sessionFile, "utf8"));
    if (!raw?.sessionId || !Array.isArray(raw.passengers) || !Array.isArray(raw.flights)) return;
    raw.tokens = new Map(Object.entries(raw.tokens ?? {}));
    raw.gateConflict = {
      detected: false,
      fromGate: "C14",
      toGate: "C19",
      reason: "",
      approved: false,
      ...raw.gateConflict,
      rejected: Boolean(raw.gateConflict?.rejected),
    };
    if (raw.scenarioMinute == null) raw.scenarioMinute = Array.isArray(raw.activity) ? raw.activity.length : 0;
    sessions.set(raw.sessionId, raw);
  } catch {
    /* first run, or an unreadable file */
  }
}

function buildInitialPassengers() {
  return [
    {
      id: "pax-alex",
      assignable: true,
      name: "Alex Chen",
      persona: "terminal",
      flight: "SW 412",
      route: "MCI → DEN",
      seat: "14A",
      gate: "C14",
      boardingGroup: 2,
      boardingEnds: "14:15",
      connection: null,
      offer: null,
      offerStatus: null,
      alerts: [],
    },
    {
      id: "pax-jordan",
      assignable: true,
      name: "Jordan Lee",
      persona: "connection",
      flight: "SW 412",
      route: "MCI → DEN",
      seat: "22C",
      gate: "C14",
      boardingGroup: 3,
      boardingEnds: "14:15",
      connection: {
        flight: "SW 890",
        route: "DEN → PHX",
        gate: "C22",
        departs: "15:10",
        walkMinutes: 12,
      },
      offer: null,
      offerStatus: null,
      alerts: [],
    },
    {
      id: "pax-sam",
      assignable: true,
      name: "Sam Rivera",
      persona: "misconnect",
      flight: "SW 412",
      route: "MCI → DEN",
      seat: "08B",
      gate: "C14",
      boardingGroup: 1,
      boardingEnds: "14:15",
      connection: {
        flight: "SW 671",
        route: "DEN → LAS",
        gate: "B18",
        departs: "14:35",
        walkMinutes: 18,
        missed: true,
      },
      offer: null,
      offerStatus: null,
      alerts: ["Connection at risk — awaiting rebooking options."],
    },
  ];
}

function createSessionState() {
  const sessionId = `sim-${Math.random().toString(36).slice(2, 10)}`;
  const state = {
    sessionId,
    revision: 1,
    incidentActive: true,
    flights: [
      {
        id: "sw412",
        flight: "SW 412",
        type: "departure",
        route: "MCI → DEN",
        gate: "C14",
        proposedGate: null,
        originalEta: "14:30",
        currentEta: "14:30",
        status: "Boarding",
        delayApplied: false,
      },
      {
        id: "sw2847",
        flight: "SW 2847",
        type: "arrival",
        route: "DEN → MCI",
        gate: "C14",
        proposedGate: null,
        originalEta: "14:05",
        currentEta: "14:05",
        status: "On time",
        delayApplied: false,
      },
    ],
    gates: [
      { id: "c10", label: "C10", status: "occupied", flight: "SW 718" },
      { id: "c11", label: "C11", status: "occupied", flight: "SW 902" },
      { id: "c12", label: "C12", status: "available", flight: null },
      { id: "c13", label: "C13", status: "occupied", flight: "SW 155" },
      { id: "c14", label: "C14", status: "occupied", flight: "SW 412", conflict: false },
      { id: "c15", label: "C15", status: "available", flight: null },
      { id: "c16", label: "C16", status: "occupied", flight: "SW 441" },
      { id: "c17", label: "C17", status: "available", flight: null },
      { id: "c18", label: "C18", status: "occupied", flight: "SW 288" },
      { id: "c19", label: "C19", status: "available", flight: null },
    ],
    gateConflict: {
      detected: false,
      fromGate: "C14",
      toGate: "C19",
      reason: "",
      approved: false,
      rejected: false,
    },
    passengers: buildInitialPassengers(),
    stationTasks: [
      { id: "signage", status: "open" },
      { id: "ramp", status: "open" },
    ],
    tokens: new Map(),
    activity: [],
  };
  addActivity(
    state,
    "Incident session started",
    "Gate overlap scenario armed. Dispatch can simulate inbound delay on SW 2847.",
  );
  sessions.set(sessionId, state);
  return publicState(state);
}

function publicState(session) {
  return {
    sessionId: session.sessionId,
    revision: session.revision,
    incidentActive: session.incidentActive,
    flights: session.flights,
    gates: session.gates,
    gateConflict: session.gateConflict,
    passengers: session.passengers.map((p) => ({
      ...p,
      hasToken: session.tokens.has(p.id),
    })),
    stationTasks: session.stationTasks,
    activity: session.activity,
  };
}

export function resetAllSessionsForTests() {
  sessions.clear();
  subscribers.clear();
}

export function createFreshSession() {
  return createSessionState();
}

export function completeStationTask(sessionId, taskId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const task = session.stationTasks.find((item) => item.id === taskId);
  if (!task || task.status === "done") return publicState(session);

  if (taskId === "signage" && !session.gateConflict.approved) {
    return publicState(session);
  }
  if (taskId === "ramp" && !session.gateConflict.detected) {
    return publicState(session);
  }

  task.status = "done";
  const label =
    taskId === "signage"
      ? "FIDS and gate signage updated"
      : taskId === "ramp"
        ? "Ramp crew briefed"
        : taskId;
  addActivity(session, "Station Ops completed task", label, "Station Ops");
  broadcast(session);
  return publicState(session);
}

export function getOrCreateSession(sessionId) {
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }
  const created = createSessionState();
  return sessions.get(created.sessionId);
}

export function readSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  return publicState(session);
}

function etaPlus25(eta) {
  const [h, m] = eta.split(":").map(Number);
  let total = h * 60 + m + 25;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export function simulateInboundDelay(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const inbound = session.flights.find((f) => f.id === "sw2847");
  if (!inbound || inbound.delayApplied) return publicState(session);
  inbound.delayApplied = true;
  inbound.currentEta = etaPlus25(inbound.originalEta);
  inbound.status = "Delayed +25 min";
  session.gateConflict.detected = true;
  session.gateConflict.reason =
    `Inbound ${inbound.flight} now ETA ${inbound.currentEta} overlaps ${session.flights[0].flight} boarding at C14. Propose moving departure to C19.`;
  const c14 = session.gates.find((g) => g.label === "C14");
  if (c14) c14.conflict = true;
  for (const p of session.passengers) {
    if (p.persona === "connection") {
      p.alerts = [
        `Tight connection: ${p.connection.flight} departs ${p.connection.departs} from ${p.connection.gate}. Monitor gate change.`,
      ];
    }
  }
  addActivity(
    session,
    "Schedule change",
    `SW 2847 arrival ${inbound.originalEta} → ${inbound.currentEta}.`,
    "Dispatch",
    false,
  );
  addActivity(
    session,
    "Gate conflict opened",
    `SW 2847 overlaps SW 412 at C14. C19 proposed for SW 412.`,
    "Dispatch",
  );
  addActivity(
    session,
    "Connections marked at risk",
    "Jordan Lee and Sam Rivera flagged in Customer Service.",
    "Customer Service",
    false,
  );
  broadcast(session);
  return publicState(session);
}

export function approveGateChange(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || !session.gateConflict.detected || session.gateConflict.approved) {
    return session ? publicState(session) : null;
  }
  const dep = session.flights.find((f) => f.id === "sw412");
  const from = session.gateConflict.fromGate;
  const to = session.gateConflict.toGate;
  if (dep) {
    dep.gate = to;
    dep.proposedGate = to;
    dep.status = "Boarding · gate changed";
  }
  const c14 = session.gates.find((g) => g.label === from);
  const c19 = session.gates.find((g) => g.label === to);
  if (c14) {
    c14.status = "available";
    c14.flight = null;
    c14.conflict = false;
  }
  if (c19) {
    c19.status = "occupied";
    c19.flight = dep?.flight ?? "SW 412";
  }
  session.gateConflict.approved = true;
  for (const p of session.passengers) {
    p.gate = to;
    if (p.persona !== "misconnect" || p.offerStatus !== "accepted") {
      p.alerts.unshift(`Gate changed to ${to}. Boarding ends ${p.boardingEnds}.`);
    }
  }
  addActivity(session, "Gate change approved", `${from} → ${to} for SW 412. C14 released.`, "Station Ops", false);
  addActivity(session, "Passenger update published", "SW 412 boarding passes now show C19.", "Dispatch");
  broadcast(session);
  return publicState(session);
}

export function rejectGateChange(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || !session.gateConflict.detected || session.gateConflict.approved) {
    return session ? publicState(session) : null;
  }
  if (session.gateConflict.rejected) return publicState(session);
  session.gateConflict.rejected = true;
  addActivity(session, "Proposal rejected", "C19 was declined. SW 412 remains at C14.", "Station Ops");
  broadcast(session);
  return publicState(session);
}

export function offerNewFlight(sessionId, passengerId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const pax = session.passengers.find((p) => p.id === passengerId);
  if (!pax || pax.persona !== "misconnect") return publicState(session);
  pax.offer = {
    flight: "SW 918",
    route: "MCI → LAS (via DEN)",
    departs: "17:40",
    gate: "B6",
    seat: "12D",
  };
  pax.offerStatus = "offered";
  pax.alerts.unshift("New flight option sent to passenger device.");
  addActivity(
    session,
    "Customer Service sent rebooking offer",
    `${pax.name} · ${pax.offer.flight} at ${pax.offer.departs}.`,
    "Customer Service",
  );
  broadcast(session);
  return publicState(session);
}

export function acceptOffer(sessionId, token) {
  const session = sessions.get(sessionId);
  if (!session) return { error: "session_missing" };
  let passengerId = null;
  for (const [id, tok] of session.tokens.entries()) {
    if (tok === token) {
      passengerId = id;
      break;
    }
  }
  if (!passengerId) return { error: "invalid_token" };
  const pax = session.passengers.find((p) => p.id === passengerId);
  if (!pax || !pax.offer) return { error: "no_offer", state: publicState(session) };
  pax.offerStatus = "accepted";
  pax.flight = pax.offer.flight;
  pax.route = pax.offer.route;
  pax.gate = pax.offer.gate;
  pax.seat = pax.offer.seat;
  pax.boardingEnds = "17:20";
  pax.alerts.unshift(`You're confirmed on ${pax.offer.flight}. New boarding pass ready.`);
  addActivity(session, "Passenger accepted rebooking", `${pax.name} confirmed ${pax.offer.flight}.`, "Passenger Demo");
  broadcast(session);
  return { state: publicState(session), passenger: sanitizePassenger(pax) };
}

function sanitizePassenger(pax) {
  const { assignable: _a, ...rest } = pax;
  return rest;
}

export function joinSession(sessionId, token) {
  let session = sessions.get(sessionId);
  if (!session) {
    const created = createSessionState();
    session = sessions.get(created.sessionId);
  }
  if (token) {
    for (const [passengerId, tok] of session.tokens.entries()) {
      if (tok === token) {
        const pax = session.passengers.find((p) => p.id === passengerId);
        return { token, sessionId: session.sessionId, passenger: sanitizePassenger(pax) };
      }
    }
  }
  const next = session.passengers.find((p) => !session.tokens.has(p.id));
  if (!next) return { error: "no_passes", sessionId: session.sessionId };
  const newToken = `tok-${Math.random().toString(36).slice(2, 14)}`;
  session.tokens.set(next.id, newToken);
  addActivity(session, "Boarding pass claimed", `${next.name} claimed a boarding pass.`, "Passenger Demo");
  broadcast(session);
  return { token: newToken, sessionId: session.sessionId, passenger: sanitizePassenger(next) };
}

export function passengerByToken(sessionId, token) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  for (const [passengerId, tok] of session.tokens.entries()) {
    if (tok === token) {
      const pax = session.passengers.find((p) => p.id === passengerId);
      return sanitizePassenger(pax);
    }
  }
  return null;
}

function broadcast(session) {
  const subs = subscribers.get(session.sessionId);
  if (!subs) return;
  const payload = `data: ${JSON.stringify(publicState(session))}\n\n`;
  for (const res of subs) {
    try {
      res.write(payload);
    } catch {
      /* closed */
    }
  }
}

export function subscribeSse(sessionId, res) {
  if (!subscribers.has(sessionId)) subscribers.set(sessionId, new Set());
  subscribers.get(sessionId).add(res);
  const session = sessions.get(sessionId);
  if (session) {
    res.write(`data: ${JSON.stringify(publicState(session))}\n\n`);
  }
  return () => {
    const set = subscribers.get(sessionId);
    if (set) {
      set.delete(res);
      if (set.size === 0) subscribers.delete(sessionId);
    }
  };
}

export function ensureDefaultSession() {
  if (sessions.size === 0) return createSessionState();
  const first = sessions.values().next().value;
  return publicState(first);
}

restorePersistedSession();