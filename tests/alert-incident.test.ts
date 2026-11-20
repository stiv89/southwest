import { describe, expect, it } from "vitest";
import { buildGateIncident } from "../src/lib/simulation/alert-incident";
import type { SimulationState } from "../src/lib/simulation/types";

function state(overrides: Partial<SimulationState> = {}): SimulationState {
  return {
    sessionId: "sim-test",
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
        currentEta: "14:30",
        status: "Delayed +25 min",
        delayApplied: true,
      },
    ],
    gates: [],
    gateConflict: {
      detected: true,
      fromGate: "C14",
      toGate: "C19",
      reason: "Overlap",
      approved: false,
      rejected: false,
    },
    passengers: [],
    stationTasks: [],
    activity: [
      {
        id: "claim-b",
        at: "2026-11-19T18:00:00.000Z",
        clock: "12:24",
        actor: "Passenger Demo",
        message: "Boarding pass claimed",
        detail: "Jordan Lee claimed a boarding pass.",
      },
      {
        id: "claim-a",
        at: "2026-11-19T18:00:00.000Z",
        clock: "12:23",
        actor: "Passenger Demo",
        message: "Boarding pass claimed",
        detail: "Alex Chen claimed a boarding pass.",
      },
      {
        id: "published",
        at: "2026-11-19T18:00:00.000Z",
        clock: "12:22",
        actor: "Dispatch",
        message: "Passenger update published",
        detail: "SW 412 boarding passes now show C19.",
      },
      {
        id: "approved",
        at: "2026-11-19T18:00:00.000Z",
        clock: "12:22",
        actor: "Station Ops",
        message: "Gate change approved",
        detail: "C14 → C19 for SW 412. C14 released.",
      },
      {
        id: "opened",
        at: "2026-11-19T18:00:00.000Z",
        clock: "12:21",
        actor: "Dispatch",
        message: "Gate conflict opened",
        detail: "SW 2847 overlaps SW 412 at C14. C19 proposed for SW 412.",
      },
      {
        id: "schedule",
        at: "2026-11-19T18:00:00.000Z",
        clock: "12:21",
        actor: "Dispatch",
        message: "Schedule change",
        detail: "SW 2847 arrival 14:05 → 14:30.",
      },
    ],
    ...overrides,
  };
}

describe("gate incident alert", () => {
  it("stays empty until the delay opens the conflict", () => {
    const quiet = state();
    quiet.flights = quiet.flights.map((flight) =>
      flight.id === "sw2847" ? { ...flight, delayApplied: false, currentEta: "14:05" } : flight,
    );
    quiet.gateConflict = { ...quiet.gateConflict, detected: false };
    quiet.activity = [];
    expect(buildGateIncident(quiet)).toBeNull();
  });

  it("shows one active incident awaiting Station Ops, with SW 412 still boarding", () => {
    const incident = buildGateIncident(
      state({
        activity: state().activity.filter((event) => event.id === "schedule" || event.id === "opened"),
      }),
    );
    expect(incident).toMatchObject({
      title: "Gate conflict · C14",
      flights: "SW 2847 · SW 412",
      status: "Awaiting Station Ops",
      resolved: false,
      proposalLabel: "Proposed for SW 412",
      flightContext: "SW 412 · Boarding",
      updated: "12:21",
    });
    expect(incident?.history.map((item) => item.title)).toEqual(["Schedule change", "Gate conflict opened"]);
  });

  it("groups passenger scans and keeps a single resolved story", () => {
    const approved = state();
    approved.gateConflict = { ...approved.gateConflict, approved: true };
    approved.flights = approved.flights.map((flight) =>
      flight.id === "sw412" ? { ...flight, gate: "C19", status: "Boarding · gate changed" } : flight,
    );
    const incident = buildGateIncident(approved);
    expect(incident?.resolved).toBe(true);
    expect(incident?.status).toBe("Resolved");
    expect(incident?.proposalLabel).toBe("Assigned to SW 412");
    expect(incident?.history.map((item) => item.title)).toEqual([
      "Schedule change",
      "Gate conflict opened",
      "Gate change approved",
      "Passenger update published",
      "2 boarding passes claimed",
    ]);
    expect(incident?.history.at(-1)).toMatchObject({
      actor: "Passenger Demo",
      clock: "12:24",
    });
  });
});
