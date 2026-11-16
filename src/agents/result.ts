import { unique } from "../lib/unique";
import type {
  AgentId,
  AgentOption,
  AgentResult,
  AgentResultStatus,
  StopReason,
  ToolCallRecord,
} from "../types/contracts";

export function buildAgentResult(input: {
  agent: AgentId;
  scenarioId: string;
  status: AgentResultStatus;
  summary: string;
  knownFacts: string[];
  unknowns: string[];
  options: AgentOption[];
  recommendedNextStep: string;
  toolCalls: ToolCallRecord[];
  stopReason: StopReason;
  iterations: number;
  maxIterations: number;
  subjectId: string;
  situation?: string;
  sources?: string[];
  draftNotification?: string;
  passengerConsequences?: string;
  requiredAssistance?: string;
}): AgentResult {
  return {
    agent: input.agent,
    scenarioId: input.scenarioId,
    status: input.status,
    summary: input.summary,
    knownFacts: unique(input.knownFacts),
    unknowns: unique(input.unknowns),
    options: input.options,
    recommendedNextStep: input.recommendedNextStep,
    requiresHumanApproval: true,
    toolCalls: input.toolCalls,
    stopReason: input.stopReason,
    iterations: input.iterations,
    maxIterations: input.maxIterations,
    subjectId: input.subjectId,
    situation: input.situation ?? "",
    sources: unique(input.sources ?? []),
    draftNotification: input.draftNotification ?? "",
    passengerConsequences: input.passengerConsequences ?? "",
    requiredAssistance: input.requiredAssistance ?? "",
    narrativeSource: "tools",
    narrativeModel: "",
  };
}
