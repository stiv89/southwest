import { assistance, diversion, scenario } from "./mock-data";
import type { DemoSnapshot } from "../types/contracts";

export const GROUND_STOP_CASE_ID = "a31-ground-stop";

const MISSING = [
  { key: "verifiedHandlingCapacity", label: "Handling capacity" },
  { key: "verifiedRunwaySuitability", label: "Runway suitability" },
  { key: "verifiedFlightTimeMinutes", label: "Diversion flight time" },
  { key: "verifiedFuelRequired", label: "Fuel required" },
  { key: "verifiedGroundHandling", label: "Ground handling" },
] as const;

export interface AlternateRow {
  id: string;
  code: string;
  name: string;
  status: "Not verified";
  missing: string;
  note: string;
  gaps: { label: string; value: "Not verified" }[];
}

export function alternateRows(): AlternateRow[] {
  return diversion.candidates.map((candidate) => ({
    id: candidate.id,
    code: candidate.airport,
    name: candidate.name,
    status: "Not verified",
    missing: MISSING.map((field) => field.label).join(" · "),
    note: candidate.note,
    gaps: MISSING.map((field) => ({
      label: field.label,
      value: "Not verified" as const,
    })),
  }));
}

export function caseSources(): string[] {
  return [scenario.sourceLabel, diversion.disclaimer, assistance.reason];
}

export function groundStopNextStep(snapshot: DemoSnapshot): string {
  if (snapshot.phase === "running") return "Evaluate diversion options";
  if (snapshot.phase === "awaiting_decision") return "Proposal ready — review it on Decision";
  if (snapshot.phase === "decided" && snapshot.outcome) return snapshot.outcome;
  return "Evaluate diversion options";
}

export interface ActivityNote {
  who: string;
  text: string;
}

export function groundStopActivity(snapshot: DemoSnapshot): ActivityNote[] {
  const planning = snapshot.opsResult
    ? snapshot.opsResult.summary
    : snapshot.phase === "running" && snapshot.opsAction
      ? snapshot.opsAction
      : "Reviews the candidates. Every alternate is still Not verified.";
  const service = snapshot.csResult
    ? `${snapshot.csResult.requiredAssistance || snapshot.csResult.summary} Availability unknown.`
    : "Records what is known about passenger support. Availability unknown.";
  return [
    { who: "Aircraft & Route Planning", text: planning },
    { who: "Customer Service", text: service },
  ];
}
