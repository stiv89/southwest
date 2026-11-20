import type { SimulationActivityEvent } from "../lib/simulation/types";
import type { DemoSnapshot } from "../types/contracts";
import { AgentActivity } from "./AgentActivity";

function IncidentFeed({ events }: { events: SimulationActivityEvent[] }) {
  if (events.length === 0) return <p className="empty">No incident steps yet.</p>;
  return (
    <ol className="history incident-feed" data-testid="incident-activity">
      {events.map((event) => (
        <li key={event.id}>
          <div className="history-title">
            <strong>{event.message}</strong>
            <span>{[event.actor, event.clock].filter(Boolean).join(" · ") || new Date(event.at).toLocaleTimeString()}</span>
          </div>
          {event.detail ? <p>{event.detail}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export function SimulationActivity({
  events,
  snapshot,
}: {
  events: SimulationActivityEvent[];
  snapshot: DemoSnapshot;
}) {
  return (
    <div className="activity-stack">
      <section className="card card--panel" aria-labelledby="incident-activity-heading">
        <h2 id="incident-activity-heading">Incident activity</h2>
        <p className="lede">Single session across Station Ops, Dispatch, and Customer Service.</p>
        <IncidentFeed events={events} />
      </section>
      <AgentActivity snapshot={snapshot} />
    </div>
  );
}