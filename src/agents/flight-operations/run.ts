import { buildAgentResult } from "../result";
import { OPS_MAX_ITERATIONS } from "../../lib/constants";
import type { AgentEvent, AgentOption, AgentResult } from "../../types/contracts";
import type { ToolContext } from "../../tools/errors";
import { runTool } from "../../tools/invoke";
import {
  evaluateOperationalImpact,
  getAirportStatus,
  getCrewConstraints,
  getDiversionOptions,
  getFlightStatus,
  type DiversionOptions,
  type OperationalImpact,
} from "../../tools/flight-operations";

export interface FlightOpsRequest {
  ctx: ToolContext;
  flightId: string;
  airport: string;
}

function unknownField(label: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return `${label}: unknown`;
  return `${label}: ${String(value)}`;
}

export function* runFlightOperations(request: FlightOpsRequest): Generator<AgentEvent, AgentResult> {
  const { ctx, flightId, airport } = request;
  const toolCalls: AgentResult["toolCalls"] = [];
  const knownFacts: string[] = [];
  const unknowns: string[] = [];
  const options: AgentOption[] = [];
  const sources: string[] = [];
  const impacts: OperationalImpact[] = [];
  let iterations = 0;
  let early: AgentResult | null = null;
  let subjectId = "";
  let situation = "";
  let scenarioId = "";

  function fail(name: string, message: string): AgentResult {
    const prefix = knownFacts.length > 0 ? `${knownFacts.join(" ")} ` : "";
    return buildAgentResult({
      agent: "flight-operations",
      scenarioId,
      status: "error",
      summary: `${prefix}Stopped because ${name} failed. ${message} No diversion recommendation was produced.`,
      knownFacts,
      unknowns: [...unknowns, message],
      options,
      recommendedNextStep:
        "Escalate to a human dispatcher. Missing tool output is not a clearance to divert, hold, or dispatch.",
      toolCalls,
      stopReason: "tool_failure",
      iterations,
      maxIterations: OPS_MAX_ITERATIONS,
      subjectId,
      situation,
      sources,
    });
  }

  function* step<T>(name: string, input: object, fn: () => T): Generator<AgentEvent, T | undefined> {
    if (early) return undefined;
    if (iterations >= OPS_MAX_ITERATIONS) {
      early = buildAgentResult({
        agent: "flight-operations",
        scenarioId,
        status: "error",
        summary: "Stopped because the iteration limit was reached before flight operations finished.",
        knownFacts,
        unknowns: [...unknowns, `Iteration limit of ${OPS_MAX_ITERATIONS} reached.`],
        options,
        recommendedNextStep: "Escalate to a human dispatcher. The loop stopped before a complete review.",
        toolCalls,
        stopReason: "iteration_limit",
        iterations,
        maxIterations: OPS_MAX_ITERATIONS,
        subjectId,
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

  const flight = yield* step("getFlightStatus", { flightId }, () => getFlightStatus(flightId, ctx));
  if (early) return early;
  if (!flight) throw new Error("Flight operations ended without a flight status or an error result.");
  scenarioId = flight.scenarioId;
  subjectId = flight.flightId;
  sources.push(flight.source);
  const position = flight.airborne ? "airborne" : "not confirmed airborne";
  knownFacts.push(
    `${flight.flightId} is ${position} from ${flight.origin} toward ${flight.destination}.`,
  );
  knownFacts.push(
    `${flight.passengers} passengers, ${flight.connectingPassengers} connecting, ${flight.wheelchairPassengers} wheelchair.`,
  );

  const airportStatus = yield* step("getAirportStatus", { airportCode: airport }, () =>
    getAirportStatus(airport, ctx),
  );
  if (early) return early;
  if (!airportStatus) throw new Error("Flight operations ended without an airport status.");
  sources.push(airportStatus.source);
  situation = airportStatus.event
    ? `${airportStatus.operationalStatus}. ${airportStatus.event}`
    : airportStatus.operationalStatus;
  knownFacts.push(`${airportStatus.airport} operational status is ${airportStatus.operationalStatus}.`);
  if (airportStatus.event) knownFacts.push(airportStatus.event);
  if (airportStatus.constraint) knownFacts.push(airportStatus.constraint);
  unknowns.push(airportStatus.note);

  const crew = yield* step("getCrewConstraints", { flightId: flight.flightId }, () =>
    getCrewConstraints(flight.flightId, ctx),
  );
  if (early) return early;
  if (!crew) throw new Error("Flight operations ended without crew constraints.");
  sources.push(crew.source);
  knownFacts.push(`Crew duty time remaining: ${crew.dutyRemaining} (${crew.dutyRemainingMinutes} minutes).`);
  unknowns.push(crew.note);

  const diversionOptions = yield* step("getDiversionOptions", { flightId: flight.flightId }, () =>
    getDiversionOptions(flight.flightId, ctx),
  );
  if (early) return early;
  if (!diversionOptions) throw new Error("Flight operations ended without diversion options.");
  sources.push(diversionOptions.source);
  unknowns.push(
    `${diversionOptions.fuelNote} Figure used: ${diversionOptions.fuelFlexibilityMinutes} minutes.`,
  );
  unknowns.push(diversionOptions.disclaimer);

  const qualify = function* (
    candidate: { id: string; label: string; airport: string | null; note: string | null; fields: string[] },
  ): Generator<AgentEvent, void> {
    const impact = yield* step("evaluateOperationalImpact", { optionId: candidate.id }, () =>
      evaluateOperationalImpact(candidate.id, ctx),
    );
    if (!impact) return;
    impacts.push(impact);
    sources.push(impact.source);
    for (const missing of impact.missingInputs) unknowns.push(missing);
    options.push({
      id: candidate.id,
      label: candidate.label,
      airport: candidate.airport,
      risks: impact.missingInputs,
      tradeoffs: [...candidate.fields, impact.note],
      source: diversionOptions.source,
    });
  };

  for (const candidate of diversionOptions.candidates) {
    yield* qualify(candidateCard(candidate));
    if (early) return early;
  }
  yield* qualify({
    id: diversionOptions.holdOption.id,
    label: diversionOptions.holdOption.label,
    airport: null,
    note: null,
    fields: [
      unknownField(
        "Course-brief fuel flexibility (minutes)",
        diversionOptions.fuelFlexibilityMinutes,
      ),
    ],
  });
  if (early) return early;

  const codes = diversionOptions.candidates.map((candidate) => candidate.airport);
  const authorizedCount = impacts.filter((impact) => impact.authorized).length;
  const feasibility = impacts.every((impact) => impact.feasible === null)
    ? "unknown"
    : "not uniformly unknown";

  return buildAgentResult({
    agent: "flight-operations",
    scenarioId,
    status: "needs_human_review",
    summary: `Ground Stop at ${airportStatus.airport} affects inbound flight ${flight.flightId}. Candidate airports from getDiversionOptions: ${codes.join(", ")}. This system authorized ${authorizedCount} of ${impacts.length} evaluated options. Feasibility is ${feasibility}. No preferred alternate is selected.`,
    knownFacts,
    unknowns,
    options,
    recommendedNextStep: `Request a dispatcher to review ${options.length} unqualified options for ${flight.flightId}. Do not divert, hold, or dispatch from this screen.`,
    toolCalls,
    stopReason: "objective_met",
    iterations,
    maxIterations: OPS_MAX_ITERATIONS,
    subjectId,
    situation,
    sources,
  });
}

function candidateCard(candidate: DiversionOptions["candidates"][number]): {
  id: string;
  label: string;
  airport: string;
  note: string;
  fields: string[];
} {
  return {
    id: candidate.id,
    label: `Review ${candidate.airport} — ${candidate.name}`,
    airport: candidate.airport,
    note: candidate.note,
    fields: [
      unknownField("Handling capacity", candidate.verifiedHandlingCapacity),
      unknownField("Runway suitability", candidate.verifiedRunwaySuitability),
      unknownField("Diversion flight time (minutes)", candidate.verifiedFlightTimeMinutes),
      unknownField("Fuel required", candidate.verifiedFuelRequired),
      unknownField("Ground handling", candidate.verifiedGroundHandling),
      candidate.note,
    ],
  };
}
