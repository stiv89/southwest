import { useState } from "react";
import type { DemoPassenger, SimulationState } from "../../lib/simulation/types";

const URGENCY: Record<DemoPassenger["persona"], string> = {
  terminal: "Monitor gate change",
  connection: "Tight connection",
  misconnect: "Misconnect — needs offer",
};

export function AffectedPassengers({
  state,
  onOfferNewFlight,
}: {
  state: SimulationState;
  onOfferNewFlight: (passengerId: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(state.passengers[0]?.id ?? null);
  const selected = state.passengers.find((p) => p.id === selectedId) ?? null;

  return (
    <section className="card card--panel dept-screen" aria-labelledby="affected-heading">
      <header className="dept-screen-head">
        <h2 id="affected-heading">Affected Passengers</h2>
        <p className="lede">SW 412 departure · gate incident passengers</p>
      </header>

      <div className="pax-split">
        <ul className="pax-urgency-list" data-testid="affected-list">
          {state.passengers.map((pax) => (
            <li key={pax.id}>
              <button
                type="button"
                className={pax.id === selectedId ? "pax-pick is-active" : "pax-pick"}
                onClick={() => setSelectedId(pax.id)}
              >
                <strong>{pax.name}</strong>
                <span className={`pax-urgency urgency-${pax.persona}`}>{URGENCY[pax.persona]}</span>
                <span className="pax-meta">
                  {pax.flight} · Seat {pax.seat} · Gate {pax.gate}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {selected ? (
          <article className="pax-detail" data-testid="pax-detail">
            <h3>{selected.name}</h3>
            <dl className="fact-dl">
              <div>
                <dt>Flight</dt>
                <dd>
                  {selected.flight} · {selected.route}
                </dd>
              </div>
              <div>
                <dt>Gate</dt>
                <dd>{selected.gate}</dd>
              </div>
              <div>
                <dt>Boarding ends</dt>
                <dd>{selected.boardingEnds}</dd>
              </div>
            </dl>

            {selected.connection ? (
              <section className="pax-connection">
                <h4>Connecting itinerary</h4>
                <p>
                  {selected.connection.flight} {selected.connection.route} · departs {selected.connection.departs} ·
                  gate {selected.connection.gate}
                </p>
                <p className="source-line">Estimated walk {selected.connection.walkMinutes} min from arrival gate.</p>
                {selected.connection.missed ? <p className="alert">Misconnect likely — offer replacement flight.</p> : null}
              </section>
            ) : null}

            {selected.persona === "misconnect" ? (
              <div className="pax-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={selected.offerStatus === "offered" || selected.offerStatus === "accepted"}
                  onClick={() => onOfferNewFlight(selected.id)}
                  data-testid="offer-new-flight"
                >
                  Offer New Flight
                </button>
                {selected.offer ? (
                  <p className="source-line">
                    Offer queued: {selected.offer.flight} at {selected.offer.departs} · sent to passenger phone.
                  </p>
                ) : null}
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}