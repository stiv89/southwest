export type AgentId =
  | "flight-operations"
  | "customer-service"
  | "scheduling"
  | "communications"
  | "compliance-safety"
  | "maintenance";

export type ExtendedAgentKey = "scheduling" | "communications" | "compliance-safety" | "maintenance";

export interface AgentSlot {
  runState: AgentRunState;
  action: string;
  toolName: string | null;
  toolSummary: string | null;
  history: ToolCallRecord[];
  result: AgentResult | null;
}

export type AgentResultStatus = "needs_human_review" | "error";

export type AgentRunState = "Idle" | "Running" | "Waiting" | "Complete" | "Error";

export type StopReason = "objective_met" | "tool_failure" | "iteration_limit";

export type RunPhase = "idle" | "running" | "awaiting_decision" | "decided" | "incomplete";

export type DecisionState = "none" | "approved" | "rejected";

export type AuditKind =
  | "scenario"
  | "tool"
  | "recommendation"
  | "approval"
  | "outcome"
  | "agent"
  | "error";

export interface ToolCallRecord {
  name: string;
  input: object;
  result: unknown;
  ok: boolean;
  summary: string;
}

export interface AgentOption {
  id: string;
  label: string;
  risks: string[];
  tradeoffs: string[];
  source: string;
  airport: string | null;
}

export interface AgentResult {
  agent: AgentId;
  scenarioId: string;
  status: AgentResultStatus;
  summary: string;
  knownFacts: string[];
  unknowns: string[];
  options: AgentOption[];
  recommendedNextStep: string;
  requiresHumanApproval: boolean;
  toolCalls: ToolCallRecord[];
  stopReason: StopReason;
  iterations: number;
  maxIterations: number;
  subjectId: string;
  situation: string;
  sources: string[];
  draftNotification: string;
  passengerConsequences: string;
  requiredAssistance: string;
  narrativeSource: "puter" | "tools";
  narrativeModel: string;
}

export interface ConsolidatedRecommendation {
  lead: string;
  summary: string;
  operationalOptions: AgentOption[];
  customerOptions: AgentOption[];
  knownFacts: string[];
  unknowns: string[];
  passengerConsequences: string;
  requiredAssistance: string;
  draftNotification: string;
  agentSupport: { agent: AgentId; summary: string; recommendedNextStep: string }[];
  requiresHumanApproval: true;
  sources: string[];
  narrativeSource: "puter" | "tools";
  narrativeModel: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  kind: AuditKind;
  simulated: boolean;
  message: string;
  detail: string;
}

export interface DemoSnapshot {
  scenarioId: string | null;
  outageEnabled: boolean;
  phase: RunPhase;
  opsRunState: AgentRunState;
  csRunState: AgentRunState;
  opsAction: string;
  csAction: string;
  opsToolName: string | null;
  csToolName: string | null;
  opsToolSummary: string | null;
  csToolSummary: string | null;
  opsHistory: ToolCallRecord[];
  csHistory: ToolCallRecord[];
  opsResult: AgentResult | null;
  csResult: AgentResult | null;
  agentSlots: Record<ExtendedAgentKey, AgentSlot>;
  recommendation: ConsolidatedRecommendation | null;
  decision: DecisionState;
  outcome: string | null;
  audit: AuditEvent[];
  nextId: number;
}

export type AgentEvent =
  | {
      type: "status";
      runState: AgentRunState;
      action: string;
      toolName: string | null;
    }
  | {
      type: "tool";
      record: ToolCallRecord;
    };
