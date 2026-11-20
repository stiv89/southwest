import type { DeskMode } from "../lib/flight-board";
import { scenario } from "../lib/mock-data";
import type { DashboardModel } from "../orchestration/dashboard";

const DOCK_PILLS: { id: DeskMode; pill: string }[] = [
  { id: "normal", pill: "Normal" },
  { id: "late", pill: "A31 late" },
  { id: "ground-stop", pill: "Ground stop" },
];

export function ScenarioDockPills({
  deskMode,
  onDeskMode,
}: {
  deskMode: DeskMode;
  onDeskMode: (mode: DeskMode) => void;
}) {
  return (
    <div className="scenario-dock-setup" data-testid="scenario-setup">
      <div className="scenario-picks scenario-picks--pills" role="group" aria-label="Demo scenario">
        {DOCK_PILLS.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={
              deskMode === mode.id ? "scenario-pick scenario-pick--pill is-active" : "scenario-pick scenario-pick--pill"
            }
            aria-pressed={deskMode === mode.id}
            data-testid={mode.id === "ground-stop" ? "scenario-ground-stop" : undefined}
            onClick={() => onDeskMode(mode.id)}
          >
            {mode.pill}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ScenarioPanel({
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
      <p className="lede">Same simulated bank. Pick the beat you want to show.</p>
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
        className={
          deskMode === "ground-stop" ? "timeline-item flight-card flight-card--active" : "timeline-item flight-card"
        }
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
          <span className="timeline-copy">
            Ground Stop — Day 2 · {scenario.passengers} passengers
          </span>
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
        <p className="source-line">
          A31 is 10 minutes late. Station Ops can confirm the gate change. Dispatch and Customer Service see it after
          it is confirmed.
        </p>
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
      <button type="button" className="button primary" data-testid="run-agents" disabled={runDisabled} onClick={onRun}>
        {running ? "Running…" : "Run Agents"}
      </button>
    </>
  );

  return (
    <section id="scenario" className="card card--panel" aria-labelledby="scenario-heading">
      <h2 id="scenario-heading">Scenario</h2>
      {inner}
    </section>
  );
}