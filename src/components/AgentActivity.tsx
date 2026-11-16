import { EXTENDED_AGENT_KEYS, EXTENDED_AGENT_LABELS } from "../lib/agent-slots";
import { AGENT_ROSTER, liveAgentCount, orchestratorPhaseLabel } from "../lib/agent-roster";
import type { DemoSnapshot, ToolCallRecord } from "../types/contracts";
import { AgentRoster } from "./AgentRoster";

function History({ records }: { records: ToolCallRecord[] }) {
  if (records.length === 0) return <p className="empty">No tool calls yet.</p>;
  return (
    <ol className="history">
      {records.map((record, index) => (
        <li key={`${record.name}-${index}`} className={record.ok ? "history-ok" : "history-bad"}>
          <div className="history-title">
            <strong>{record.name}</strong>
            <span>{record.ok ? "Result" : "Failed"}</span>
          </div>
          <p>{record.summary}</p>
          <p className="history-input">
            {Object.entries(record.input as Record<string, unknown>).map(([key, value]) => (
              <span key={key}>
                {key}={typeof value === "string" ? value : JSON.stringify(value)}
              </span>
            ))}
          </p>
        </li>
      ))}
    </ol>
  );
}

function AgentCard({
  title,
  stateId,
  runState,
  action,
  toolName,
  toolSummary,
  history,
  historyId,
}: {
  title: string;
  stateId: string;
  runState: string;
  action: string;
  toolName: string | null;
  toolSummary: string | null;
  history: ToolCallRecord[];
  historyId: string;
}) {
  return (
    <article className={`agent-card state-${runState.toLowerCase()}`}>
      <header>
        <h3>{title}</h3>
        <strong data-testid={stateId}>{runState}</strong>
      </header>
      <p className="agent-action" aria-live="polite">
        {action}
      </p>
      <p className="tool-line">
        <span>Tool</span>
        {toolName ?? "—"}
      </p>
      <p className="tool-summary">{toolSummary ?? "No tool result yet."}</p>
      <details data-testid={historyId}>
        <summary>Execution history</summary>
        <History records={history} />
      </details>
    </article>
  );
}

export function AgentActivity({ snapshot }: { snapshot: DemoSnapshot }) {
  const orchestratorEntry = AGENT_ROSTER.find((entry) => entry.id === "orchestrator");

  return (
    <section id="agents" className="card card--panel" aria-labelledby="agents-heading">
      <h2 id="agents-heading">Agentic workforce</h2>
      <p className="lede">{liveAgentCount()}</p>

      <article className="orchestrator-banner" aria-label="Orchestrator status">
        <div>
          <h3>{orchestratorEntry?.name ?? "Orchestrator"}</h3>
          <p className="orchestrator-phase" data-testid="orchestrator-phase">
            {orchestratorPhaseLabel(snapshot.phase)}
          </p>
        </div>
        <p className="orchestrator-copy">
          {orchestratorEntry?.tagline ?? "Coordinates agents and escalates to the human gate."}
        </p>
      </article>

      <h3>Live execution</h3>
      <div className="agent-grid agent-grid--wide">
        <AgentCard
          title="Aircraft / route planning"
          stateId="ops-status"
          runState={snapshot.opsRunState}
          action={snapshot.opsAction}
          toolName={snapshot.opsToolName}
          toolSummary={snapshot.opsToolSummary}
          history={snapshot.opsHistory}
          historyId="ops-history"
        />
        <AgentCard
          title="Customer Service (Southwest passengers)"
          stateId="cs-status"
          runState={snapshot.csRunState}
          action={snapshot.csAction}
          toolName={snapshot.csToolName}
          toolSummary={snapshot.csToolSummary}
          history={snapshot.csHistory}
          historyId="cs-history"
        />
        {EXTENDED_AGENT_KEYS.map((key) => {
          const slot = snapshot.agentSlots[key];
          const testId = key === "compliance-safety" ? "compliance-status" : `${key}-status`;
          return (
            <AgentCard
              key={key}
              title={EXTENDED_AGENT_LABELS[key]}
              stateId={testId}
              runState={slot.runState}
              action={slot.action}
              toolName={slot.toolName}
              toolSummary={slot.toolSummary}
              history={slot.history}
              historyId={`${key}-history`}
            />
          );
        })}
      </div>

      <AgentRoster />
    </section>
  );
}