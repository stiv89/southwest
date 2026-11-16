import { AGENT_ROSTER, ORG_LANES } from "../lib/agent-roster";

export function AgentRoster() {
  return (
    <>
      <h3 id="agent-roster-heading">Class agent roster</h3>
      <p className="source-line">
        Seven agents from the course whiteboard. The orchestrator runs route planning, customer
        service, maintenance, scheduling, communications, and compliance/safety before the human gate.
      </p>
      <ul className="roster-grid" aria-labelledby="agent-roster-heading">
        {AGENT_ROSTER.map((entry) => (
          <li
            key={entry.id}
            className={
              entry.demoStatus === "live" ? "roster-card roster-card--live" : "roster-card roster-card--planned"
            }
          >
            <div className="roster-card-head">
              <span className="roster-order">{entry.order}</span>
              <strong>{entry.name}</strong>
              <span className={`roster-badge roster-badge--${entry.demoStatus}`}>
                {entry.demoStatus === "live" ? "Live in demo" : "Planned"}
              </span>
            </div>
            <p className="roster-tagline">{entry.tagline}</p>
            <p className="roster-lane">{entry.orgLane}</p>
            <ul className="roster-tasks">
              {entry.responsibilities.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <h3>Operating model (whiteboard)</h3>
      <div className="org-lanes">
        {ORG_LANES.map((lane) => (
          <article key={lane.title} className="org-lane-card">
            <h4>{lane.title}</h4>
            <ul>
              {lane.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}