import type { DashboardModel } from "../orchestration/dashboard";

export function OperationalOverview({ model }: { model: DashboardModel }) {
  const selected = model.selected;
  return (
    <section className="card" aria-labelledby="overview-heading">
      <h2 id="overview-heading">Operational overview</h2>
      {selected ? (
        <>
          <p className="lede">
            {selected.airport} — {selected.airportName}. Flight {selected.aircraftId} is a course-brief
            fact, not live telemetry.
          </p>
          <dl className="metrics">
            <div>
              <dt>Flight</dt>
              <dd>
                {selected.aircraftId} from {selected.origin}
              </dd>
            </div>
            <div>
              <dt>Passengers</dt>
              <dd data-testid="passengers">{selected.passengers}</dd>
            </div>
            <div>
              <dt>Connecting</dt>
              <dd data-testid="connecting">{selected.connectingPassengers}</dd>
            </div>
            <div>
              <dt>Wheelchair</dt>
              <dd data-testid="wheelchair">{selected.wheelchairPassengers}</dd>
            </div>
            <div>
              <dt>Crew duty left</dt>
              <dd data-testid="crew">{selected.crewDutyRemaining}</dd>
            </div>
            <div>
              <dt>Fuel flexibility</dt>
              <dd data-testid="fuel">About {selected.fuelFlexibilityMinutes} minutes</dd>
            </div>
          </dl>
          <h3>Alternates to evaluate</h3>
          <p className="source-line">Potential alternates from the brief. Suitability is unknown.</p>
          <ul className="codes">
            {selected.alternateAirports.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <h3>Data freshness</h3>
          <ul className="freshness">
            <li>{selected.sourceLabel}</li>
            <li>Diversion candidates: mock classroom file. Verified capability fields are null.</li>
            <li>{model.assistanceReason}</li>
          </ul>
        </>
      ) : (
        <p className="empty">
          Select Ground Stop — 12:20 PM to load MCI, flight A31, and the course-brief counts.
        </p>
      )}
    </section>
  );
}
