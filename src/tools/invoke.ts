import type { ToolCallRecord } from "../types/contracts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function summarizeTool(name: string, value: unknown): string {
  if (!isRecord(value)) return `${name} returned a result.`;
  switch (name) {
    case "getFlightStatus":
      return `${String(value.flightId)} is ${value.airborne === true ? "airborne" : "not confirmed airborne"} from ${String(value.origin)} with ${String(value.passengers)} passengers.`;
    case "getAirportStatus":
      return `${String(value.airport)} status is ${String(value.operationalStatus)}. ${value.event ? String(value.event) : "No verified event."}`;
    case "getCrewConstraints":
      return `Crew duty remaining ${String(value.dutyRemaining)}. ${String(value.note)}`;
    case "getDiversionOptions": {
      const candidates = Array.isArray(value.candidates) ? value.candidates : [];
      const codes = candidates
        .map((candidate) => (isRecord(candidate) ? String(candidate.airport) : ""))
        .filter(Boolean);
      return `Candidates: ${codes.join(", ") || "none"}. Fuel flexibility ${String(value.fuelFlexibilityMinutes)} minutes.`;
    }
    case "evaluateOperationalImpact":
      return `${String(value.optionId)}: feasibility ${value.feasible === null ? "unknown" : String(value.feasible)}. This tool authorized ${value.authorized === true ? "the option" : "nothing"}.`;
    case "getPassengerImpact":
      return `${String(value.passengers)} passengers, including ${String(value.wheelchairPassengers)} who need wheelchair assistance.`;
    case "getConnectionImpact":
      return `${String(value.connectingPassengers)} connecting passengers. ${String(value.note)}`;
    case "getAvailableAssistance":
      return `${String(value.airportCode)} inventoryKnown=${String(value.inventoryKnown)}. ${String(value.reason)}`;
    case "draftCustomerUpdate":
      return value.sent === false
        ? "Draft prepared and not sent."
        : "Draft tool returned an unexpected send flag.";
    default:
      return `${name} returned a result.`;
  }
}

export function runTool<T>(
  name: string,
  input: object,
  fn: () => T,
): { ok: true; value: T; record: ToolCallRecord } | { ok: false; record: ToolCallRecord } {
  try {
    const value = fn();
    return {
      ok: true,
      value,
      record: { name, input, result: value, ok: true, summary: summarizeTool(name, value) },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool failed.";
    return {
      ok: false,
      record: { name, input, result: { error: message }, ok: false, summary: message },
    };
  }
}
