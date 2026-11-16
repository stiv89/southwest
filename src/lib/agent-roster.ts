import type { RunPhase } from "../types/contracts";

export type AgentRosterId =
  | "orchestrator"
  | "customer-service"
  | "route-planning"
  | "scheduling"
  | "communications"
  | "compliance-safety"
  | "maintenance";

export type AgentDemoStatus = "live" | "planned";

export interface AgentRosterEntry {
  id: AgentRosterId;
  order: number;
  name: string;
  tagline: string;
  responsibilities: string[];
  demoStatus: AgentDemoStatus;
  orgLane: string;
}

/** Agent list from the class whiteboard (MVP wires the first three). */
export const AGENT_ROSTER: AgentRosterEntry[] = [
  {
    id: "orchestrator",
    order: 1,
    name: "Orchestrator",
    tagline: "Coordinates agents, merges findings, escalates to humans.",
    responsibilities: [
      "Route disruption to the right agent",
      "Share operational context between agents",
      "Consolidate recommendation for approval",
    ],
    demoStatus: "live",
    orgLane: "Finance · central desk",
  },
  {
    id: "customer-service",
    order: 2,
    name: "Customer Service",
    tagline: "Southwest passengers — vouchers, rebooking, accessibility.",
    responsibilities: [
      "Reschedule travelers and draft updates",
      "Meal vouchers and hotel support",
      "Connection and wheelchair passenger impact",
    ],
    demoStatus: "live",
    orgLane: "COO · passenger care",
  },
  {
    id: "route-planning",
    order: 3,
    name: "Aircraft / route planning",
    tagline: "Includes air crew — diversion options and operational constraints.",
    responsibilities: [
      "Evaluate airborne aircraft against ground stops",
      "Call diversion and airport status tools",
      "Surface unknowns before human approval",
    ],
    demoStatus: "live",
    orgLane: "SW Operations · Network / Dispatch",
  },
  {
    id: "scheduling",
    order: 4,
    name: "Scheduling (non–air crew)",
    tagline: "Ground and airport staff rotations during disruptions.",
    responsibilities: ["Adjust gate and ramp staffing", "Coordinate non-flight personnel"],
    demoStatus: "live",
    orgLane: "SW Operations · Ground ops",
  },
  {
    id: "communications",
    order: 5,
    name: "Communications",
    tagline: "Internal, contractors, and airport management messaging.",
    responsibilities: [
      "Internal airline coordination",
      "Contractors and vendors",
      "Airport management updates",
    ],
    demoStatus: "live",
    orgLane: "Logistics · airport comms",
  },
  {
    id: "compliance-safety",
    order: 6,
    name: "Compliance / Safety",
    tagline: "FAA posture and safety score for proposed actions.",
    responsibilities: ["Legal and regulatory checks", "Flag safety concerns for humans"],
    demoStatus: "live",
    orgLane: "Legal · Safety & Security",
  },
  {
    id: "maintenance",
    order: 7,
    name: "Maintenance",
    tagline: "Equipment limits and fly/no-fly under disruption stress.",
    responsibilities: ["Identify equipment issues", "Qualify which aircraft can still fly"],
    demoStatus: "live",
    orgLane: "EVP · Technical ops",
  },
];

export const ORG_LANES = [
  {
    title: "Customer Service (COO)",
    bullets: [
      "Reschedule travelers",
      "Hotels and meal vouchers",
      "Luggage and complaints",
      "Loyalty and rebooking incentives",
    ],
  },
  {
    title: "SW Operations",
    bullets: [
      "Ground ops",
      "In-flight ops",
      "Technical ops / maintenance",
      "Network ops / dispatch",
    ],
  },
  {
    title: "Finance & orchestration",
    bullets: ["Cost and revenue implications", "Orchestrator consolidates agent outputs"],
  },
  {
    title: "Compliance",
    bullets: ["Legal / FAA posture", "Safety & security alerts to humans"],
  },
] as const;

export function orchestratorPhaseLabel(phase: RunPhase): string {
  switch (phase) {
    case "idle":
      return "Idle — waiting for scenario";
    case "running":
      return "Running agent sequence";
    case "awaiting_decision":
      return "Recommendation ready for human gate";
    case "decided":
      return "Decision recorded";
    case "incomplete":
      return "Run incomplete";
    default:
      return phase;
  }
}

export function liveAgentCount(): string {
  return `${AGENT_ROSTER.length} agents orchestrated in this demo (MCI ground stop)`;
}