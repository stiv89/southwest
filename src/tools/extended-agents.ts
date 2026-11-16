import type { ToolContext } from "./errors";

const SOURCE = "Mock extended-agent dataset — classroom simulation";

export function getGroundStaffSchedule(airportCode: string, _ctx: ToolContext) {
  return {
    airport: airportCode,
    roles: ["gate", "ramp", "customer service counter"],
    staffingGapHours: null,
    recommendation:
      "Simulated: hold extra ramp lead and two gate agents past the scheduled ground-stop window.",
    note: "Verified staffing counts are not in the course brief.",
    source: SOURCE,
  };
}

export function getRampCoverage(airportCode: string, _ctx: ToolContext) {
  return {
    airport: airportCode,
    coveragePercent: null,
    contingencyCrewOnCall: 6,
    note: "Coverage percentage is unknown; contingency headcount is a labeled mock.",
    source: SOURCE,
  };
}

export function draftInternalComms(input: {
  flightId: string;
  audience: string;
  situation: string;
}) {
  return {
    channel: "internal",
    audience: input.audience,
    draft: `INTERNAL ONLY — not sent. Flight ${input.flightId}: ${input.situation}. Coordinate with Network Dispatch before any diversion statement.`,
    sent: false,
    source: SOURCE,
  };
}

export function draftVendorNotice(input: { airportCode: string; vendors: string[] }) {
  return {
    channel: "contractors",
    draft: `VENDOR NOTICE — not sent. ${input.airportCode} ground stop may extend vendor services at ${input.vendors.join(", ")}. Confirm contracts manually.`,
    sent: false,
    source: SOURCE,
  };
}

export function draftAirportManagementUpdate(input: { airportCode: string; flightId: string }) {
  return {
    channel: "airport-mgmt",
    draft: `AIRPORT MGMT — not sent. ${input.airportCode} requests coordination on inbound ${input.flightId} during FAA ground stop. No landing commitment from this system.`,
    sent: false,
    source: SOURCE,
  };
}

export function getComplianceChecklist(_ctx: ToolContext) {
  return {
    faaGroundStopAcknowledged: true,
    diversionRequiresHumanApproval: true,
    passengerPiiDisclosureBlocked: true,
    openItems: ["Verify alternate airport capability with dispatch", "Confirm no automated ATC messaging"],
    source: SOURCE,
  };
}

export function getSafetyScore(input: { flightId: string; scenario: string }, _ctx: ToolContext) {
  return {
    flightId: input.flightId,
    scoreLabel: "review-required",
    score: null,
    drivers: [
      "Ground stop removes predictable arrival window",
      "Fuel flexibility is a brief figure, not live telemetry",
      input.scenario,
    ],
    humanAlertRequired: true,
    source: SOURCE,
  };
}

export function getMaintenanceReadiness(aircraftId: string, _ctx: ToolContext) {
  return {
    aircraftId,
    melStatus: "No MEL data in brief",
    canContinueInCurrentConfig: null,
    maintenanceNote:
      "Simulated: aircraft cleared for continued flight pending human dispatch review; tire/brake inspection window unknown.",
    source: SOURCE,
  };
}

export function getEquipmentStressIndicators(aircraftId: string, _ctx: ToolContext) {
  return {
    aircraftId,
    cyclesSinceLastCheck: null,
    brakeWearPercent: null,
    recommendation: "No maintenance release from this screen. Escalate unknown equipment fields.",
    source: SOURCE,
  };
}