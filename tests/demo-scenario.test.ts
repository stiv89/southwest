import { describe, expect, it } from "vitest";
import { parseNarrative } from "../src/lib/puter";
import { scenario } from "../src/lib/mock-data";
import { getDashboardModel } from "../src/orchestration/dashboard";
import {
  approvePlan,
  createInitialSnapshot,
  rejectPlan,
  resetDemo,
  runAgents,
  selectScenario,
  setOutageEnabled,
} from "../src/orchestration/orchestrator";
import {
  draftCustomerUpdate,
  getAvailableAssistance,
  getConnectionImpact,
  getPassengerImpact,
} from "../src/tools/customer-service";
import type { ToolContext } from "../src/tools/errors";
import {
  evaluateOperationalImpact,
  getDiversionOptions,
  getFlightStatus,
} from "../src/tools/flight-operations";
import type { ToolCallRecord } from "../src/types/contracts";

const now = () => "2026-11-16T18:20:00.000Z";
const ctx: ToolContext = { outageTool: null };

function inputOf(record: ToolCallRecord | undefined): Record<string, unknown> {
  return (record?.input ?? {}) as Record<string, unknown>;
}

async function runSelected() {
  const selected = selectScenario(createInitialSnapshot(), scenario.id, now);
  return runAgents(selected, { stepDelayMs: 0, now });
}

describe("MCI ground stop demo", () => {
  it("loads the course-brief facts and keeps capability unknown", () => {
    expect(scenario.passengers).toBe(158);
    expect(scenario.connectingPassengers).toBe(42);
    expect(scenario.wheelchairPassengers).toBe(3);
    expect(scenario.crewDutyRemaining).toBe("4 hours 20 minutes");
    expect(scenario.fuelFlexibilityMinutes).toBe(55);
    expect(scenario.alternateAirports).toEqual(["STL", "OMA", "DSM", "ICT", "TUL"]);
    expect(getDashboardModel(createInitialSnapshot()).status).toBe("Normal");
    const selected = selectScenario(createInitialSnapshot(), scenario.id, now);
    const model = getDashboardModel(selected);
    expect(model.status).toBe("Grounded");
    expect(model.selected?.aircraftId).toBe("A31");
    expect(model.selected?.passengers).toBe(158);
    expect(selected.audit[0]?.simulated).toBe(false);
  });

  it("runs both agents, hands off options, and waits for a person", async () => {
    const flight = getFlightStatus(scenario.aircraftId, ctx);
    const diversion = getDiversionOptions(flight.flightId, ctx);
    const impact = getPassengerImpact(flight.flightId, ctx);
    const connections = getConnectionImpact(flight.flightId, ctx);
    const assistance = getAvailableAssistance("MCI", ctx);
    const evaluated = [
      ...diversion.candidates.map((candidate) => evaluateOperationalImpact(candidate.id, ctx)),
      evaluateOperationalImpact(diversion.holdOption.id, ctx),
    ];
    const authorized = evaluated.filter((item) => item.authorized).length;

    const snapshot = await runSelected();
    const ops = snapshot.opsResult;
    const cs = snapshot.csResult;
    expect(ops?.status).toBe("needs_human_review");
    expect(cs?.status).toBe("needs_human_review");
    expect(ops?.toolCalls.some((call) => call.ok)).toBe(true);
    expect(cs?.toolCalls.some((call) => call.ok)).toBe(true);
    expect(ops?.toolCalls.map((call) => call.name)).toContain("getDiversionOptions");
    expect(ops?.summary).toContain(diversion.candidates.map((candidate) => candidate.airport).join(", "));
    expect(ops?.summary).toContain(`authorized ${authorized} of ${evaluated.length}`);
    expect(ops?.summary).toContain("Feasibility is unknown");
    expect(ops?.knownFacts.join(" ")).toContain(String(flight.passengers));
    expect(ops?.knownFacts.join(" ")).toContain(flight.origin);

    const draftCall = cs?.toolCalls.find((call) => call.name === "draftCustomerUpdate");
    expect(inputOf(draftCall).optionLabels).toEqual(ops?.options.map((option) => option.label));
    expect(cs?.draftNotification).toBe((draftCall?.result as { draft?: string }).draft);
    expect(cs?.draftNotification).toContain(ops?.options[0]?.label ?? "");
    expect(cs?.draftNotification).toContain(String(impact.passengers));
    expect((draftCall?.result as { sent?: boolean }).sent).toBe(false);

    const recommendation = snapshot.recommendation;
    expect(recommendation?.requiresHumanApproval).toBe(true);
    expect(recommendation?.passengerConsequences).toContain(String(impact.passengers));
    expect(recommendation?.passengerConsequences).toContain(String(connections.connectingPassengers));
    expect(recommendation?.passengerConsequences).toContain(String(impact.wheelchairPassengers));
    expect(recommendation?.unknowns.length).toBeGreaterThan(0);
    expect(recommendation?.requiredAssistance).toContain(String(assistance.inventoryKnown));
    expect(assistance.inventoryKnown).toBe(false);
    expect(snapshot.phase).toBe("awaiting_decision");
    expect(snapshot.decision).toBe("none");
    expect(snapshot.audit.some((event) => event.kind === "tool" && event.simulated)).toBe(true);
    expect(
      snapshot.audit.some((event) => event.message.includes(`passed ${ops?.options.length}`)),
    ).toBe(true);
    expect(recommendation?.agentSupport).toHaveLength(4);
    expect(snapshot.agentSlots.communications.history.map((call) => call.name)).toContain(
      "draftInternalComms",
    );
    expect(snapshot.agentSlots.maintenance.history.map((call) => call.name)).toContain(
      "getMaintenanceReadiness",
    );
    expect(JSON.stringify(recommendation).toLowerCase()).not.toContain("safe to divert");
  });

  it("does not approve or reject before the agents finish", async () => {
    const idle = selectScenario(createInitialSnapshot(), scenario.id, now);
    const approvedEarly = approvePlan(idle, "Demo Dispatcher", now);
    const rejectedEarly = rejectPlan(idle, "Demo Dispatcher", now);
    expect(approvedEarly.decision).toBe("none");
    expect(approvedEarly.outcome).toBeNull();
    expect(approvedEarly.audit).toHaveLength(idle.audit.length);
    expect(rejectedEarly.outcome).toBeNull();
    expect(rejectedEarly.audit).toHaveLength(idle.audit.length);
    const finished = await runSelected();
    expect(approvePlan(finished, "   ", now).decision).toBe("none");
    expect(await runAgents(createInitialSnapshot(), { stepDelayMs: 0, now })).toEqual(
      createInitialSnapshot(),
    );
  });

  it("records different simulated outcomes and leaves the airport grounded", async () => {
    const finished = await runSelected();
    const approved = approvePlan(finished, "Demo Dispatcher", now);
    const rejected = rejectPlan(finished, "Demo Dispatcher", now);
    expect(approved.decision).toBe("approved");
    expect(rejected.decision).toBe("rejected");
    expect(approved.outcome).toContain("Simulated plan recorded");
    expect(approved.outcome).toContain("No aircraft, ATC, or passenger message was executed");
    expect(rejected.outcome).toContain("Recommendation rejected");
    expect(rejected.outcome).toContain("No action taken");
    expect(approved.outcome).not.toBe(rejected.outcome);
    expect(getDashboardModel(approved).status).toBe("Grounded");
    expect(getDashboardModel(rejected).status).toBe("Grounded");
  });

  it("resets to the starting state", async () => {
    const approved = approvePlan(await runSelected(), "Demo Dispatcher", now);
    expect(approved.phase).toBe("decided");
    expect(resetDemo()).toEqual(createInitialSnapshot());
    expect(getDashboardModel(resetDemo()).status).toBe("Normal");
  });

  it("shows a safe fallback when a tool fails", async () => {
    const flight = getFlightStatus("A31", ctx);
    let snapshot = selectScenario(createInitialSnapshot(), scenario.id, now);
    snapshot = setOutageEnabled(snapshot, true);
    snapshot = await runAgents(snapshot, { stepDelayMs: 0, now });
    expect(snapshot.phase).toBe("incomplete");
    expect(snapshot.opsRunState).toBe("Error");
    expect(snapshot.csResult).toBeNull();
    expect(snapshot.recommendation).toBeNull();
    expect(snapshot.opsResult?.options).toEqual([]);
    expect(snapshot.opsResult?.toolCalls.map((call) => call.name)).toEqual([
      "getFlightStatus",
      "getAirportStatus",
      "getCrewConstraints",
      "getDiversionOptions",
    ]);
    expect(snapshot.opsResult?.toolCalls.at(-1)?.ok).toBe(false);
    expect(snapshot.opsResult?.summary).toContain("getDiversionOptions");
    expect(snapshot.opsResult?.knownFacts.join(" ")).toContain(String(flight.passengers));
    expect(approvePlan(snapshot, "Demo Dispatcher", now).decision).toBe("none");
    expect(JSON.stringify(snapshot.opsResult).toLowerCase()).not.toContain("safe to divert");

    const customerOutage = await runAgents(selectScenario(createInitialSnapshot(), scenario.id, now), {
      stepDelayMs: 0,
      now,
      outageTool: "getPassengerImpact",
    });
    expect(customerOutage.opsRunState).toBe("Complete");
    expect(customerOutage.csRunState).toBe("Error");
    expect(customerOutage.recommendation).toBeNull();
    expect(customerOutage.phase).toBe("incomplete");
  });

  it("lets Puter rewrite the narrative without replacing tool options", async () => {
    const selected = selectScenario(createInitialSnapshot(), scenario.id, now);
    const snapshot = await runAgents(selected, {
      stepDelayMs: 0,
      now,
      narrate: async (result) => ({
        summary: `Puter ${result.agent} for ${result.subjectId}.`,
        recommendedNextStep: "Keep the decision with a human dispatcher.",
        model: "gpt-5.4-nano",
      }),
    });
    expect(snapshot.opsResult?.narrativeSource).toBe("puter");
    expect(snapshot.csResult?.narrativeSource).toBe("puter");
    expect(snapshot.opsResult?.options.length).toBeGreaterThan(0);
    expect(snapshot.recommendation?.summary).toContain("Puter flight-operations for A31.");
    expect(snapshot.recommendation?.summary).toContain("Puter customer-service for A31.");
    expect(snapshot.recommendation?.passengerConsequences).toContain("158");
    expect(snapshot.audit.some((event) => event.message.includes("Puter.js (gpt-5.4-nano)"))).toBe(true);
  });

  it("keeps the tool summary when Puter fails and rejects an unsafe narrative", async () => {
    const selected = selectScenario(createInitialSnapshot(), scenario.id, now);
    const snapshot = await runAgents(selected, {
      stepDelayMs: 0,
      now,
      narrate: async () => Promise.reject(new Error("Puter sign-in was closed.")),
    });
    expect(snapshot.opsResult?.narrativeSource).toBe("tools");
    expect(snapshot.opsResult?.summary).toContain("authorized 0");
    expect(snapshot.recommendation?.narrativeSource).toBe("tools");
    expect(snapshot.audit.some((event) => event.detail.includes("Puter sign-in was closed."))).toBe(true);
    expect(parseNarrative('{"summary":"It is safe to divert.","recommendedNextStep":"Go."}')).toBeNull();
    expect(
      parseNarrative(
        '```json\n{"summary":"Review A31 with a dispatcher.","recommendedNextStep":"Do not divert from this screen."}\n```',
      )?.summary,
    ).toContain("Review A31");
  });

  it("refuses unknown flights and does not draft a sent message", () => {
    expect(() => getFlightStatus("ZZZ", ctx)).toThrow(/no flight record/i);
    expect(() => getDiversionOptions("A31", { outageTool: "getDiversionOptions" })).toThrow(/data outage/i);
    const draft = draftCustomerUpdate(
      {
        flightId: "A31",
        status: "Grounded",
        passengers: 158,
        connectingPassengers: 42,
        wheelchairPassengers: 3,
        optionLabels: ["Review STL"],
      },
      ctx,
    );
    expect(draft.sent).toBe(false);
    expect(draft.draft).toContain("not sent");
    expect(selectScenario(createInitialSnapshot(), "other", now).scenarioId).toBeNull();
  });
});
