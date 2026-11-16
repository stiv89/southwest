import type { DemoSnapshot, ToolCallRecord } from "../types/contracts";

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
  return (
    <section className="card" aria-labelledby="agents-heading">
      <h2 id="agents-heading">Agent activity</h2>
      <div className="agent-grid">
        <AgentCard
          title="Flight Operations Agent"
          stateId="ops-status"
          runState={snapshot.opsRunState}
          action={snapshot.opsAction}
          toolName={snapshot.opsToolName}
          toolSummary={snapshot.opsToolSummary}
          history={snapshot.opsHistory}
          historyId="ops-history"
        />
        <AgentCard
          title="Customer Service Agent"
          stateId="cs-status"
          runState={snapshot.csRunState}
          action={snapshot.csAction}
          toolName={snapshot.csToolName}
          toolSummary={snapshot.csToolSummary}
          history={snapshot.csHistory}
          historyId="cs-history"
        />
      </div>
    </section>
  );
}
