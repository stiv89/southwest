import type { DemoPassenger, SimulationState } from "../../lib/simulation/types";

function needsRebooking(passenger: DemoPassenger): boolean {
  return passenger.persona === "misconnect" || passenger.connection?.missed === true;
}

export function Rebooking({
  state,
  onOfferNewFlight,
}: {
  state: SimulationState;
  onOfferNewFlight: (passengerId: string) => void;
}) {
  const queue = state.passengers.filter(needsRebooking);
  const protectedConnections = state.passengers.filter(
    (passenger) => passenger.connection && !needsRebooking(passenger),
  );

  return (
    <section className="page-screen" aria-labelledby="rebooking-heading">
      <header className="page-heading">
        <h2 id="rebooking-heading">Rebooking</h2>
        <p>Replacement options for passengers who miss the connection</p>
      </header>

      {queue.length === 0 ? (
        <p className="source-line">No misconnects in this incident.</p>
      ) : (
        <ul className="rebook-list" data-testid="rebooking-list">
          {queue.map((passenger) => (
            <li key={passenger.id}>
              <div>
                <strong>{passenger.name}</strong>
                <p>
                  Misses {passenger.connection?.flight} {passenger.connection?.route} at{" "}
                  {passenger.connection?.departs}.
                </p>
                <p className="source-line">
                  Alternative: SW 918 · MCI → LAS (via DEN) · departs 17:40 · gate B6 · seat 12D
                </p>
                {passenger.offerStatus === "offered" ? (
                  <p className="source-line">Offer sent to the passenger phone. Waiting for acceptance.</p>
                ) : null}
                {passenger.offerStatus === "accepted" ? (
                  <p className="gate-approved">
                    Accepted {passenger.flight} · gate {passenger.gate} · seat {passenger.seat}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="btn btn-primary"
                disabled={passenger.offerStatus === "offered" || passenger.offerStatus === "accepted"}
                onClick={() => onOfferNewFlight(passenger.id)}
              >
                {passenger.offerStatus === "accepted"
                  ? "Rebooked"
                  : passenger.offerStatus === "offered"
                    ? "Offer sent"
                    : "Offer New Flight"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {protectedConnections.length > 0 ? (
        <section className="rebook-protected">
          <h3>Still protected</h3>
          <ul className="gate-flight-list">
            {protectedConnections.map((passenger) => (
              <li key={passenger.id}>
                <strong>{passenger.name}</strong>
                <span>
                  {passenger.connection?.flight} departs {passenger.connection?.departs} ·{" "}
                  {passenger.connection?.walkMinutes} min walk
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
