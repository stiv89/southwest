import assistanceJson from "../../data/mock/assistance.json";
import diversionJson from "../../data/mock/diversion-candidates.json";
import scenarioJson from "../../data/mock/scenario-mci-ground-stop.json";

export interface ScenarioRecord {
  id: string;
  label: string;
  dayLabel: string;
  simulatedTime: string;
  airport: string;
  airportName: string;
  operationalStatus: "Grounded";
  event: string;
  constraint: string;
  aircraftId: string;
  origin: string;
  airborne: boolean;
  passengers: number;
  connectingPassengers: number;
  wheelchairPassengers: number;
  crewDutyRemaining: string;
  crewDutyMinutes: number;
  crewNote: string;
  fuelFlexibilityMinutes: number;
  fuelNote: string;
  alternateAirports: string[];
  sourceLabel: string;
}

export interface DiversionCandidate {
  id: string;
  airport: string;
  name: string;
  note: string;
  verifiedHandlingCapacity: null;
  verifiedRunwaySuitability: null;
  verifiedFlightTimeMinutes: null;
  verifiedFuelRequired: null;
  verifiedGroundHandling: null;
}

export interface DiversionData {
  source: "mock";
  disclaimer: string;
  holdOption: { id: string; label: string };
  candidates: DiversionCandidate[];
}

export interface AssistanceData {
  source: "unavailable";
  inventoryKnown: false;
  hotels: null;
  groundTransport: null;
  reason: string;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} must be a non-empty string.`);
  }
  return value;
}

function requireNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${key} must be a finite number.`);
  }
  return value;
}

function requireBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") throw new Error(`${key} must be a boolean.`);
  return value;
}

function requireUnknown(record: Record<string, unknown>, key: string): null {
  if (record[key] !== null) {
    throw new Error(
      `${key} must stay null until a verified source is wired. Refusing to treat a mock figure as an operational fact.`,
    );
  }
  return null;
}

function parseScenario(input: unknown): ScenarioRecord {
  const record = asRecord(input, "scenario");
  const operationalStatus = requireString(record, "operationalStatus");
  if (operationalStatus !== "Grounded") {
    throw new Error("This demo scenario must stay Grounded.");
  }
  const alternateAirports = record.alternateAirports;
  if (
    !Array.isArray(alternateAirports) ||
    alternateAirports.length === 0 ||
    alternateAirports.some((code) => typeof code !== "string" || code.trim() === "")
  ) {
    throw new Error("alternateAirports must be a non-empty list of codes.");
  }
  return {
    id: requireString(record, "id"),
    label: requireString(record, "label"),
    dayLabel: requireString(record, "dayLabel"),
    simulatedTime: requireString(record, "simulatedTime"),
    airport: requireString(record, "airport"),
    airportName: requireString(record, "airportName"),
    operationalStatus,
    event: requireString(record, "event"),
    constraint: requireString(record, "constraint"),
    aircraftId: requireString(record, "aircraftId"),
    origin: requireString(record, "origin"),
    airborne: requireBoolean(record, "airborne"),
    passengers: requireNumber(record, "passengers"),
    connectingPassengers: requireNumber(record, "connectingPassengers"),
    wheelchairPassengers: requireNumber(record, "wheelchairPassengers"),
    crewDutyRemaining: requireString(record, "crewDutyRemaining"),
    crewDutyMinutes: requireNumber(record, "crewDutyMinutes"),
    crewNote: requireString(record, "crewNote"),
    fuelFlexibilityMinutes: requireNumber(record, "fuelFlexibilityMinutes"),
    fuelNote: requireString(record, "fuelNote"),
    alternateAirports,
    sourceLabel: requireString(record, "sourceLabel"),
  };
}

function parseCandidate(input: unknown): DiversionCandidate {
  const record = asRecord(input, "diversion candidate");
  return {
    id: requireString(record, "id"),
    airport: requireString(record, "airport"),
    name: requireString(record, "name"),
    note: requireString(record, "note"),
    verifiedHandlingCapacity: requireUnknown(record, "verifiedHandlingCapacity"),
    verifiedRunwaySuitability: requireUnknown(record, "verifiedRunwaySuitability"),
    verifiedFlightTimeMinutes: requireUnknown(record, "verifiedFlightTimeMinutes"),
    verifiedFuelRequired: requireUnknown(record, "verifiedFuelRequired"),
    verifiedGroundHandling: requireUnknown(record, "verifiedGroundHandling"),
  };
}

function parseDiversion(input: unknown, scenario: ScenarioRecord): DiversionData {
  const record = asRecord(input, "diversion data");
  const source = requireString(record, "source");
  if (source !== "mock") throw new Error("Diversion data must be labeled mock.");
  const hold = asRecord(record.holdOption, "hold option");
  const rawCandidates = record.candidates;
  if (!Array.isArray(rawCandidates) || rawCandidates.length === 0) {
    throw new Error("Diversion candidates are missing.");
  }
  const candidates = rawCandidates.map(parseCandidate);
  const airports = candidates.map((candidate) => candidate.airport);
  if (airports.join(",") !== scenario.alternateAirports.join(",")) {
    throw new Error("Diversion candidates must match the scenario alternate list and order.");
  }
  return {
    source,
    disclaimer: requireString(record, "disclaimer"),
    holdOption: { id: requireString(hold, "id"), label: requireString(hold, "label") },
    candidates,
  };
}

function parseAssistance(input: unknown): AssistanceData {
  const record = asRecord(input, "assistance");
  const source = requireString(record, "source");
  if (source !== "unavailable") {
    throw new Error("Assistance data must stay unavailable until the course hotel file is inspected.");
  }
  if (record.inventoryKnown !== false) {
    throw new Error("Assistance inventory cannot be marked known without the course hotel file.");
  }
  return {
    source,
    inventoryKnown: false,
    hotels: requireUnknown(record, "hotels"),
    groundTransport: requireUnknown(record, "groundTransport"),
    reason: requireString(record, "reason"),
  };
}

export const scenario = parseScenario(scenarioJson);
export const diversion = parseDiversion(diversionJson, scenario);
export const assistance = parseAssistance(assistanceJson);
