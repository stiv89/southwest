import { assistance, scenario } from "../lib/mock-data";
import { assertNoOutage, ToolError, type ToolContext } from "./errors";

export interface PassengerImpact {
  flightId: string;
  passengers: number;
  wheelchairPassengers: number;
  source: string;
  note: string;
}

export interface ConnectionImpact {
  flightId: string;
  connectingPassengers: number;
  source: string;
  note: string;
  risks: string[];
}

export interface AssistanceAvailability {
  airportCode: string;
  source: "unavailable";
  inventoryKnown: false;
  hotels: null;
  groundTransport: null;
  reason: string;
}

export interface CustomerDraft {
  flightId: string;
  draft: string;
  sent: false;
  source: "simulated-draft";
}

export interface DraftRequest {
  flightId: string;
  status: string;
  passengers: number;
  connectingPassengers: number;
  wheelchairPassengers: number;
  optionLabels: string[];
}

export function getPassengerImpact(flightId: string, ctx: ToolContext): PassengerImpact {
  assertNoOutage(ctx, "getPassengerImpact");
  if (flightId !== scenario.aircraftId) {
    throw new ToolError(`getPassengerImpact failed: no passenger record for ${flightId}.`);
  }
  return {
    flightId: scenario.aircraftId,
    passengers: scenario.passengers,
    wheelchairPassengers: scenario.wheelchairPassengers,
    source: scenario.sourceLabel,
    note: "Counts are course-brief facts. This tool has no passenger names or contact details.",
  };
}

export function getConnectionImpact(flightId: string, ctx: ToolContext): ConnectionImpact {
  assertNoOutage(ctx, "getConnectionImpact");
  if (flightId !== scenario.aircraftId) {
    throw new ToolError(`getConnectionImpact failed: no connection record for ${flightId}.`);
  }
  return {
    flightId: scenario.aircraftId,
    connectingPassengers: scenario.connectingPassengers,
    source: scenario.sourceLabel,
    note: "The connection count is a course-brief fact. Misconnect risk is not calculated from a live MCI schedule.",
    risks: ["Connection outcomes are unknown without a verified MCI bank and rebooking feed."],
  };
}

export function getAvailableAssistance(airportCode: string, ctx: ToolContext): AssistanceAvailability {
  assertNoOutage(ctx, "getAvailableAssistance");
  const code = airportCode.trim().toUpperCase();
  if (!code) throw new ToolError("getAvailableAssistance failed: airport code is missing.");
  return {
    airportCode: code,
    source: assistance.source,
    inventoryKnown: assistance.inventoryKnown,
    hotels: assistance.hotels,
    groundTransport: assistance.groundTransport,
    reason: assistance.reason,
  };
}

export function draftCustomerUpdate(request: DraftRequest, ctx: ToolContext): CustomerDraft {
  assertNoOutage(ctx, "draftCustomerUpdate");
  if (request.flightId !== scenario.aircraftId) {
    throw new ToolError(`draftCustomerUpdate failed: no flight record for ${request.flightId}.`);
  }
  const optionText =
    request.optionLabels.length > 0
      ? request.optionLabels.join("; ")
      : "No operational options were provided.";
  const draft = [
    "DRAFT customer update — not sent.",
    `Flight ${request.flightId}: ${request.status}`,
    `${request.passengers} passengers, ${request.connectingPassengers} connecting, ${request.wheelchairPassengers} wheelchair assistance.`,
    `Options under human review: ${optionText}`,
    "No rebooking, hotel, or ground transport is confirmed.",
  ].join("\n");
  return {
    flightId: request.flightId,
    draft,
    sent: false,
    source: "simulated-draft",
  };
}
