import type { AgentOption, DemoSnapshot } from "../types/contracts";

function OptionList({ options }: { options: AgentOption[] }) {
  return (
    <ol className="options">
      {options.map((option) => (
        <li key={option.id}>
          <h4>{option.label}</h4>
          <p className="source-line">Source: {option.source}</p>
          {option.risks.length > 0 && (
            <ul>
              {option.risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          )}
          {option.tradeoffs.length > 0 && (
            <ul className="tradeoffs">
              {option.tradeoffs.map((item, index) => (
                <li key={`${option.id}-trade-${index}`}>{item}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

export function DecisionPanel({
  snapshot,
  approver,
  onApprover,
  onApprove,
  onReject,
}: {
  snapshot: DemoSnapshot;
  approver: string;
  onApprover: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const recommendation = snapshot.recommendation;
  const canDecide = snapshot.phase === "awaiting_decision" && approver.trim().length > 0;
  const failureSummary =
    snapshot.csResult?.status === "error"
      ? snapshot.csResult.summary
      : snapshot.opsResult?.status === "error"
        ? snapshot.opsResult.summary
        : "";

  return (
    <section id="decision" className="card card--panel" aria-labelledby="decision-heading">
      <h2 id="decision-heading">Decision</h2>
      <p className="lede">AI recommendation, then a human decision, then a simulated record only.</p>
      {snapshot.outcome && (
        <p className={`outcome outcome-${snapshot.decision}`} data-testid="outcome">
          {snapshot.outcome}
        </p>
      )}
      {snapshot.phase === "incomplete" && (
        <div className="fallback" data-testid="fallback">
          <h3>No recommendation</h3>
          <p>{failureSummary}</p>
          <p>Approve and Reject stay off. A failed tool is not a clearance.</p>
        </div>
      )}
      {recommendation ? (
        <div data-testid="recommendation">
          <p className="lead">{recommendation.lead}</p>
          <p className="summary-copy">{recommendation.summary}</p>
          <p className="source-line" data-testid="narrative-source">
            {recommendation.narrativeSource === "puter"
              ? `Narrative written by Puter.js (${recommendation.narrativeModel}). Counts, options, and unknowns still come from the tools.`
              : "Narrative built from the tool results. Puter.js did not write this run."}
          </p>
          <h3>Qualified candidates, not ranked</h3>
          <OptionList options={recommendation.operationalOptions} />
          <div className="split">
            <div>
              <h3>Known</h3>
              <ul>
                {recommendation.knownFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Unknown</h3>
              <ul>
                {recommendation.unknowns.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <h3>Passenger consequences</h3>
          <p data-testid="passenger-impact">{recommendation.passengerConsequences}</p>
          <h3>Required assistance</h3>
          <p>{recommendation.requiredAssistance}</p>
          <h3>Customer options</h3>
          <OptionList options={recommendation.customerOptions} />
          <h3>Draft notification</h3>
          <pre className="draft">{recommendation.draftNotification}</pre>
          <p className="source-line">Draft only. Approval does not send it.</p>
          {recommendation.agentSupport.length > 0 && (
            <>
              <h3>Support agent findings</h3>
              <ul className="agent-support-list">
                {recommendation.agentSupport.map((entry) => (
                  <li key={entry.agent}>
                    <strong>{entry.agent.replace(/-/g, " ")}</strong>
                    <p>{entry.summary}</p>
                    <p className="source-line">{entry.recommendedNextStep}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="source-line">Sources: {recommendation.sources.join(" · ")}</p>
        </div>
      ) : (
        snapshot.phase !== "incomplete" && (
          <p className="empty">
            Run the agents to build a recommendation. Nothing is sent or dispatched from this screen.
          </p>
        )
      )}
      <label className="approver">
        Approver
        <input
          data-testid="approver"
          value={approver}
          spellCheck={false}
          onChange={(event) => onApprover(event.target.value)}
        />
      </label>
      {snapshot.phase === "awaiting_decision" && approver.trim().length === 0 && (
        <p className="empty">Enter a name to record the decision.</p>
      )}
      <div className="decision-actions">
        <button type="button" className="button primary" data-testid="approve" disabled={!canDecide} onClick={onApprove}>
          Approve simulated plan
        </button>
        <button type="button" className="button danger" data-testid="reject" disabled={!canDecide} onClick={onReject}>
          Reject
        </button>
      </div>
      <p className="source-line">
        Approving records a simulated decision only. It does not divert an aircraft, contact ATC,
        assign crew, or send passenger messages.
      </p>
    </section>
  );
}
