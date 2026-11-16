import { diversion, scenario } from "../lib/mock-data";
import { assertNoOutage, ToolError, type ToolContext } from "./errors";

const MISSING_INPUTS = [
  "Verified alternate airport handling capacity",
  "Runway suitability",
  "Actual diversion flight time",
  "Fuel required versus fuel remaining",
  "Ground handling availability",
];

export interface FlightStatus {
  scenarioId: string;
  flightId: string;
  origin: string;
  airborne: boolean;
  destination: string;
  passengers: number;
  connectingPassengers: number;
  wheelchairPassengers: number;
  source: string;
}

export interface AirportStatus {
  airport: string;
  name: string;
  operationalStatus: string;
  event: string | null;
  constraint: string | null;
  handlingCapacity: null;
  runwaySuitability: null;
  groundHandling: null;
  source: string;
  note: string;
}

export interface CrewConstraints {
  flightId: string;
  dutyRemaining: string;
  dutyRemainingMinutes: number;
  source: string;
  note: string;
}

export interface DiversionOptions {
  flightId: string;
  source: string;
  disclaimer: string;
  fuelFlexibilityMinutes: number;
  fuelNote: string;
  candidates: typeof diversion.candidates;
  holdOption: { id: string; label: string };
}

export interface OperationalImpact {
  optionId: string;
  source: "mock";
  authorized: false;
  feasible: null;
  missingInputs: string[];
  note: string;
}

function knownOption(optionId: string): boolean {
  if (optionId === diversion.holdOption.id) return true;
  return diversion.candidates.some((candidate) => candidate.id === optionId);
}

export function getFlightStatus(flightId: string, ctx: ToolContext): FlightStatus {
  assertNoOutage(ctx, "getFlightStatus");
  if (flightId !== scenario.aircraftId) {
    throw new ToolError(`getFlightStatus failed: no flight record for ${flightId}.`);
  }
  return {
    scenarioId: scenario.id,
    flightId: scenario.aircraftId,
    origin: scenario.origin,
    airborne: scenario.airborne,
    destination: scenario.airport,
    passengers: scenario.passengers,
    connectingPassengers: scenario.connectingPassengers,
    wheelchairPassengers: scenario.wheelchairPassengers,
    source: scenario.sourceLabel,
  };
}

export function getAirportStatus(airportCode: string, ctx: ToolContext): AirportStatus {
  assertNoOutage(ctx, "getAirportStatus");
  const code = airportCode.trim().toUpperCase();
  if (code === scenario.airport) {
    return {
      airport: scenario.airport,
      name: scenario.airportName,
      operationalStatus: scenario.operationalStatus,
      event: scenario.event,
      constraint: scenario.constraint,
      handlingCapacity: null,
      runwaySuitability: null,
      groundHandling: null,
      source: scenario.sourceLabel,
      note: "Status is a course-brief fact for this scenario, not a live airport feed.",
    };
  }
  const candidate = diversion.candidates.find((item) => item.airport === code);
  if (!candidate) {
    throw new ToolError(`getAirportStatus failed: no airport record for ${code}.`);
  }
  return {
    airport: candidate.airport,
    name: candidate.name,
    operationalStatus: "Unknown",
    event: null,
    constraint: null,
    handlingCapacity: null,
    runwaySuitability: null,
    groundHandling: null,
    source: diversion.source,
    note: candidate.note,
  };
}

export function getCrewConstraints(flightId: string, ctx: ToolContext): CrewConstraints {
  assertNoOutage(ctx, "getCrewConstraints");
  if (flightId !== scenario.aircraftId) {
    throw new ToolError(`getCrewConstraints failed: no crew record for ${flightId}.`);
  }
  return {
    flightId: scenario.aircraftId,
    dutyRemaining: scenario.crewDutyRemaining,
    dutyRemainingMinutes: scenario.crewDutyMinutes,
    source: scenario.sourceLabel,
    note: scenario.crewNote,
  };
}

export function getDiversionOptions(flightId: string, ctx: ToolContext): DiversionOptions {
  assertNoOutage(ctx, "getDiversionOptions");
  if (flightId !== scenario.aircraftId) {
    throw new ToolError(`getDiversionOptions failed: no diversion record for ${flightId}.`);
  }
  return {
    flightId: scenario.aircraftId,
    source: diversion.source,
    disclaimer: diversion.disclaimer,
    fuelFlexibilityMinutes: scenario.fuelFlexibilityMinutes,
    fuelNote: scenario.fuelNote,
    candidates: diversion.candidates,
    holdOption: diversion.holdOption,
  };
}

export function evaluateOperationalImpact(optionId: string, ctx: ToolContext): OperationalImpact {
  assertNoOutage(ctx, "evaluateOperationalImpact");
  if (!knownOption(optionId)) {
    throw new ToolError(`evaluateOperationalImpact failed: unknown option ${optionId}.`);
  }
  return {
    optionId,
    source: "mock",
    authorized: false,
    feasible: null,
    missingInputs: [...MISSING_INPUTS],
    note: "This classroom evaluation does not authorize a diversion, a hold, or a dispatch change.",
  };
}
