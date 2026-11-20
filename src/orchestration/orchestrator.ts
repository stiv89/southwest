import { runCustomerService } from "../agents/customer-service/run";
import {
  runCommunications,
  runComplianceSafety,
  runMaintenance,
  runScheduling,
  type ExtendedAgentRequest,
} from "../agents/extended/run";
import { runFlightOperations } from "../agents/flight-operations/run";
import { appendAudit } from "../lib/audit";
import {
  createInitialAgentSlots,
  EXTENDED_AGENT_KEYS,
  EXTENDED_AGENT_LABELS,
} from "../lib/agent-slots";
import { OUTAGE_TOOL_NAME } from "../lib/constants";
import { scenario } from "../scenarios/mci-ground-stop";
import { unique } from "../lib/unique";
import { wait } from "../lib/wait";
import type { AgentNarrative } from "../lib/puter";
import type {
  AgentEvent,
  AgentResult,
  AgentRunState,
  ConsolidatedRecommendation,
  DemoSnapshot,
  ExtendedAgentKey,
} from "../types/contracts";
import type { ToolContext } from "../tools/errors";

export type NarrateAgent = (result: AgentResult) => Promise<AgentNarrative | null>;

export interface RunOptions {
  stepDelayMs?: number;
  now?: () => string;
  onUpdate?: (snapshot: DemoSnapshot) => void;
  outageTool?: string | null;
  narrate?: NarrateAgent;
  enabledExtendedAgents?: ExtendedAgentKey[];
}

export function createInitialSnapshot(): DemoSnapshot {
  return {
    scenarioId: null,
    outageEnabled: false,
    phase: "idle",
    opsRunState: "Idle",
    csRunState: "Idle",
    opsAction: "Idle",
    csAction: "Idle",
    opsToolName: null,
    csToolName: null,
    opsToolSummary: null,
    csToolSummary: null,
    opsHistory: [],
    csHistory: [],
    opsResult: null,
    csResult: null,
    agentSlots: createInitialAgentSlots(),
    recommendation: null,
    decision: "none",
    outcome: null,
    audit: [],
    nextId: 1,
  };
}

export function resetDemo(): DemoSnapshot {
  return createInitialSnapshot();
}

export function canRun(snapshot: DemoSnapshot): boolean {
  return snapshot.scenarioId === scenario.id && (snapshot.phase === "idle" || snapshot.phase === "incomplete");
}

export function selectScenario(
  snapshot: DemoSnapshot,
  scenarioId: string,
  now: () => string = () => new Date().toISOString(),
): DemoSnapshot {
  if (snapshot.phase === "running") return snapshot;
  if (scenarioId !== scenario.id) return snapshot;
  if (snapshot.scenarioId !== null) return snapshot;
  return appendAudit(
    { ...snapshot, scenarioId: scenario.id },
    now(),
    {
      kind: "scenario",
      simulated: false,
      message: `Selected course scenario ${scenario.label} at ${scenario.airport}.`,
      detail: scenario.sourceLabel,
    },
  );
}

export function recordIntakeMessage(
  snapshot: DemoSnapshot,
  userText: string,
  assistantReply: string,
  now: () => string = () => new Date().toISOString(),
): DemoSnapshot {
  return appendAudit(snapshot, now(), {
    kind: "agent",
    simulated: true,
    message: `Operations intake: ${userText.trim().slice(0, 140)}`,
    detail: assistantReply,
  });
}

export function setOutageEnabled(snapshot: DemoSnapshot, enabled: boolean): DemoSnapshot {
  if (snapshot.phase === "running" || snapshot.phase === "decided" || snapshot.phase === "awaiting_decision") {
    return snapshot;
  }
  return { ...snapshot, outageEnabled: enabled };
}

function stopAction(result: AgentResult): string {
  if (result.stopReason === "tool_failure") {
    return `Stopped: tool failure. ${result.iterations} of ${result.maxIterations} iterations used.`;
  }
  if (result.stopReason === "iteration_limit") {
    return `Stopped: iteration limit ${result.maxIterations} reached.`;
  }
  return `Stopped: human review required. ${result.iterations} tool calls (limit ${result.maxIterations}).`;
}

function applyEvent(
  snapshot: DemoSnapshot,
  agent: "ops" | "cs",
  event: AgentEvent,
  now: string,
): DemoSnapshot {
  const label = agent === "ops" ? "Flight Operations Agent" : "Customer Service Agent";
  if (event.type === "status") {
    if (agent === "ops") {
      return {
        ...snapshot,
        opsRunState: "Running",
        opsAction: event.action,
        opsToolName: event.toolName,
        opsToolSummary: event.toolName ? "Waiting for the tool result." : snapshot.opsToolSummary,
      };
    }
    return {
      ...snapshot,
      csRunState: "Running",
      csAction: event.action,
      csToolName: event.toolName,
      csToolSummary: event.toolName ? "Waiting for the tool result." : snapshot.csToolSummary,
    };
  }

  const failed = !event.record.ok;
  if (agent === "ops") {
    const next: DemoSnapshot = {
      ...snapshot,
      opsRunState: failed ? "Error" : "Running",
      opsAction: failed ? `Tool failed: ${event.record.name}` : `Observed ${event.record.name}`,
      opsToolName: event.record.name,
      opsToolSummary: event.record.summary,
      opsHistory: [...snapshot.opsHistory, event.record],
    };
    return appendAudit(next, now, {
      kind: failed ? "error" : "tool",
      simulated: true,
      message: failed
        ? `${label} failed ${event.record.name}.`
        : `${label} called ${event.record.name}.`,
      detail: event.record.summary,
    });
  }

  const next: DemoSnapshot = {
    ...snapshot,
    csRunState: failed ? "Error" : "Running",
    csAction: failed ? `Tool failed: ${event.record.name}` : `Observed ${event.record.name}`,
    csToolName: event.record.name,
    csToolSummary: event.record.summary,
    csHistory: [...snapshot.csHistory, event.record],
  };
  return appendAudit(next, now, {
    kind: failed ? "error" : "tool",
    simulated: true,
    message: failed
      ? `${label} failed ${event.record.name}.`
      : `${label} called ${event.record.name}.`,
    detail: event.record.summary,
  });
}

function buildRecommendation(
  ops: AgentResult,
  cs: AgentResult,
  extended: AgentResult[],
): ConsolidatedRecommendation {
  const usedPuter = ops.narrativeSource === "puter" || cs.narrativeSource === "puter";
  const agentSupport = extended.map((result) => ({
    agent: result.agent,
    summary: result.summary,
    recommendedNextStep: result.recommendedNextStep,
  }));
  const supportBlock = extended.map((result) => result.summary).join("\n\n");
  const summaryParts = [ops.summary, cs.summary];
  if (supportBlock) summaryParts.push(supportBlock);
  return {
    lead: `Review ${ops.subjectId} under the MCI Ground Stop. Human approval is required before any simulated action.`,
    summary: usedPuter ? `${ops.summary}\n\n${cs.summary}${supportBlock ? `\n\n${supportBlock}` : ""}` : summaryParts.join("\n\n"),
    operationalOptions: ops.options,
    customerOptions: cs.options,
    knownFacts: unique([...ops.knownFacts, ...cs.knownFacts, ...extended.flatMap((r) => r.knownFacts)]),
    unknowns: unique([...ops.unknowns, ...cs.unknowns, ...extended.flatMap((r) => r.unknowns)]),
    passengerConsequences: cs.passengerConsequences,
    requiredAssistance: cs.requiredAssistance,
    draftNotification: cs.draftNotification,
    agentSupport,
    requiresHumanApproval: true,
    sources: unique([
      ...ops.sources,
      ...cs.sources,
      ...extended.flatMap((r) => r.sources),
      "Educational simulation — no live feed",
    ]),
    narrativeSource: usedPuter ? "puter" : "tools",
    narrativeModel: ops.narrativeModel || cs.narrativeModel,
  };
}

async function withNarrative(
  snapshot: DemoSnapshot,
  result: AgentResult,
  narrate: NarrateAgent | undefined,
  now: () => string,
  onUpdate: (snapshot: DemoSnapshot) => void,
): Promise<{ snapshot: DemoSnapshot; result: AgentResult }> {
  if (!narrate || result.status !== "needs_human_review") return { snapshot, result };
  const label = result.agent === "flight-operations" ? "Flight Operations Agent" : "Customer Service Agent";
  const asking = "Asking Puter.js to write from the tool results";
  snapshot =
    result.agent === "flight-operations"
      ? { ...snapshot, opsAction: asking }
      : { ...snapshot, csAction: asking };
  onUpdate(snapshot);
  try {
    const narrative = await narrate(result);
    if (!narrative?.summary.trim() || !narrative.recommendedNextStep.trim()) {
      snapshot = appendAudit(snapshot, now(), {
        kind: "agent",
        simulated: true,
        message: `${label} kept the tool-based summary. Puter.js returned no usable narrative.`,
        detail: "Facts, options, and unknowns still come from the tools.",
      });
      onUpdate(snapshot);
      return { snapshot, result };
    }
    const nextResult: AgentResult = {
      ...result,
      summary: narrative.summary.trim(),
      recommendedNextStep: narrative.recommendedNextStep.trim(),
      narrativeSource: "puter",
      narrativeModel: narrative.model,
      sources: unique([...result.sources, `Puter.js (${narrative.model})`]),
    };
    snapshot = appendAudit(snapshot, now(), {
      kind: "agent",
      simulated: true,
      message: `${label} used Puter.js (${narrative.model}) to write the narrative.`,
      detail: nextResult.summary,
    });
    onUpdate(snapshot);
    return { snapshot, result: nextResult };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Puter.js request failed.";
    snapshot = appendAudit(snapshot, now(), {
      kind: "error",
      simulated: true,
      message: `${label} kept the tool-based summary because Puter.js was unavailable.`,
      detail: message,
    });
    onUpdate(snapshot);
    return { snapshot, result };
  }
}

function canDecide(snapshot: DemoSnapshot): boolean {
  return (
    snapshot.phase === "awaiting_decision" &&
    snapshot.decision === "none" &&
    snapshot.recommendation?.requiresHumanApproval === true
  );
}

export function approvePlan(
  snapshot: DemoSnapshot,
  approver: string,
  now: () => string = () => new Date().toISOString(),
): DemoSnapshot {
  const name = approver.trim();
  if (!canDecide(snapshot) || name.length === 0) return snapshot;
  const stamped = now();
  let next = appendAudit(snapshot, stamped, {
    kind: "approval",
    simulated: true,
    message: `${name} approved the simulated plan.`,
    detail: "Human approval recorded. This is not aircraft dispatch.",
  });
  const outcome = `${name} approved the simulated plan. Simulated plan recorded. No aircraft, ATC, or passenger message was executed.`;
  next = { ...next, phase: "decided", decision: "approved", outcome };
  return appendAudit(next, stamped, {
    kind: "outcome",
    simulated: true,
    message: "Simulated plan recorded. No aircraft, ATC, or passenger message was executed.",
    detail: "Operational status remains Grounded. No diversion was commanded.",
  });
}

export function rejectPlan(
  snapshot: DemoSnapshot,
  approver: string,
  now: () => string = () => new Date().toISOString(),
): DemoSnapshot {
  const name = approver.trim();
  if (!canDecide(snapshot) || name.length === 0) return snapshot;
  const stamped = now();
  let next = appendAudit(snapshot, stamped, {
    kind: "approval",
    simulated: true,
    message: `${name} rejected the recommendation.`,
    detail: "The human reviewer declined the simulated plan.",
  });
  const outcome = `${name} rejected the recommendation. Recommendation rejected. Scenario remains Ground Stop. No action taken.`;
  next = { ...next, phase: "decided", decision: "rejected", outcome };
  return appendAudit(next, stamped, {
    kind: "outcome",
    simulated: true,
    message: "Recommendation rejected. Scenario remains Ground Stop. No action taken.",
    detail: "Operational status remains Grounded. No diversion was commanded.",
  });
}

function applySlotEvent(
  snapshot: DemoSnapshot,
  key: ExtendedAgentKey,
  event: AgentEvent,
  now: string,
): DemoSnapshot {
  const label = EXTENDED_AGENT_LABELS[key];
  const slot = snapshot.agentSlots[key];
  if (event.type === "status") {
    return {
      ...snapshot,
      agentSlots: {
        ...snapshot.agentSlots,
        [key]: {
          ...slot,
          runState: "Running",
          action: event.action,
          toolName: event.toolName,
          toolSummary: event.toolName ? "Waiting for the tool result." : slot.toolSummary,
        },
      },
    };
  }

  const failed = !event.record.ok;
  const runState: AgentRunState = failed ? "Error" : "Running";
  const nextSlot = {
    ...slot,
    runState,
    action: failed ? `Tool failed: ${event.record.name}` : `Observed ${event.record.name}`,
    toolName: event.record.name,
    toolSummary: event.record.summary,
    history: [...slot.history, event.record],
  };
  const next = {
    ...snapshot,
    agentSlots: { ...snapshot.agentSlots, [key]: nextSlot },
  };
  return appendAudit(next, now, {
    kind: failed ? "error" : "tool",
    simulated: true,
    message: failed ? `${label} failed ${event.record.name}.` : `${label} called ${event.record.name}.`,
    detail: event.record.summary,
  });
}

async function playSlot(
  snapshot: DemoSnapshot,
  key: ExtendedAgentKey,
  generator: Generator<AgentEvent, AgentResult>,
  delayMs: number,
  now: () => string,
  onUpdate: (snapshot: DemoSnapshot) => void,
): Promise<{ snapshot: DemoSnapshot; result: AgentResult }> {
  let current = snapshot;
  let step = generator.next();
  while (!step.done) {
    current = applySlotEvent(current, key, step.value, now());
    onUpdate(current);
    await wait(delayMs);
    step = generator.next();
  }
  return { snapshot: current, result: step.value };
}

async function play(
  snapshot: DemoSnapshot,
  agent: "ops" | "cs",
  generator: Generator<AgentEvent, AgentResult>,
  delayMs: number,
  now: () => string,
  onUpdate: (snapshot: DemoSnapshot) => void,
): Promise<{ snapshot: DemoSnapshot; result: AgentResult }> {
  let current = snapshot;
  let step = generator.next();
  while (!step.done) {
    current = applyEvent(current, agent, step.value, now());
    onUpdate(current);
    await wait(delayMs);
    step = generator.next();
  }
  return { snapshot: current, result: step.value };
}

export async function runAgents(start: DemoSnapshot, options: RunOptions = {}): Promise<DemoSnapshot> {
  const now = options.now ?? (() => new Date().toISOString());
  const delayMs = options.stepDelayMs ?? 0;
  const onUpdate = options.onUpdate ?? (() => undefined);
  const narrate = options.narrate;
  if (!canRun(start)) return start;

  const outageTool =
    options.outageTool !== undefined
      ? options.outageTool
      : start.outageEnabled
        ? OUTAGE_TOOL_NAME
        : null;
  const ctx: ToolContext = { outageTool };

  let snapshot: DemoSnapshot = {
    ...start,
    phase: "running",
    decision: "none",
    outcome: null,
    recommendation: null,
    opsResult: null,
    csResult: null,
    opsHistory: [],
    csHistory: [],
    opsRunState: "Running",
    csRunState: "Waiting",
    opsAction: "Receiving the Ground Stop scenario",
    csAction: "Waiting for flight operations options",
    opsToolName: null,
    csToolName: null,
    opsToolSummary: null,
    csToolSummary: null,
    agentSlots: (() => {
      const slots = createInitialAgentSlots();
      for (const key of EXTENDED_AGENT_KEYS) {
        slots[key] = {
          ...slots[key],
          runState: "Waiting",
          action: "Queued after customer service",
        };
      }
      return slots;
    })(),
  };
  snapshot = appendAudit(snapshot, now(), {
    kind: "agent",
    simulated: true,
    message:
      "Orchestrator started the agent sequence: route planning, customer service, then extended support agents.",
    detail: outageTool
      ? `Simulated outage armed for ${outageTool}.`
      : "No tool outage is armed.",
  });
  onUpdate(snapshot);

  const opsPlay = await play(
    snapshot,
    "ops",
    runFlightOperations({ ctx, flightId: scenario.aircraftId, airport: scenario.airport }),
    delayMs,
    now,
    onUpdate,
  );
  const opsNarrated = await withNarrative(opsPlay.snapshot, opsPlay.result, narrate, now, onUpdate);
  snapshot = {
    ...opsNarrated.snapshot,
    opsResult: opsNarrated.result,
    opsRunState: opsNarrated.result.status === "error" ? "Error" : "Complete",
    opsAction: stopAction(opsNarrated.result),
  };
  snapshot = appendAudit(snapshot, now(), {
    kind: opsPlay.result.status === "error" ? "error" : "agent",
    simulated: true,
    message: `Flight Operations Agent ${stopAction(opsPlay.result)}`,
    detail: opsNarrated.result.summary,
  });
  onUpdate(snapshot);

  if (opsNarrated.result.status === "error") {
    snapshot = {
      ...snapshot,
      phase: "incomplete",
      csRunState: "Idle",
      csAction: "Not started. Flight operations stopped after a tool failure, so no options were passed on.",
    };
    snapshot = appendAudit(snapshot, now(), {
      kind: "error",
      simulated: true,
      message: "Orchestrator did not start Customer Service. There is no plan to approve.",
      detail: "A failed tool is not treated as a successful diversion or passenger plan.",
    });
    onUpdate(snapshot);
    return snapshot;
  }

  snapshot = {
    ...snapshot,
    csRunState: "Running",
    csAction: "Receiving operational options from the orchestrator",
  };
  snapshot = appendAudit(snapshot, now(), {
    kind: "agent",
    simulated: true,
    message: `Orchestrator passed ${opsNarrated.result.options.length} operational options to Customer Service.`,
    detail: opsNarrated.result.options.map((option) => option.label).join("; "),
  });
  onUpdate(snapshot);
  await wait(delayMs);

  const csPlay = await play(
    snapshot,
    "cs",
    runCustomerService({
      ctx,
      scenarioId: opsNarrated.result.scenarioId,
      flightId: opsNarrated.result.subjectId,
      situation: opsNarrated.result.situation,
      options: opsNarrated.result.options,
    }),
    delayMs,
    now,
    onUpdate,
  );
  const csNarrated = await withNarrative(csPlay.snapshot, csPlay.result, narrate, now, onUpdate);
  snapshot = {
    ...csNarrated.snapshot,
    csResult: csNarrated.result,
    csRunState: csNarrated.result.status === "error" ? "Error" : "Complete",
    csAction: stopAction(csNarrated.result),
  };
  snapshot = appendAudit(snapshot, now(), {
    kind: csNarrated.result.status === "error" ? "error" : "agent",
    simulated: true,
    message: `Customer Service Agent ${stopAction(csNarrated.result)}`,
    detail: csNarrated.result.summary,
  });

  if (csNarrated.result.status === "error") {
    snapshot = { ...snapshot, phase: "incomplete", recommendation: null };
    snapshot = appendAudit(snapshot, now(), {
      kind: "error",
      simulated: true,
      message: "Orchestrator withheld the recommendation because customer service did not finish.",
      detail: "Approve and Reject stay unavailable.",
    });
    onUpdate(snapshot);
    return snapshot;
  }

  const extendedRequest: ExtendedAgentRequest = {
    ctx,
    scenarioId: opsNarrated.result.scenarioId,
    flightId: opsNarrated.result.subjectId,
    airport: scenario.airport,
    situation: opsNarrated.result.situation,
    optionLabels: opsNarrated.result.options.map((option) => option.label),
  };

  const extendedResults: AgentResult[] = [];
  const enabledExtended = new Set(options.enabledExtendedAgents ?? EXTENDED_AGENT_KEYS);
  const extendedRuns: {
    key: ExtendedAgentKey;
    run: () => Generator<AgentEvent, AgentResult>;
  }[] = [
    { key: "maintenance", run: () => runMaintenance(extendedRequest) },
    { key: "scheduling", run: () => runScheduling(extendedRequest) },
    { key: "communications", run: () => runCommunications(extendedRequest) },
    { key: "compliance-safety", run: () => runComplianceSafety(extendedRequest) },
  ];

  for (const item of extendedRuns) {
    const label = EXTENDED_AGENT_LABELS[item.key];
    if (!enabledExtended.has(item.key)) {
      snapshot = {
        ...snapshot,
        agentSlots: {
          ...snapshot.agentSlots,
          [item.key]: {
            ...snapshot.agentSlots[item.key],
            runState: "Idle",
            action: "Skipped in desk settings",
            toolName: null,
            toolSummary: null,
          },
        },
      };
      onUpdate(snapshot);
      continue;
    }
    snapshot = {
      ...snapshot,
      agentSlots: {
        ...snapshot.agentSlots,
        [item.key]: {
          ...snapshot.agentSlots[item.key],
          runState: "Running",
          action: "Receiving consolidated context from orchestrator",
        },
      },
    };
    snapshot = appendAudit(snapshot, now(), {
      kind: "agent",
      simulated: true,
      message: `Orchestrator started ${label}.`,
      detail: `Flight ${extendedRequest.flightId} at ${extendedRequest.airport}.`,
    });
    onUpdate(snapshot);
    await wait(delayMs);

    const played = await playSlot(snapshot, item.key, item.run(), delayMs, now, onUpdate);
    const result = played.result;
    extendedResults.push(result);
    snapshot = {
      ...played.snapshot,
      agentSlots: {
        ...played.snapshot.agentSlots,
        [item.key]: {
          ...played.snapshot.agentSlots[item.key],
          result,
          runState: result.status === "error" ? "Error" : "Complete",
          action: stopAction(result),
        },
      },
    };
    snapshot = appendAudit(snapshot, now(), {
      kind: result.status === "error" ? "error" : "agent",
      simulated: true,
      message: `${label} ${stopAction(result)}`,
      detail: result.summary,
    });
    onUpdate(snapshot);
  }

  const recommendation = buildRecommendation(opsNarrated.result, csNarrated.result, extendedResults);
  snapshot = { ...snapshot, recommendation, phase: "awaiting_decision" };
  snapshot = appendAudit(snapshot, now(), {
    kind: "recommendation",
    simulated: true,
    message: "Orchestrator consolidated a recommendation that requires human approval.",
    detail: `${recommendation.lead} Unknowns recorded: ${recommendation.unknowns.length}. Support agents: ${extendedResults.length}.`,
  });
  onUpdate(snapshot);
  return snapshot;
}
