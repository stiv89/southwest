import { useEffect, useState } from "react";
import { alternateRows, caseSources, GROUND_STOP_CASE_ID } from "../lib/case-workspace";
import { buildBoard, type DeskMode, type GateRevision } from "../lib/flight-board";
import { ROLE_LABEL, type DemoRole, type SharedCaseState } from "../lib/shared-case";
import type { DashboardModel } from "../orchestration/dashboard";

const A31_IDS = new Set(["a31", GROUND_STOP_CASE_ID]);

export function CaseDesk({
  model,
  caseId,
  role,
  mode,
  gate,
  sharedCase,
  onOpenFlight,
  onConfirmGate,
  onRecordDestination,
}: {
  model: DashboardModel;
  caseId: string | null;
  role: DemoRole;
  mode: DeskMode;
  gate: GateRevision | null;
  sharedCase: SharedCaseState;
  onOpenFlight: (caseId: string) => void;
  onConfirmGate: () => void;
  onRecordDestination: (code: string) => void;
}) {
  if (!caseId || !A31_IDS.has(caseId)) {
    return <OperationsHome mode={mode} gate={gate} onOpenFlight={onOpenFlight} />;
  }
  return (
    <FlightA31
      model={model}
      role={role}
      mode={mode}
      gate={gate}
      sharedCase={sharedCase}
      onConfirmGate={onConfirmGate}
      onRecordDestination={onRecordDestination}
    />
  );
}

function OperationsHome({
  mode,
  gate,
  onOpenFlight,
}: {
  mode: DeskMode;
  gate: GateRevision | null;
  onOpenFlight: (caseId: string) => void;
}) {
  const flights = buildBoard(mode, gate).filter((flight) => flight.needsReview);
  return (
    <section className="case-desk" aria-labelledby="ops-home-heading">
      <header className="case-head">
        <div>
          <p className="eyebrow">Operations</p>
          <h2 id="ops-home-heading">Flights that need attention</h2>
        </div>
      </header>
      {flights.length === 0 ? (
        <p className="desk-empty">No flights need attention this shift.</p>
      ) : (
        <ul className="ops-queue">
          {flights.map((flight) => (
            <li key={flight.id}>
              <button type="button" onClick={() => onOpenFlight(flight.id)}>
                <strong>
                  {flight.flight} · {flight.route}
                </strong>
                <span className={`desk-status tone-${flight.tone}`}>{flight.status}</span>
                <span>{flight.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FlightA31({
  model,
  role,
  mode,
  gate,
  sharedCase,
  onConfirmGate,
  onRecordDestination,
}: {
  model: DashboardModel;
  role: DemoRole;
  mode: DeskMode;
  gate: GateRevision | null;
  sharedCase: SharedCaseState;
  onConfirmGate: () => void;
  onRecordDestination: (code: string) => void;
}) {
  const selected = model.selected;
  const recorded = mode === "ground-stop" ? sharedCase.recordedDestination : null;
  const disrupted = mode === "ground-stop";
  const rows = alternateRows();
  const [picked, setPicked] = useState(rows[0]?.code ?? "STL");
  const [alternatesOpen, setAlternatesOpen] = useState(role === "dispatch" && !recorded);
  useEffect(() => {
    if (recorded) setAlternatesOpen(false);
  }, [recorded]);

  return (
    <section className="case-desk" aria-labelledby="case-heading">
      <article className="flight-summary">
        <div className="route-diagram" aria-hidden="true">
          <div className="route-node">
            <strong>DEN</strong>
            <span>Origin</span>
          </div>
          <span className="route-leg" />
          <div className="route-node is-flight">
            <strong>A31</strong>
            <span>{disrupted ? "Airborne" : gate?.status === "confirmed" ? "Delayed" : "Scheduled"}</span>
          </div>
          <span className="route-leg" />
          <div className="route-node">
            <strong>MCI</strong>
            <span>Scheduled</span>
          </div>
          {recorded ? (
            <div className="route-branch">
              <strong>{recorded.code}</strong>
              <span>Suitability not verified</span>
            </div>
          ) : null}
        </div>
        <div>
          <p className="eyebrow">Flight summary</p>
          <h2 id="case-heading">A31</h2>
          <p>DEN → MCI · Scheduled{recorded ? ` · ${recorded.code} · Diversion destination recorded` : ""}</p>
          <p className="flight-latest">
            Latest update ·{" "}
            {recorded
              ? `${recorded.code} recorded by Dispatch`
              : disrupted
                ? "MCI ground stop started"
                : gate?.status === "confirmed"
                  ? `Gate ${gate.to} confirmed by Station Ops`
                  : mode === "late"
                    ? "ETA moved from 12:40 to 12:50"
                    : "On time for gate B12"}
          </p>
          {recorded ? <p className="flight-suitability">Suitability not verified</p> : null}
        </div>
        <p className="case-clock">
          <span>{selected?.simulatedTime ?? "12:20 PM"}</span>
          <span>Classroom simulation</span>
        </p>
      </article>

      <div className="flight-work">
        <NextAction
          role={role}
          disrupted={disrupted}
          recordedCode={recorded?.code ?? null}
          gate={gate}
          mode={mode}
          picked={picked}
          rows={rows}
          onPick={setPicked}
          onRecord={onRecordDestination}
          onConfirmGate={onConfirmGate}
        />
        <aside className="team-handoff" aria-labelledby="handoff-heading">
          <h3 id="handoff-heading">Team handoff</h3>
          <ul>
            <li>
              <strong>Dispatch</strong>
              <span>{recorded ? "Destination recorded" : disrupted ? "Record destination" : "Monitoring"}</span>
            </li>
            <li className={role === "station-ops" ? "is-mine" : undefined}>
              <strong>Station Ops</strong>
              <span>{recorded ? "Arrival prep open" : disrupted ? "Waiting" : "Turnaround open"}</span>
            </li>
            <li className={role === "customer-service" ? "is-mine" : undefined}>
              <strong>Customer Service</strong>
              <span>{recorded ? "Rebooking review open" : "Connections watch"}</span>
            </li>
            <li>
              <strong>Communications</strong>
              <span>Passenger update draft</span>
            </li>
          </ul>
        </aside>
      </div>

      <section className="case-timeline" aria-labelledby="timeline-heading">
        <h3 id="timeline-heading">Case timeline</h3>
        <ol>
          {timeline(mode, recorded?.code ?? null, gate).map((event) => (
            <li key={event.id}>
              <time>{event.time}</time>
              <div>
                <strong>{event.title}</strong>
                <span>{event.team}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {disrupted ? (
        <details
          className="alternate-assessment"
          open={alternatesOpen}
          onToggle={(event) => setAlternatesOpen(event.currentTarget.open)}
        >
          <summary>
            Alternate assessment · 0 of {rows.length} alternates verified
          </summary>
          <table>
            <thead>
              <tr>
                <th>Airport</th>
                <th>Status</th>
                <th>Still missing</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.code}>
                  <td>
                    <strong>{row.code}</strong>
                    <span>{row.name}</span>
                  </td>
                  <td>{row.status}</td>
                  <td>{row.missing}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="case-sources">
            {caseSources().map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function NextAction({
  role,
  disrupted,
  recordedCode,
  gate,
  mode,
  picked,
  rows,
  onPick,
  onRecord,
  onConfirmGate,
}: {
  role: DemoRole;
  disrupted: boolean;
  recordedCode: string | null;
  gate: GateRevision | null;
  mode: DeskMode;
  picked: string;
  rows: { code: string; name: string }[];
  onPick: (code: string) => void;
  onRecord: (code: string) => void;
  onConfirmGate: () => void;
}) {
  const title = nextTitle(role, disrupted, recordedCode, gate, mode);
  return (
    <section className="next-action" aria-labelledby="next-action-heading">
      <p className="eyebrow">{ROLE_LABEL[role]}</p>
      <h3 id="next-action-heading">Next action · {title}</h3>
      {role === "dispatch" && disrupted && !recordedCode ? (
        <form
          className="case-record"
          onSubmit={(event) => {
            event.preventDefault();
            if (picked) onRecord(picked);
          }}
        >
          <p>Record the destination already confirmed by authorized people. Recording it does not verify suitability.</p>
          <label>
            Destination
            <select value={picked} onChange={(event) => onPick(event.target.value)}>
              {rows.map((row) => (
                <option key={row.code} value={row.code}>
                  {row.code} · {row.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Record destination</button>
        </form>
      ) : null}
      {role === "station-ops" && disrupted ? (
        <ul className="prep-items">
          <PrepItem label="Gate" status={recordedCode ? "Open" : "Waiting"} owner="Station Ops" />
          <PrepItem label="Staffing" status={recordedCode ? "Open" : "Waiting"} owner="Station Ops" />
          <PrepItem label="Ground assistance" status="Availability unknown" owner="Station Ops" />
        </ul>
      ) : null}
      {role === "station-ops" && !disrupted ? (
        <>
          <ul className="prep-items">
            <PrepItem label="Gate" status={gate?.status === "confirmed" ? gate.to : "B12"} owner="Station Ops" />
            <PrepItem label="Arrival" status={mode === "late" ? "12:50" : "12:40"} owner="Station Ops" />
            <PrepItem label="Bags" status="Not started" owner="Ramp" />
            <PrepItem label="Clean" status="Not started" owner="Ramp" />
            <PrepItem label="Ready" status="Not started" owner="Gate" />
          </ul>
          {gate?.status === "proposed" ? (
            <button type="button" className="button primary" onClick={onConfirmGate}>
              Confirm gate change
            </button>
          ) : null}
        </>
      ) : null}
      {role === "customer-service" ? (
        <p>
          {recordedCode
            ? `Review rebooking options for ${recordedCode}. Hotels and ground transport stay availability unknown.`
            : disrupted
              ? "42 connections and 3 mobility requests. Keep options provisional until a destination is recorded."
              : "No confirmed passenger change to communicate."}
        </p>
      ) : null}
      {role === "dispatch" && (recordedCode || !disrupted) ? (
        <p>
          {recordedCode
            ? `${recordedCode} is recorded. Suitability is not verified. Station Ops owns arrival preparation.`
            : mode === "late" && gate?.status === "confirmed"
              ? "The confirmed gate can move the estimate for the next A31 departure."
              : "No dispatch review is open on this flight."}
        </p>
      ) : null}
    </section>
  );
}

function PrepItem({ label, status, owner }: { label: string; status: string; owner: string }) {
  return (
    <li>
      <strong>{label}</strong>
      <span>{status}</span>
      <em>{owner}</em>
    </li>
  );
}

function nextTitle(
  role: DemoRole,
  disrupted: boolean,
  recordedCode: string | null,
  gate: GateRevision | null,
  mode: DeskMode,
): string {
  if (disrupted && role === "station-ops") return recordedCode ? `Prepare arrival at ${recordedCode}` : "Wait for a recorded destination";
  if (disrupted && role === "customer-service") {
    return recordedCode ? `Review rebooking options for ${recordedCode}` : "Hold rebooking until a destination is recorded";
  }
  if (disrupted && role === "dispatch") return recordedCode ? `Track the ${recordedCode} handoff` : "Record diversion destination";
  if (role === "station-ops" && gate?.status === "proposed") return "Confirm gate change";
  if (role === "station-ops") return "Work the arrival milestones";
  if (role === "customer-service" && gate?.status === "confirmed") return "Review connections for the confirmed gate";
  if (role === "dispatch" && mode === "late" && gate?.status === "confirmed") return "Review A31";
  return "Monitor the arrival";
}

function timeline(mode: DeskMode, recordedCode: string | null, gate: GateRevision | null) {
  if (mode === "ground-stop") {
    const events = [
      { id: "start", time: "12:20", title: "MCI ground stop started", team: "Dispatch" },
    ];
    if (recordedCode) {
      events.push(
        { id: "record", time: "12:22", title: `Dispatch recorded ${recordedCode}`, team: "Dispatch" },
        { id: "arrival", time: "12:22", title: "Arrival preparation opened", team: "Station Ops" },
        { id: "rebook", time: "12:22", title: "Rebooking review opened", team: "Customer Service" },
      );
    }
    return events;
  }
  const events = [{ id: "plan", time: "12:20", title: "A31 scheduled into MCI at 12:40, gate B12", team: "Station Ops" }];
  if (mode === "late") {
    events.push({ id: "eta", time: "12:21", title: "ETA changed from 12:40 to 12:50", team: "Station Ops" });
    events.push({ id: "propose", time: "12:22", title: "Gate change B12 → B18 proposed", team: "Station Ops" });
    if (gate?.status === "confirmed") {
      events.push({ id: "confirm", time: "12:24", title: `Gate ${gate.to} confirmed`, team: "Station Ops" });
    }
  }
  return events;
}
