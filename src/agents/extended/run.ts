import { buildAgentResult } from "../result";
import { EXT_MAX_ITERATIONS } from "../../lib/constants";
import type { AgentEvent, AgentResult } from "../../types/contracts";
import type { ToolContext } from "../../tools/errors";
import { runTool } from "../../tools/invoke";
import {
  draftAirportManagementUpdate,
  draftInternalComms,
  draftVendorNotice,
  getComplianceChecklist,
  getEquipmentStressIndicators,
  getGroundStaffSchedule,
  getMaintenanceReadiness,
  getRampCoverage,
  getSafetyScore,
} from "../../tools/extended-agents";

export interface ExtendedAgentRequest {
  ctx: ToolContext;
  scenarioId: string;
  flightId: string;
  airport: string;
  situation: string;
  optionLabels: string[];
}

function createStepRunner(
  agent: AgentResult["agent"],
  scenarioId: string,
  flightId: string,
  situation: string,
) {
  const toolCalls: AgentResult["toolCalls"] = [];
  const knownFacts: string[] = [];
  const unknowns: string[] = [];
  const sources: string[] = [];
  let iterations = 0;
  let early: AgentResult | null = null;

  function fail(name: string, message: string): AgentResult {
    return buildAgentResult({
      agent,
      scenarioId,
      status: "error",
      summary: `Stopped because ${name} failed. ${message}`,
      knownFacts,
      unknowns: [...unknowns, message],
      options: [],
      recommendedNextStep: "Escalate to a human. Do not treat a tool failure as operational clearance.",
      toolCalls,
      stopReason: "tool_failure",
      iterations,
      maxIterations: EXT_MAX_ITERATIONS,
      subjectId: flightId,
      situation,
      sources,
    });
  }

  function* step<T>(name: string, input: object, fn: () => T): Generator<AgentEvent, T | undefined> {
    if (early) return undefined;
    if (iterations >= EXT_MAX_ITERATIONS) {
      early = buildAgentResult({
        agent,
        scenarioId,
        status: "error",
        summary: "Stopped because the iteration limit was reached.",
        knownFacts,
        unknowns: [...unknowns, `Iteration limit of ${EXT_MAX_ITERATIONS} reached.`],
        options: [],
        recommendedNextStep: "Escalate to a human.",
        toolCalls,
        stopReason: "iteration_limit",
        iterations,
        maxIterations: EXT_MAX_ITERATIONS,
        subjectId: flightId,
        situation,
        sources,
      });
      return undefined;
    }
    iterations += 1;
    yield { type: "status", runState: "Running", action: `Calling ${name}`, toolName: name };
    const outcome = runTool(name, input, fn);
    toolCalls.push(outcome.record);
    yield { type: "tool", record: outcome.record };
    if (!outcome.ok) {
      early = fail(name, outcome.record.summary);
      return undefined;
    }
    return outcome.value;
  }

  return { step, getEarly: () => early, setEarly: (value: AgentResult) => { early = value; }, toolCalls, knownFacts, unknowns, sources, getIterations: () => iterations };
}

export function* runScheduling(request: ExtendedAgentRequest): Generator<AgentEvent, AgentResult> {
  const { ctx, airport, scenarioId, flightId, situation } = request;
  const runner = createStepRunner("scheduling", scenarioId, flightId, situation);

  const schedule = yield* runner.step("getGroundStaffSchedule", { airportCode: airport }, () =>
    getGroundStaffSchedule(airport, ctx),
  );
  if (runner.getEarly()) return runner.getEarly()!;
  if (!schedule) throw new Error("Scheduling ended without schedule data.");
  runner.sources.push(schedule.source);
  runner.knownFacts.push(`Ground staff recommendation: ${schedule.recommendation}`);
  if (schedule.staffingGapHours === null) runner.unknowns.push(schedule.note);

  const ramp = yield* runner.step("getRampCoverage", { airportCode: airport }, () =>
    getRampCoverage(airport, ctx),
  );
  if (runner.getEarly()) return runner.getEarly()!;
  if (!ramp) throw new Error("Scheduling ended without ramp coverage.");
  runner.sources.push(ramp.source);
  runner.knownFacts.push(`Contingency crew on call (mock): ${ramp.contingencyCrewOnCall}.`);
  if (ramp.coveragePercent === null) runner.unknowns.push(ramp.note);

  return buildAgentResult({
    agent: "scheduling",
    scenarioId,
    status: "needs_human_review",
    summary: `Non–air crew schedule review for ${airport}: ${schedule.recommendation} Ramp coverage percent remains unknown.`,
    knownFacts: runner.knownFacts,
    unknowns: runner.unknowns,
    options: [],
    recommendedNextStep: "Confirm staffing changes with airport labor planning before executing recovery.",
    toolCalls: runner.toolCalls,
    stopReason: "objective_met",
    iterations: runner.getIterations(),
    maxIterations: EXT_MAX_ITERATIONS,
    subjectId: flightId,
    situation,
    sources: runner.sources,
  });
}

export function* runCommunications(request: ExtendedAgentRequest): Generator<AgentEvent, AgentResult> {
  const { scenarioId, flightId, situation, airport, optionLabels } = request;
  const runner = createStepRunner("communications", scenarioId, flightId, situation);

  const internal = yield* runner.step(
    "draftInternalComms",
    { flightId, audience: "Network Dispatch + Station Leadership", situation },
    () =>
      draftInternalComms({
        flightId,
        audience: "Network Dispatch + Station Leadership",
        situation,
      }),
  );
  if (runner.getEarly()) return runner.getEarly()!;
  if (!internal) throw new Error("Communications ended without internal draft.");
  runner.sources.push(internal.source);
  runner.knownFacts.push(internal.draft);

  const vendor = yield* runner.step(
    "draftVendorNotice",
    { airportCode: airport, vendors: optionLabels.slice(0, 2) },
    () => draftVendorNotice({ airportCode: airport, vendors: optionLabels.slice(0, 2) }),
  );
  if (runner.getEarly()) return runner.getEarly()!;
  if (!vendor) throw new Error("Communications ended without vendor draft.");
  runner.sources.push(vendor.source);

  const airportMsg = yield* runner.step(
    "draftAirportManagementUpdate",
    { airportCode: airport, flightId },
    () => draftAirportManagementUpdate({ airportCode: airport, flightId }),
  );
  if (runner.getEarly()) return runner.getEarly()!;
  if (!airportMsg) throw new Error("Communications ended without airport draft.");
  runner.sources.push(airportMsg.source);
  runner.knownFacts.push(airportMsg.draft);

  return buildAgentResult({
    agent: "communications",
    scenarioId,
    status: "needs_human_review",
    summary:
      "Drafted internal, vendor, and airport-management messages. All channels are simulated and not sent.",
    knownFacts: runner.knownFacts,
    unknowns: runner.unknowns,
    options: [],
    recommendedNextStep: "A human must approve wording before any message leaves this educational demo.",
    toolCalls: runner.toolCalls,
    stopReason: "objective_met",
    iterations: runner.getIterations(),
    maxIterations: EXT_MAX_ITERATIONS,
    subjectId: flightId,
    situation,
    sources: runner.sources,
  });
}

export function* runComplianceSafety(request: ExtendedAgentRequest): Generator<AgentEvent, AgentResult> {
  const { ctx, scenarioId, flightId, situation } = request;
  const runner = createStepRunner("compliance-safety", scenarioId, flightId, situation);

  const checklist = yield* runner.step("getComplianceChecklist", {}, () => getComplianceChecklist(ctx));
  if (runner.getEarly()) return runner.getEarly()!;
  if (!checklist) throw new Error("Compliance ended without checklist.");
  runner.sources.push(checklist.source);
  runner.knownFacts.push(`Open compliance items: ${checklist.openItems.length}.`);

  const safety = yield* runner.step(
    "getSafetyScore",
    { flightId, scenario: situation },
    () => getSafetyScore({ flightId, scenario: situation }, ctx),
  );
  if (runner.getEarly()) return runner.getEarly()!;
  if (!safety) throw new Error("Compliance ended without safety score.");
  runner.sources.push(safety.source);
  if (safety.score === null) runner.unknowns.push("Safety score is not available from mock data.");
  runner.knownFacts.push(`Safety posture: ${safety.scoreLabel}. Human alert required: ${safety.humanAlertRequired}.`);

  return buildAgentResult({
    agent: "compliance-safety",
    scenarioId,
    status: "needs_human_review",
    summary: `Compliance review complete with ${checklist.openItems.length} open items. Safety score remains review-required.`,
    knownFacts: runner.knownFacts,
    unknowns: [...runner.unknowns, ...checklist.openItems],
    options: [],
    recommendedNextStep: "Legal and safety reviewers must clear unknown operational inputs before execution.",
    toolCalls: runner.toolCalls,
    stopReason: "objective_met",
    iterations: runner.getIterations(),
    maxIterations: EXT_MAX_ITERATIONS,
    subjectId: flightId,
    situation,
    sources: runner.sources,
  });
}

export function* runMaintenance(request: ExtendedAgentRequest): Generator<AgentEvent, AgentResult> {
  const { ctx, scenarioId, flightId } = request;
  const situation = request.situation;
  const runner = createStepRunner("maintenance", scenarioId, flightId, situation);

  const readiness = yield* runner.step("getMaintenanceReadiness", { aircraftId: flightId }, () =>
    getMaintenanceReadiness(flightId, ctx),
  );
  if (runner.getEarly()) return runner.getEarly()!;
  if (!readiness) throw new Error("Maintenance ended without readiness.");
  runner.sources.push(readiness.source);
  runner.knownFacts.push(readiness.maintenanceNote);
  if (readiness.canContinueInCurrentConfig === null) runner.unknowns.push(readiness.melStatus);

  const stress = yield* runner.step("getEquipmentStressIndicators", { aircraftId: flightId }, () =>
    getEquipmentStressIndicators(flightId, ctx),
  );
  if (runner.getEarly()) return runner.getEarly()!;
  if (!stress) throw new Error("Maintenance ended without stress indicators.");
  runner.sources.push(stress.source);
  runner.unknowns.push(stress.recommendation);

  return buildAgentResult({
    agent: "maintenance",
    scenarioId,
    status: "needs_human_review",
    summary: `Maintenance readiness for ${flightId}: ${readiness.maintenanceNote}`,
    knownFacts: runner.knownFacts,
    unknowns: runner.unknowns,
    options: [],
    recommendedNextStep: "Maintenance control must confirm airworthiness separately from this simulation.",
    toolCalls: runner.toolCalls,
    stopReason: "objective_met",
    iterations: runner.getIterations(),
    maxIterations: EXT_MAX_ITERATIONS,
    subjectId: flightId,
    situation,
    sources: runner.sources,
  });
}