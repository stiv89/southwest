import { describe, expect, it, beforeEach } from "vitest";
import {
  acceptOffer,
  approveGateChange,
  createFreshSession,
  joinSession,
  offerNewFlight,
  passengerByToken,
  rejectGateChange,
  resetAllSessionsForTests,
  simulateInboundDelay,
} from "../server/simulation-store.mjs";

describe("gate incident simulation flow", () => {
  beforeEach(() => {
    resetAllSessionsForTests();
  });

  it("runs delay → conflict → gate approve → per-passenger updates → offer → accept", () => {
    const initial = createFreshSession();
    const sessionId = initial.sessionId;

    const delayed = simulateInboundDelay(sessionId);
    expect(delayed.gateConflict.detected).toBe(true);
    expect(delayed.flights.find((f) => f.id === "sw2847")?.delayApplied).toBe(true);
    expect(delayed.gates.find((g) => g.label === "C14")?.conflict).toBe(true);

    const approved = approveGateChange(sessionId);
    expect(approved.gateConflict.approved).toBe(true);
    expect(approved.flights.find((f) => f.id === "sw412")?.gate).toBe("C19");
    expect(approved.passengers.every((p) => p.gate === "C19" || p.offerStatus === "accepted")).toBe(true);

    const alexJoin = joinSession(sessionId, null);
    const jordanJoin = joinSession(sessionId, null);
    const samJoin = joinSession(sessionId, null);
    expect(alexJoin.passenger.name).not.toBe(jordanJoin.passenger.name);
    expect(samJoin.passenger.name).toBe("Sam Rivera");

    expect(passengerByToken(sessionId, alexJoin.token)?.gate).toBe("C19");
    expect(passengerByToken(sessionId, jordanJoin.token)?.gate).toBe("C19");

    offerNewFlight(sessionId, "pax-sam");
    const accept = acceptOffer(sessionId, samJoin.token);
    expect(accept.error).toBeUndefined();
    expect(accept.passenger.flight).toBe("SW 918");
    expect(accept.passenger.gate).toBe("B6");
    expect(passengerByToken(sessionId, samJoin.token)?.flight).toBe("SW 918");

    expect(alexJoin.passenger.flight).toBe("SW 412");
    expect(passengerByToken(sessionId, alexJoin.token)?.flight).toBe("SW 412");
  });

  it("keeps one incident and one approval when delay or approval is repeated", () => {
    const initial = createFreshSession();
    const sessionId = initial.sessionId;

    const delayed = simulateInboundDelay(sessionId);
    const delayedAgain = simulateInboundDelay(sessionId);
    expect(delayedAgain.revision).toBe(delayed.revision);
    expect(delayed.activity.filter((event) => event.message === "Schedule change")).toHaveLength(1);
    expect(delayed.activity.find((event) => event.message === "Schedule change")).toMatchObject({
      actor: "Dispatch",
      clock: "12:21",
      detail: "SW 2847 arrival 14:05 → 14:30.",
    });

    const approved = approveGateChange(sessionId);
    const approvedAgain = approveGateChange(sessionId);
    expect(approvedAgain.revision).toBe(approved.revision);
    expect(approved.activity.filter((event) => event.message === "Gate change approved")).toHaveLength(1);
    expect(approved.activity.filter((event) => event.message === "Passenger update published")).toHaveLength(1);
    expect(approved.activity.find((event) => event.message === "Passenger update published")?.clock).toBe("12:22");
  });

  it("records one rejection and leaves the incident active", () => {
    const initial = createFreshSession();
    const sessionId = initial.sessionId;
    simulateInboundDelay(sessionId);

    const rejected = rejectGateChange(sessionId);
    const rejectedAgain = rejectGateChange(sessionId);
    expect(rejected.gateConflict.detected).toBe(true);
    expect(rejected.gateConflict.approved).toBe(false);
    expect(rejected.gateConflict.rejected).toBe(true);
    expect(rejected.flights.find((flight) => flight.id === "sw412")?.gate).toBe("C14");
    expect(rejectedAgain.revision).toBe(rejected.revision);
    expect(rejected.activity.filter((event) => event.message === "Proposal rejected")).toHaveLength(1);

    const approved = approveGateChange(sessionId);
    expect(approved.gateConflict.approved).toBe(true);
    expect(approved.activity.filter((event) => event.message === "Gate change approved")).toHaveLength(1);
  });
});