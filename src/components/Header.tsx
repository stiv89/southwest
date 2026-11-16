import type { DashboardModel } from "../orchestration/dashboard";

export function Header({ model, onReset }: { model: DashboardModel; onReset: () => void }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div>
          <p className="eyebrow">Southwest Agentic Operations / MCI</p>
          <h1>Operations Control</h1>
          <p className="header-scenario" data-testid="scenario-label">
            {model.scenarioLabel}
          </p>
        </div>
        <div className="header-status">
          <div>
            <span className="meta-label">Simulated time</span>
            <strong data-testid="simulated-time">{model.simulatedTime}</strong>
          </div>
          <div>
            <span className="meta-label">Status</span>
            <strong className={`status-pill status-${model.status.toLowerCase()}`} data-testid="status-indicator">
              {model.status}
            </strong>
          </div>
          <button type="button" className="button ghost" data-testid="reset" onClick={onReset}>
            Reset Demo
          </button>
        </div>
      </div>
    </header>
  );
}
