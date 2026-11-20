import type { DemoRole } from "../lib/shared-case";
import type { SimulationState } from "../lib/simulation/types";
import { IconPassengerDemo } from "./sidebar-icons";

const DESK_ROLE: Record<DemoRole, string> = {
  "station-ops": "Station Operations",
  dispatch: "Dispatch",
  "customer-service": "Customer Service",
};

function liveStatus(
  deskMode: "normal" | "late" | "ground-stop",
  simulation: SimulationState | null,
): { label: string; tone: "ok" | "watch" | "stop" } {
  if (deskMode === "ground-stop") return { label: "Ground stop", tone: "stop" };
  if (simulation?.gateConflict.detected && !simulation.gateConflict.approved) {
    return { label: "Gate overlap", tone: "watch" };
  }
  return { label: "Normal operations", tone: "ok" };
}

export function Header({
  role,
  clock,
  deskMode,
  simulation,
  onOpenPassengerDemo,
}: {
  role: DemoRole;
  clock: string;
  deskMode: "normal" | "late" | "ground-stop";
  simulation: SimulationState | null;
  onOpenPassengerDemo: () => void;
}) {
  const status = liveStatus(deskMode, simulation);

  return (
    <header className="desk-bar">
      <div className="desk-bar-side">
        <h1>MCI Operations Desk</h1>
        <p>{DESK_ROLE[role]}</p>
      </div>
      <p className={`desk-bar-status tone-${status.tone}`}>
        <span className="desk-bar-dot" aria-hidden="true" />
        <span data-testid="status-indicator">{status.label}</span>
        <span aria-hidden="true">·</span>
        <time data-testid="simulated-time">{clock}</time>
        <small>(Simulated)</small>
      </p>
      <div className="desk-bar-side desk-bar-side--end">
        <button
          type="button"
          className="passenger-demo-btn"
          onClick={onOpenPassengerDemo}
          data-testid="passenger-demo-btn"
        >
          <IconPassengerDemo className="desk-action-icon" />
          <span>Passenger Demo</span>
        </button>
      </div>
    </header>
  );
}
