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

export interface HotelProperty {
  name: string;
  roomsAvailable: number;
  disruptionRateUsd: number;
  milesFromMci: number;
  shuttle: string;
  busCapacityPerTrip: number;
  usePreference: string;
}

export interface AssistanceHotels {
  workbook: string;
  sheet: string;
  roomsAvailableTotal: number;
  properties: HotelProperty[];
}

export interface AssistanceGroundTransport {
  workbook: string;
  vans16Passenger: number;
  vans8Passenger: number;
  van16RentalUsdPerHour: number;
  van8RentalUsdPerHour: number;
  uberXlContractedUsdPerTrip: number;
  note: string;
}

export interface AssistanceData {
  source: "course-workbook";
  inventoryKnown: true;
  hotels: AssistanceHotels;
  groundTransport: AssistanceGroundTransport;
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

function parseHotelProperty(input: unknown): HotelProperty {
  const record = asRecord(input, "hotel property");
  return {
    name: requireString(record, "name"),
    roomsAvailable: requireNumber(record, "roomsAvailable"),
    disruptionRateUsd: requireNumber(record, "disruptionRateUsd"),
    milesFromMci: requireNumber(record, "milesFromMci"),
    shuttle: requireString(record, "shuttle"),
    busCapacityPerTrip: requireNumber(record, "busCapacityPerTrip"),
    usePreference: requireString(record, "usePreference"),
  };
}

function parseAssistanceHotels(input: unknown): AssistanceHotels {
  const record = asRecord(input, "assistance hotels");
  const rawProperties = record.properties;
  if (!Array.isArray(rawProperties) || rawProperties.length === 0) {
    throw new Error("assistance hotels must include at least one property.");
  }
  const properties = rawProperties.map(parseHotelProperty);
  const declaredTotal = requireNumber(record, "roomsAvailableTotal");
  const summed = properties.reduce((sum, property) => sum + property.roomsAvailable, 0);
  if (declaredTotal !== summed) {
    throw new Error("assistance roomsAvailableTotal must match the sum of property roomsAvailable.");
  }
  return {
    workbook: requireString(record, "workbook"),
    sheet: requireString(record, "sheet"),
    roomsAvailableTotal: declaredTotal,
    properties,
  };
}

function parseAssistanceGroundTransport(input: unknown): AssistanceGroundTransport {
  const record = asRecord(input, "assistance ground transport");
  return {
    workbook: requireString(record, "workbook"),
    vans16Passenger: requireNumber(record, "vans16Passenger"),
    vans8Passenger: requireNumber(record, "vans8Passenger"),
    van16RentalUsdPerHour: requireNumber(record, "van16RentalUsdPerHour"),
    van8RentalUsdPerHour: requireNumber(record, "van8RentalUsdPerHour"),
    uberXlContractedUsdPerTrip: requireNumber(record, "uberXlContractedUsdPerTrip"),
    note: requireString(record, "note"),
  };
}

function parseAssistance(input: unknown): AssistanceData {
  const record = asRecord(input, "assistance");
  const source = requireString(record, "source");
  if (source !== "course-workbook") {
    throw new Error("Assistance data must be labeled course-workbook.");
  }
  if (record.inventoryKnown !== true) {
    throw new Error("Assistance inventory must be marked known when course workbook data is loaded.");
  }
  return {
    source: "course-workbook",
    inventoryKnown: true,
    hotels: parseAssistanceHotels(record.hotels),
    groundTransport: parseAssistanceGroundTransport(record.groundTransport),
    reason: requireString(record, "reason"),
  };
}

export const scenario = parseScenario(scenarioJson);
export const diversion = parseDiversion(diversionJson, scenario);
export const assistance = parseAssistance(assistanceJson);
