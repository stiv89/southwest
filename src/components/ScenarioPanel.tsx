import type { DeskMode } from "../lib/flight-board";
import type { DashboardModel } from "../orchestration/dashboard";

export function ScenarioPanel({
  variant = "page",
  model,
  outageEnabled,
  controlsLocked,
  runDisabled,
  running,
  onSelect,
  deskMode,
  onDeskMode,
  onToggleOutage,
  onRun,
}: {
  variant?: "page" | "dock";
  model: DashboardModel;
  outageEnabled: boolean;
  controlsLocked: boolean;
  runDisabled: boolean;
  running: boolean;
  onSelect: () => void;
  deskMode: DeskMode;
  onDeskMode: (mode: DeskMode) => void;
  onToggleOutage: (enabled: boolean) => void;
  onRun: () => void;
}) {
  const selected = model.selected;
  const inner = (
    <>
      {variant === "page" ? <p className="lede">Same simulated bank. Pick the beat you want to show.</p> : null}
      <button
        type="button"
        className={deskMode === "normal" ? "timeline-item flight-card flight-card--active" : "timeline-item flight-card"}
        aria-pressed={deskMode === "normal"}
        onClick={() => onDeskMode("normal")}
      >
        <span className="timeline-time">12:20</span>
        <span className="flight-card-body">
          <strong>Normal turn</strong>
          <span className="timeline-copy">Next two hours at MCI. Nothing needs attention.</span>
        </span>
        <span className="flight-card-badge">{deskMode === "normal" ? "Active" : "Select"}</span>
      </button>
      <button
        type="button"
        className={deskMode === "late" ? "timeline-item flight-card flight-card--active" : "timeline-item flight-card"}
        aria-pressed={deskMode === "late"}
        onClick={() => onDeskMode("late")}
      >
        <span className="timeline-time">+10m</span>
        <span className="flight-card-body">
          <strong>A31 ten minutes late</strong>
          <span className="timeline-copy">Arrival estimate overlaps gate B12. Station Ops can confirm a change.</span>
        </span>
        <span className="flight-card-badge">{deskMode === "late" ? "Active" : "Select"}</span>
      </button>
      <button
        type="button"
        className={deskMode === "ground-stop" ? "timeline-item flight-card flight-card--active" : "timeline-item flight-card"}
        data-testid="scenario-ground-stop"
        aria-pressed={deskMode === "ground-stop"}
        onClick={() => {
          onDeskMode("ground-stop");
          onSelect();
        }}
      >
        <span className="timeline-time">12:20 PM</span>
        <span className="flight-card-body">
          <strong>Flight A31 · DEN → MCI</strong>
          <span className="timeline-copy">Ground Stop — Day 2 · 158 passengers</span>
        </span>
        <span className="flight-card-badge">{deskMode === "ground-stop" ? "Active" : "Select"}</span>
      </button>
      {deskMode === "ground-stop" && selected ? (
        <div className="fact-block">
          <p>{selected.event}</p>
          <p className="alert">{selected.constraint}</p>
          <p className="source-line">{selected.sourceLabel}</p>
        </div>
      ) : deskMode === "late" ? (
        <p className="source-line">A31 is 10 minutes late. Station Ops can confirm the gate change. Dispatch and Customer Service see it after it is confirmed.</p>
      ) : (
        <p className="empty">The desk is on the normal MCI bank. Choose a disruption when you want the priorities to change.</p>
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
    </>
  );

  if (variant === "dock") {
    return <div className="scenario-dock-controls">{inner}</div>;
  }

  return (
    <section id="scenario" className="card card--panel" aria-labelledby="scenario-heading">
      <h2 id="scenario-heading">Scenario</h2>
      {inner}
    </section>
  );
}
