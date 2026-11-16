import { useState } from "react";
import {
  attentionFor,
  buildBoard,
  recentChanges,
  SUMMARY_LABEL,
  summaryCounts,
  visibleFlights,
  type DeskMode,
  type FlightFilter,
  type GateRevision,
} from "../lib/flight-board";
import { GROUND_STOP_CASE_ID } from "../lib/case-workspace";
import { ROLE_LABEL, type DemoRole } from "../lib/shared-case";

export function RoleHome({
  role,
  mode,
  gate,
  clock,
  onOpenCase,
  onConfirmGate,
}: {
  role: DemoRole;
  mode: DeskMode;
  gate: GateRevision | null;
  clock: string;
  onOpenCase: (caseId: string) => void;
  onConfirmGate: () => void;
}) {
  const flights = buildBoard(mode, gate);
  const counts = summaryCounts(flights);
  const attention = attentionFor(role, mode, gate);
  const changes = recentChanges(mode, gate);
  const [filter, setFilter] = useState<FlightFilter | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows = visibleFlights(flights, filter);
  const selected = flights.find((flight) => flight.id === selectedId) ?? null;

  return (
    <section className="desk" aria-labelledby="today-heading">
      <header className="desk-shift">
        <div>
          <p className="eyebrow">MCI Operations Desk · {ROLE_LABEL[role]}</p>
          <h2 id="today-heading">Upcoming flights</h2>
        </div>
        <p className="live-pill">Simulated {clock}</p>
      </header>

      <div className="desk-summary" role="group" aria-label="Shift summary">
        {(Object.keys(SUMMARY_LABEL) as FlightFilter[]).map((key) => (
          <button
            key={key}
            type="button"
            className={filter === key ? "is-on" : undefined}
            aria-pressed={filter === key}
            onClick={() => setFilter(filter === key ? null : key)}
          >
            <strong>{counts[key]}</strong>
            <span>{SUMMARY_LABEL[key]}</span>
          </button>
        ))}
      </div>

      <div className="desk-grid">
        <section className="desk-timeline" aria-labelledby="timeline-heading">
          <h3 id="timeline-heading">Next two hours</h3>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Flight</th>
                <th>Route</th>
                <th>Scheduled</th>
                <th>Estimated</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((flight) => (
                <tr
                  key={flight.id}
                  className={selectedId === flight.id ? "is-selected" : undefined}
                  data-tone={flight.tone}
                >
                  <td>{flight.estimated}</td>
                  <td>
                    <button type="button" onClick={() => setSelectedId(flight.id === selectedId ? null : flight.id)}>
                      {flight.flight}
                    </button>
                  </td>
                  <td>{flight.route}</td>
                  <td>{flight.scheduled}</td>
                  <td>{flight.estimated}</td>
                  <td>
                    <span className={`desk-status tone-${flight.tone}`}>{flight.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="desk-attention" aria-labelledby="attention-heading">
          <h3 id="attention-heading">Needs attention</h3>
          {attention.length === 0 ? (
            <p className="desk-empty">No items need attention.</p>
          ) : (
            <ul>
              {attention.map((card) => (
                <li key={card.id} data-tone={card.tone}>
                  <strong>{card.flight}</strong>
                  <p>{card.reason}</p>
                  <p className="desk-owner">{card.owner}</p>
                  {card.action === "Confirm gate change" ? (
                    <button type="button" onClick={onConfirmGate}>
                      {card.action}
                    </button>
                  ) : (
                    <button type="button" onClick={() => setSelectedId(card.flightId)}>
                      {card.action}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <section className="desk-changes" aria-labelledby="changes-heading">
        <h3 id="changes-heading">Recent changes</h3>
        <ul>
          {changes.map((change) => (
            <li key={change.id}>
              <time>{change.time}</time>
              <strong>{change.flight}</strong>
              <span>{change.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {selected ? (
        <aside className="desk-detail" aria-label={`${selected.flight} detail`}>
          <h3>
            {selected.flight} · {selected.route}
          </h3>
          <p>
            Gate {selected.gate} · Scheduled {selected.scheduled} · Estimated {selected.estimated}
          </p>
          <p>{selected.detail}</p>
          <p className={`desk-status tone-${selected.tone}`}>{selected.status}</p>
          {selected.id === "a31" ? (
            <button type="button" onClick={() => onOpenCase(GROUND_STOP_CASE_ID)}>
              Open flight details
            </button>
          ) : null}
          {role === "station-ops" && gate?.status === "proposed" && selected.id === "a31" ? (
            <button type="button" onClick={onConfirmGate}>
              Confirm gate change
            </button>
          ) : null}
        </aside>
      ) : null}
    </section>
  );
}
