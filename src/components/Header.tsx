import type { DashboardModel } from "../orchestration/dashboard";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "OP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function Header({
  model,
  approver,
  role,
  clock,
  deskMode,
  onOpenProfile,
}: {
  model: DashboardModel;
  approver: string;
  role: string;
  clock: string;
  deskMode: "normal" | "late" | "ground-stop";
  onOpenProfile: () => void;
}) {
  return (
    <header className="topbar topbar--open">
      <div className="topbar-inner">
        <div>
          <p className="eyebrow">MCI Operations Desk · {role}</p>
          <h1>SouthwestAdmin</h1>
          <p className="header-scenario" data-testid="scenario-label">
            {model.scenarioLabel}
          </p>
        </div>
        <div className="header-status">
          <div>
            <span className="meta-label">Simulated time</span>
            <strong data-testid="simulated-time">{model.selected ? clock : model.simulatedTime}</strong>
          </div>
          <div>
            <span className="meta-label">Status</span>
            <strong className={`header-status-value status-${(deskMode === "ground-stop" ? "grounded" : "normal")}`} data-testid="status-indicator">
              {deskMode === "ground-stop" ? "Grounded" : "Normal"}
            </strong>
          </div>
          <button
            type="button"
            className="header-avatar header-avatar--btn"
            aria-label={`${approver}. Open profile and decision desk.`}
            onClick={onOpenProfile}
          >
            {initials(approver)}
          </button>
        </div>
      </div>
    </header>
  );
}