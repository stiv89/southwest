import type { AgentSlot, ExtendedAgentKey } from "../types/contracts";

export const EXTENDED_AGENT_KEYS: ExtendedAgentKey[] = [
  "scheduling",
  "communications",
  "compliance-safety",
  "maintenance",
];

export const EXTENDED_AGENT_LABELS: Record<ExtendedAgentKey, string> = {
  scheduling: "Scheduling (non–air crew)",
  communications: "Communications",
  "compliance-safety": "Compliance / Safety",
  maintenance: "Maintenance",
};

export function createEmptyAgentSlot(): AgentSlot {
  return {
    runState: "Idle",
    action: "Idle",
    toolName: null,
    toolSummary: null,
    history: [],
    result: null,
  };
}

export function createInitialAgentSlots(): Record<ExtendedAgentKey, AgentSlot> {
  return {
    scheduling: createEmptyAgentSlot(),
    communications: createEmptyAgentSlot(),
    "compliance-safety": createEmptyAgentSlot(),
    maintenance: createEmptyAgentSlot(),
  };
}