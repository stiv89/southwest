import type { DashboardModel } from "../orchestration/dashboard";

export function ScenarioPanel({
  model,
  outageEnabled,
  controlsLocked,
  runDisabled,
  running,
  onSelect,
  onToggleOutage,
  onRun,
}: {
  model: DashboardModel;
  outageEnabled: boolean;
  controlsLocked: boolean;
  runDisabled: boolean;
  running: boolean;
  onSelect: () => void;
  onToggleOutage: (enabled: boolean) => void;
  onRun: () => void;
}) {
  const selected = model.selected;
  return (
    <section className="card" aria-labelledby="scenario-heading">
      <h2 id="scenario-heading">Scenario</h2>
      <p className="lede">Day 2 timeline. One event is ready for the demo.</p>
      <button
        type="button"
        className="timeline-item"
        data-testid="scenario-ground-stop"
        aria-pressed={selected !== null}
        onClick={onSelect}
      >
        <span className="timeline-time">12:20 PM</span>
        <span>
          <strong>Ground Stop — 12:20 PM</strong>
          <span className="timeline-copy">Day 2 — Wednesday · MCI</span>
        </span>
      </button>
      {selected ? (
        <div className="fact-block">
          <p>{selected.event}</p>
          <p className="alert">{selected.constraint}</p>
          <p className="source-line">{selected.sourceLabel}</p>
        </div>
      ) : (
        <p className="empty">Select the 12:20 PM Ground Stop to load the scenario facts.</p>
      )}
      <label className="check">
        <input
          type="checkbox"
          data-testid="outage"
          checked={outageEnabled}
          disabled={controlsLocked}
          onChange={(event) => onToggleOutage(event.target.checked)}
        />
        Simulate tool outage (getDiversionOptions fails)
      </label>
      <button
        type="button"
        className="button primary"
        data-testid="run-agents"
        disabled={runDisabled}
        onClick={onRun}
      >
        {running ? "Running…" : "Run Agents"}
      </button>
    </section>
  );
}
