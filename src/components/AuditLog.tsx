import { formatClock } from "../lib/format";
import type { AuditEvent } from "../types/contracts";

const KIND_LABEL: Record<AuditEvent["kind"], string> = {
  scenario: "Scenario",
  tool: "Tool",
  recommendation: "Recommendation",
  approval: "Approval",
  outcome: "Outcome",
  agent: "Agent",
  error: "Error",
};

export function AuditLog({ events }: { events: AuditEvent[] }) {
  return (
    <section id="audit" className="card card--panel span" aria-labelledby="audit-heading">
      <h2 id="audit-heading">Audit log</h2>
      {events.length === 0 ? (
        <p className="empty">No events yet. Select the Ground Stop scenario and run the agents.</p>
      ) : (
        <ol className="audit" data-testid="audit">
          {events.map((event) => (
            <li key={event.id}>
              <time dateTime={event.timestamp}>{formatClock(event.timestamp)}</time>
              <span className={`tag tag-${event.kind}`}>{KIND_LABEL[event.kind]}</span>
              <span className={event.simulated ? "tag tag-simulated" : "tag tag-source"}>
                {event.simulated ? "Simulated" : "Source fact"}
              </span>
              <p>
                {event.message}
                {event.detail ? <span className="audit-detail">{event.detail}</span> : null}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
