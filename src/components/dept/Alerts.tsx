import { useEffect, useState } from "react";
import { buildGateIncident } from "../../lib/simulation/alert-incident";
import type { SimulationState } from "../../lib/simulation/types";
import type { DemoRole } from "../../lib/shared-case";

export function Alerts({
  state,
  role,
  onOpenFlightWatch,
  onReviewGateChange,
}: {
  state: SimulationState;
  role: DemoRole;
  onOpenFlightWatch: () => void;
  onReviewGateChange: () => void;
}) {
  const incident = buildGateIncident(state);
  const [tab, setTab] = useState<"active" | "resolved">(incident?.resolved ? "resolved" : "active");

  useEffect(() => {
    setTab(incident?.resolved ? "resolved" : "active");
  }, [incident?.resolved]);

  const activeCount = incident && !incident.resolved ? 1 : 0;
  const resolvedCount = incident?.resolved ? 1 : 0;
  const visible = incident && (tab === "resolved") === incident.resolved ? incident : null;

  return (
    <section className="page-screen alerts-screen" aria-labelledby="alerts-heading">
      <header className="page-heading">
        <h2 id="alerts-heading">Alerts</h2>
        <p>Shared with Flight Watch and Station Ops</p>
      </header>

      <div className="alerts-stage">
        <div className="alerts-tray">
          <div className="alert-tabs" role="tablist" aria-label="Incident inbox">
            <button
              type="button"
              role="tab"
              id="alert-tab-active"
              aria-selected={tab === "active"}
              aria-controls="alert-tray"
              onClick={() => setTab("active")}
              data-testid="alert-tab-active"
            >
              Active <span>{activeCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              id="alert-tab-resolved"
              aria-selected={tab === "resolved"}
              aria-controls="alert-tray"
              onClick={() => setTab("resolved")}
              data-testid="alert-tab-resolved"
            >
              Resolved <span>{resolvedCount}</span>
            </button>
          </div>

          <div id="alert-tray" role="tabpanel" aria-labelledby={tab === "active" ? "alert-tab-active" : "alert-tab-resolved"}>
            {visible ? (
              <button
                type="button"
                className={["alert-row", "is-selected", visible.resolved ? "" : "is-open"].filter(Boolean).join(" ")}
                aria-pressed="true"
                data-testid="alert-row"
              >
                <span className="alert-row-copy">
                  <strong>{visible.title}</strong>
                  <span>{visible.flights}</span>
                </span>
                <span className="alert-row-meta">
                  <span>{visible.status}</span>
                  <time>{visible.updated}</time>
                </span>
              </button>
            ) : (
              <p className="alert-empty" data-testid="alert-empty">
                {tab === "active" ? "No active incidents." : "No resolved incidents."}
              </p>
            )}
          </div>
        </div>

        <article className="alerts-detail" data-testid="alert-detail" aria-live="polite">
          {visible ? (
            <>
              <h3>{visible.title}</h3>
              <p className="alert-move">
                {visible.fromGate} → {visible.toGate}
              </p>
              <p className={visible.resolved ? "alert-move-tag is-assigned" : "alert-move-tag"}>{visible.proposalLabel}</p>
              <p className="alert-context" data-testid="alert-boarding">
                {visible.flightContext}
              </p>
              <dl className="alert-facts">
                <div>
                  <dt>Status</dt>
                  <dd>{visible.status}</dd>
                </div>
                <div>
                  <dt>Next</dt>
                  <dd>{visible.nextAction}</dd>
                </div>
              </dl>
              {role === "station-ops" ? (
                <button type="button" className="alert-action" onClick={onReviewGateChange} data-testid="alert-review-gate">
                  Review gate change
                </button>
              ) : (
                <button type="button" className="alert-action" onClick={onOpenFlightWatch} data-testid="alert-open-watch">
                  Open in Flight Watch
                </button>
              )}
              <ol className="alert-history" data-testid="alert-history">
                {visible.history.map((item) => (
                  <li key={item.id}>
                    <p className="alert-history-meta">
                      <time>{item.clock}</time>
                      <span>{item.actor}</span>
                    </p>
                    <strong>{item.title}</strong>
                    <p>{item.change}</p>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="alert-empty">
              {incident
                ? tab === "active"
                  ? "No active incidents."
                  : "This incident is still active."
                : "Publish the SW 2847 delay to open the gate conflict."}
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
