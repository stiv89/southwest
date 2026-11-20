import { buildAgentResult } from "../result";
import { CS_MAX_ITERATIONS } from "../../lib/constants";
import type { AgentEvent, AgentOption, AgentResult } from "../../types/contracts";
import type { ToolContext } from "../../tools/errors";
import { runTool } from "../../tools/invoke";
import {
  draftCustomerUpdate,
  getAvailableAssistance,
  getConnectionImpact,
  getPassengerImpact,
  type DraftRequest,
} from "../../tools/customer-service";

export interface CustomerServiceRequest {
  ctx: ToolContext;
  scenarioId: string;
  flightId: string;
  situation: string;
  options: AgentOption[];
}

export function* runCustomerService(request: CustomerServiceRequest): Generator<AgentEvent, AgentResult> {
  const { ctx, flightId, situation, options: operationalOptions } = request;
  const toolCalls: AgentResult["toolCalls"] = [];
  const knownFacts: string[] = [];
  const unknowns: string[] = [];
  const options: AgentOption[] = [];
  const sources: string[] = [];
  let iterations = 0;
  let early: AgentResult | null = null;
  let scenarioId = request.scenarioId;
  const optionLabels = operationalOptions.map((option) => option.label);

  function fail(name: string, message: string): AgentResult {
    const prefix = knownFacts.length > 0 ? `${knownFacts.join(" ")} ` : "";
    return buildAgentResult({
      agent: "customer-service",
      scenarioId,
      status: "error",
      summary: `${prefix}Stopped because ${name} failed. ${message} No passenger message was drafted as a success.`,
      knownFacts,
      unknowns: [...unknowns, message],
      options,
      recommendedNextStep:
        "Escalate to a human. Do not send a customer update or promise rebooking, hotels, or transport.",
      toolCalls,
      stopReason: "tool_failure",
      iterations,
      maxIterations: CS_MAX_ITERATIONS,
      subjectId: flightId,
      situation,
      sources,
    });
  }

  function* step<T>(name: string, input: object, fn: () => T): Generator<AgentEvent, T | undefined> {
    if (early) return undefined;
    if (iterations >= CS_MAX_ITERATIONS) {
      early = buildAgentResult({
        agent: "customer-service",
        scenarioId,
        status: "error",
        summary: "Stopped because the iteration limit was reached before customer service finished.",
        knownFacts,
        unknowns: [...unknowns, `Iteration limit of ${CS_MAX_ITERATIONS} reached.`],
        options,
        recommendedNextStep: "Escalate to a human. The passenger review is incomplete.",
        toolCalls,
        stopReason: "iteration_limit",
        iterations,
        maxIterations: CS_MAX_ITERATIONS,
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

  const impact = yield* step("getPassengerImpact", { flightId }, () => getPassengerImpact(flightId, ctx));
  if (early) return early;
  if (!impact) throw new Error("Customer service ended without passenger impact.");
  sources.push(impact.source);
  knownFacts.push(`${impact.passengers} passengers on ${impact.flightId}.`);
  knownFacts.push(`${impact.wheelchairPassengers} wheelchair passengers.`);
  unknowns.push(impact.note);

  const connections = yield* step("getConnectionImpact", { flightId }, () =>
    getConnectionImpact(flightId, ctx),
  );
  if (early) return early;
  if (!connections) throw new Error("Customer service ended without connection impact.");
  sources.push(connections.source);
  knownFacts.push(`${connections.connectingPassengers} connecting passengers.`);
  unknowns.push(connections.note);
  for (const risk of connections.risks) unknowns.push(risk);

  const assistance = yield* step("getAvailableAssistance", { airportCode: "MCI" }, () =>
    getAvailableAssistance("MCI", ctx),
  );
  if (early) return early;
  if (!assistance) throw new Error("Customer service ended without an assistance result.");
  sources.push(assistance.source);
  unknowns.push(assistance.reason);
  if (assistance.inventoryKnown) {
    knownFacts.push(
      `Classroom hotel snapshot: ${assistance.hotels.roomsAvailableTotal} rooms available across ${assistance.hotels.properties.length} MCI-area properties (not reserved).`,
    );
    knownFacts.push(
      `Classroom ground transport snapshot: ${assistance.groundTransport.vans16Passenger} sixteen-passenger vans and ${assistance.groundTransport.vans8Passenger} eight-passenger vans on the professor sheet (not dispatched).`,
    );
    unknowns.push(
      "Workbook inventory is a classroom snapshot. No rooms or vehicles are reserved for this diversion decision.",
    );
  } else {
    unknowns.push(
      `Hotel inventory at ${assistance.airportCode} is unknown. Ground transportation at ${assistance.airportCode} is unknown.`,
    );
  }

  const draftRequest: DraftRequest = {
    flightId,
    status: situation,
    passengers: impact.passengers,
    connectingPassengers: connections.connectingPassengers,
    wheelchairPassengers: impact.wheelchairPassengers,
    optionLabels,
  };
  const draft = yield* step("draftCustomerUpdate", draftRequest, () => draftCustomerUpdate(draftRequest, ctx));
  if (early) return early;
  if (!draft) throw new Error("Customer service ended without a draft.");
  sources.push(draft.source);
  if (draft.sent !== false) {
    return buildAgentResult({
      agent: "customer-service",
      scenarioId,
      status: "error",
      summary: "Stopped because the draft tool did not keep the message unsent.",
      knownFacts,
      unknowns,
      options,
      recommendedNextStep: "Do not send the message. Escalate to a human.",
      toolCalls,
      stopReason: "tool_failure",
      iterations,
      maxIterations: CS_MAX_ITERATIONS,
      subjectId: flightId,
      situation,
      sources,
    });
  }

  const passengerConsequences = `${impact.passengers} passengers, ${connections.connectingPassengers} connecting passengers, and ${impact.wheelchairPassengers} wheelchair passengers on ${impact.flightId}.`;
  const requiredAssistance = `${assistance.reason} inventoryKnown=${assistance.inventoryKnown}. Options in review: ${optionLabels.join("; ") || "none"}.`;

  if (impact.wheelchairPassengers > 0) {
    options.push({
      id: "accessibility",
      label: `Plan assistance for ${impact.wheelchairPassengers} wheelchair passengers`,
      airport: assistance.airportCode,
      risks: ["Specific assistance resources are not confirmed."],
      tradeoffs: [impact.note],
      source: impact.source,
    });
  }
  if (connections.connectingPassengers > 0) {
    options.push({
      id: "connections",
      label: `Review ${connections.connectingPassengers} connecting passengers`,
      airport: null,
      risks: connections.risks,
      tradeoffs: [connections.note],
      source: connections.source,
    });
  }
  options.push({
    id: "draft-update",
    label: "Hold the draft customer update for approval",
    airport: null,
    risks: ["Sending is not allowed before human approval."],
    tradeoffs: ["The draft tool returned sent=false."],
    source: draft.source,
  });
  options.push({
    id: "assistance-unknown",
    label: assistance.inventoryKnown
      ? `Review classroom hotel and transport snapshot at ${assistance.airportCode} before confirming anything`
      : `Do not confirm hotels or ground transport at ${assistance.airportCode}`,
    airport: assistance.airportCode,
    risks: [assistance.reason],
    tradeoffs: [`inventoryKnown=${String(assistance.inventoryKnown)}.`],
    source: assistance.source,
  });

  return buildAgentResult({
    agent: "customer-service",
    scenarioId,
    status: "needs_human_review",
    summary: `${passengerConsequences} Assistance inventoryKnown is ${assistance.inventoryKnown}. Operational options received: ${optionLabels.join("; ") || "none"}.`,
    knownFacts,
    unknowns,
    options,
    recommendedNextStep:
      "Request human approval before any passenger message. Do not confirm rebooking, hotels, or ground transport.",
    toolCalls,
    stopReason: "objective_met",
    iterations,
    maxIterations: CS_MAX_ITERATIONS,
    subjectId: flightId,
    situation,
    sources,
    draftNotification: draft.draft,
    passengerConsequences,
    requiredAssistance,
  });
}
