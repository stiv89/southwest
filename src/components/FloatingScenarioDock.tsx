import { useId, useState } from "react";
import type { DeskMode } from "../lib/flight-board";
import type { DashboardModel } from "../orchestration/dashboard";
import { ScenarioPanel } from "./ScenarioPanel";

export interface IntakeMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export function FloatingScenarioDock({
  open,
  onOpenChange,
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
  onReset,
  intakeMessages,
  intakeBusy,
  onSendIntake,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  onReset: () => void;
  intakeMessages: IntakeMessage[];
  intakeBusy: boolean;
  onSendIntake: (text: string) => void;
}) {
  const [tab, setTab] = useState<"demo" | "chat">("demo");
  const [draft, setDraft] = useState("");
  const formId = useId();

  function submitChat() {
    const text = draft.trim();
    if (!text || intakeBusy) return;
    setDraft("");
    onSendIntake(text);
    setTab("chat");
  }

  return (
    <div className={`scenario-dock${open ? " is-open" : ""}`} data-testid="scenario-dock">
      {open ? (
        <div className="scenario-dock-panel" role="dialog" aria-label="Scenario lab and intake">
          <header className="scenario-dock-header">
            <div>
              <p className="eyebrow">Presentation</p>
              <h2 className="scenario-dock-title">Scenario lab</h2>
            </div>
            <button
              type="button"
              className="scenario-dock-close"
              aria-label="Close scenario lab"
              onClick={() => onOpenChange(false)}
            >
              ×
            </button>
          </header>

          <div className="scenario-dock-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "demo"}
              className={tab === "demo" ? "scenario-dock-tab is-active" : "scenario-dock-tab"}
              onClick={() => setTab("demo")}
            >
              Demo scenarios
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "chat"}
              className={tab === "chat" ? "scenario-dock-tab is-active" : "scenario-dock-tab"}
              onClick={() => setTab("chat")}
            >
              Puter intake
            </button>
          </div>

          {tab === "demo" ? (
            <div className="scenario-dock-body" role="tabpanel">
              <ScenarioPanel
                variant="dock"
                model={model}
                outageEnabled={outageEnabled}
                controlsLocked={controlsLocked}
                runDisabled={runDisabled}
                running={running}
                onSelect={onSelect}
                deskMode={deskMode}
                onDeskMode={onDeskMode}
                onToggleOutage={onToggleOutage}
                onRun={onRun}
              />
              <div className="scenario-dock-actions">
                <button type="button" className="button" data-testid="reset" onClick={onReset}>
                  Reset demo
                </button>
              </div>
            </div>
          ) : (
            <div className="scenario-dock-body scenario-dock-chat" role="tabpanel">
              <p className="source-line">
                Describe a disruption. Puter acknowledges and routes you to the classroom demo flow.
              </p>
              <ol className="intake-thread" aria-live="polite">
                {intakeMessages.length === 0 ? (
                  <li className="intake-empty">Example: “MCI ground stop, flight A31 airborne from DEN.”</li>
                ) : (
                  intakeMessages.map((message) => (
                    <li key={message.id} className={`intake-bubble intake-bubble--${message.role}`}>
                      {message.text}
                    </li>
                  ))
                )}
              </ol>
              <form
                className="intake-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitChat();
                }}
              >
                <label htmlFor={formId} className="visually-hidden">
                  Describe the operational problem
                </label>
                <textarea
                  id={formId}
                  data-testid="intake-input"
                  rows={3}
                  value={draft}
                  placeholder="Describe the scenario problem…"
                  disabled={intakeBusy}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button type="submit" className="button primary" disabled={intakeBusy || draft.trim().length === 0}>
                  {intakeBusy ? "Puter is thinking…" : "Send to Puter"}
                </button>
              </form>
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        className="scenario-dock-pill"
        aria-expanded={open}
        data-testid="scenario-dock-toggle"
        onClick={() => onOpenChange(!open)}
      >
        <span className="scenario-dock-pill-dot" aria-hidden="true" />
        <span className="scenario-dock-pill-label">Scenario lab</span>
        {model.selected ? <span className="scenario-dock-pill-badge">Live</span> : null}
      </button>
    </div>
  );
}