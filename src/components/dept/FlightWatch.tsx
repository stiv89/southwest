import { useState } from "react";
import type { SimulationState } from "../../lib/simulation/types";
import { IconSimulateDelay } from "../sidebar-icons";
import { RampScene, type RampGateId, type RampSelection } from "./RampScene";

const WINDOW_START = 13 * 60 + 45;
const WINDOW_END = 15 * 60 + 15;
const WINDOW_SPAN = WINDOW_END - WINDOW_START;
const ARRIVAL_OCCUPANCY = 20;
const DEPARTURE_LEAD = 5;
const DEPARTURE_OCCUPANCY = 30;

function minutes(clock: string): number {
  const [hours, mins] = clock.split(":").map(Number);
  return hours * 60 + mins;
}

function clock(total: number): string {
  const hours = Math.floor(total / 60) % 24;
  const mins = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function leftOf(minute: number): string {
  return `${((minute - WINDOW_START) / WINDOW_SPAN) * 100}%`;
}

function widthOf(start: number, end: number): string {
  return `${((end - start) / WINDOW_SPAN) * 100}%`;
}

const TICKS = [14 * 60, 14 * 60 + 15, 14 * 60 + 30, 14 * 60 + 45, 15 * 60];

export function FlightWatch({
  state,
  onSimulateDelay,
  busy,
  initialSelection = null,
}: {
  state: SimulationState;
  onSimulateDelay: () => void;
  busy?: boolean;
  initialSelection?: RampSelection | null;
}) {
  const [selection, setSelection] = useState<RampSelection | null>(initialSelection);
  const inbound = state.flights.find((flight) => flight.id === "sw2847");
  const departure = state.flights.find((flight) => flight.id === "sw412");
  const conflict = state.gateConflict;
  const noticeSent = state.passengers.some((passenger) =>
    passenger.alerts.some((alert) => alert.startsWith("Gate changed")),
  );

  const arrivalStart = inbound ? minutes(inbound.currentEta) : 0;
  const arrivalEnd = arrivalStart + ARRIVAL_OCCUPANCY;
  const departureMoment = departure ? minutes(departure.currentEta) : 0;
  const departureStart = departureMoment - DEPARTURE_LEAD;
  const departureEnd = departureStart + DEPARTURE_OCCUPANCY;
  const overlapStart = Math.max(arrivalStart, departureStart);
  const overlapEnd = Math.min(arrivalEnd, departureEnd);
  const showOverlap = conflict.detected && !conflict.approved && overlapEnd > overlapStart;
  const overlapStartFrac = (overlapStart - WINDOW_START) / WINDOW_SPAN;
  const overlapSpanFrac = (overlapEnd - overlapStart) / WINDOW_SPAN;

  const gateDetail = (id: RampGateId) => state.gates.find((gate) => gate.label === id)?.flight ?? "Open";
  const labels = [
    {
      id: "C14" as const,
      detail: departure?.flight ?? "SW 412",
      tone: conflict.detected && !conflict.approved ? ("amber" as const) : ("idle" as const),
    },
    { id: "C16" as const, detail: gateDetail("C16"), tone: "idle" as const },
    { id: "C18" as const, detail: gateDetail("C18"), tone: "idle" as const },
    {
      id: "C19" as const,
      detail: conflict.detected ? (departure?.flight ?? "SW 412") : "Open",
      tone: conflict.approved ? ("confirmed" as const) : conflict.detected ? ("proposed" as const) : ("idle" as const),
    },
  ];

  const c14Selected = selection?.kind === "gate" && selection.id === "C14";
  const arrivalSelected = c14Selected || (selection?.kind === "flight" && selection.id === "sw2847");
  const departureOnC14 = !conflict.approved && (c14Selected || (selection?.kind === "flight" && selection.id === "sw412"));
  const c19Selected =
    (selection?.kind === "gate" && selection.id === "C19") ||
    (conflict.approved && selection?.kind === "flight" && selection.id === "sw412");

  const focus = describeSelection(selection, state);

  return (
    <section className="page-screen watch-screen" aria-labelledby="flight-watch-heading">
      <header className="page-heading page-heading--split">
        <div>
          <h2 id="flight-watch-heading">Flight Watch</h2>
          <p>Concourse C · C14 to C19</p>
        </div>
        <button
          type="button"
          className="desk-action desk-action--dispatch"
          disabled={inbound?.delayApplied || busy}
          onClick={onSimulateDelay}
          data-testid="simulate-delay"
        >
          <IconSimulateDelay className="desk-action-icon" />
          <span>{busy ? "Publishing…" : inbound?.delayApplied ? "Delay published" : "Simulate Delay"}</span>
          <span className="desk-action-meta">+25 min</span>
        </button>
      </header>

      <div className="watch-stage">
        <div className="ramp-column">
          <RampScene
            labels={labels}
            arrivalLabel={inbound ? (inbound.delayApplied ? `${inbound.originalEta} → ${inbound.currentEta}` : inbound.currentEta) : "14:05"}
            selection={selection}
            onSelect={setSelection}
          />
          <p className="ramp-caption" data-testid="ramp-stand">
            {conflict.approved
              ? `${departure?.flight ?? "SW 412"} assigned to C19 · aircraft still on stand C14`
              : `${departure?.flight ?? "SW 412"} on stand C14`}
          </p>
        </div>

        <aside className="incident-card" data-testid="incident-panel">
          {focus ? (
            <div className="incident-focus" data-testid="incident-focus">
              <p className="incident-kicker">{focus.title}</p>
              {focus.lines.map((line) => (
                <p key={line} className="incident-next">
                  {line}
                </p>
              ))}
            </div>
          ) : null}
          <p className="incident-kicker">
            {conflict.approved ? "Gate change · C19" : conflict.detected ? "Gate conflict · C14" : "Gates clear"}
          </p>
          <ul className="incident-flights">
            <li>
              <strong>{inbound?.flight}</strong>
              <span>ARR {inbound?.delayApplied ? `${inbound.originalEta} → ${inbound.currentEta}` : inbound?.currentEta} · C14</span>
            </li>
            <li>
              <strong>{departure?.flight}</strong>
              <span>
                DEP {departure?.currentEta} · {conflict.approved ? "C19" : "C14"}
              </span>
            </li>
          </ul>
          {conflict.detected && !conflict.approved ? (
            <>
              <p className="incident-move">Proposed move · {departure?.flight} → C19</p>
              <p className="incident-next">
                {conflict.rejected ? "Station Ops rejected the proposal" : "Awaiting Station Ops approval"}
              </p>
            </>
          ) : null}
          {conflict.approved ? (
            <>
              <p className="incident-move">
                {departure?.flight} assigned {conflict.fromGate} → {conflict.toGate}
              </p>
              <p className="incident-next">Aircraft remains on stand C14</p>
              <p className="incident-next">
                {noticeSent ? "Passenger notice sent to phones" : "Passenger notice pending"}
              </p>
            </>
          ) : null}
          {!conflict.detected ? (
            <p className="incident-next">Publish the inbound delay to create the C14 overlap.</p>
          ) : null}
        </aside>
      </div>

      <div className="gate-timeline" data-testid="gate-timeline" aria-label="Gate occupancy timeline">
        <div className="gate-timeline-scale">
          <span className="gate-timeline-gutter" />
          <div className="gate-timeline-axis-wrap">
            <span />
            <div className="gate-timeline-axis">
              {TICKS.map((tick) => (
                <span key={tick} style={{ left: leftOf(tick) }}>
                  {clock(tick)}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={["c14-stack", conflict.detected && !conflict.approved ? "is-conflict" : ""].filter(Boolean).join(" ")}>
          <button
            type="button"
            className={["gate-lane-label", c14Selected ? "is-selected" : ""].filter(Boolean).join(" ")}
            onClick={() => setSelection({ kind: "gate", id: "C14" })}
          >
            C14
          </button>
          <button
            type="button"
            className={["flight-row", arrivalSelected ? "is-selected" : ""].filter(Boolean).join(" ")}
            data-testid="timeline-row-sw2847"
            aria-pressed={arrivalSelected}
            onClick={() => setSelection({ kind: "flight", id: "sw2847" })}
          >
            <span className="flight-row-name">SW 2847</span>
            <span className="gate-lane-track gate-lane-track--slim">
              {inbound ? (
                <Occupancy flight={inbound.flight} kind="ARR" start={arrivalStart} end={arrivalEnd} marker={arrivalStart} />
              ) : null}
              {inbound?.delayApplied ? (
                <span className="gate-origin-mark" style={{ left: leftOf(minutes(inbound.originalEta)) }} title="Original arrival">
                  {inbound.originalEta}
                </span>
              ) : null}
            </span>
          </button>
          <button
            type="button"
            className={["flight-row", departureOnC14 ? "is-selected" : ""].filter(Boolean).join(" ")}
            data-testid="timeline-row-sw412"
            aria-pressed={departureOnC14}
            onClick={() => setSelection({ kind: "flight", id: "sw412" })}
          >
            <span className="flight-row-name">SW 412</span>
            <span className="gate-lane-track gate-lane-track--slim">
              {departure && !conflict.approved ? (
                <Occupancy
                  flight={departure.flight}
                  kind="DEP"
                  start={departureStart}
                  end={departureEnd}
                  marker={departureMoment}
                />
              ) : (
                <span className="flight-row-released">Released</span>
              )}
            </span>
          </button>
          {showOverlap ? (
            <span
              className="gate-overlap-span"
              data-testid="gate-overlap"
              style={{ ["--start" as string]: overlapStartFrac, ["--span" as string]: overlapSpanFrac }}
            />
          ) : null}
        </div>

        <div className="gate-lane">
          <button
            type="button"
            className={["gate-lane-label", selection?.kind === "gate" && selection.id === "C19" ? "is-selected" : ""].filter(Boolean).join(" ")}
            onClick={() => setSelection({ kind: "gate", id: "C19" })}
          >
            C19
          </button>
          <button
            type="button"
            className={["flight-row", c19Selected ? "is-selected" : ""].filter(Boolean).join(" ")}
            data-testid="timeline-row-c19"
            aria-pressed={c19Selected}
            onClick={() => setSelection({ kind: "gate", id: "C19" })}
          >
            <span className="flight-row-name">{conflict.detected ? departure?.flight : "Open"}</span>
            <span className="gate-lane-track gate-lane-track--slim">
              {departure && conflict.detected && !conflict.approved ? (
                <Occupancy
                  flight={departure.flight}
                  kind="DEP"
                  start={departureStart}
                  end={departureEnd}
                  marker={departureMoment}
                  proposed
                />
              ) : null}
              {departure && conflict.approved ? (
                <Occupancy
                  flight={departure.flight}
                  kind="DEP"
                  start={departureStart}
                  end={departureEnd}
                  marker={departureMoment}
                />
              ) : null}
            </span>
          </button>
        </div>
      </div>

      <div className="table-wrap watch-table">
        <table className="data-table" data-testid="flight-watch-table">
          <thead>
            <tr>
              <th>Flight</th>
              <th>Route</th>
              <th>Gate</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {state.flights.map((flight) => {
              const tag = flight.type === "arrival" ? "ARR" : "DEP";
              const shifted = flight.delayApplied && flight.originalEta !== flight.currentEta;
              const selected = selection?.kind === "flight" && selection.id === flight.id;
              return (
                <tr
                  key={flight.id}
                  className={selected ? "is-selected" : undefined}
                  onClick={() => setSelection({ kind: "flight", id: flight.id as "sw412" | "sw2847" })}
                >
                  <td>
                    <strong>{flight.flight}</strong>
                  </td>
                  <td>{flight.route}</td>
                  <td>{flight.gate}</td>
                  <td>
                    {tag}{" "}
                    {shifted ? `${flight.originalEta} → ${flight.currentEta} · +25 min` : flight.currentEta}
                  </td>
                  <td>{flight.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function describeSelection(selection: RampSelection | null, state: SimulationState): { title: string; lines: string[] } | null {
  if (!selection) return null;
  const inbound = state.flights.find((flight) => flight.id === "sw2847");
  const departure = state.flights.find((flight) => flight.id === "sw412");
  const conflict = state.gateConflict;

  if (selection.kind === "flight") {
    const flight = state.flights.find((item) => item.id === selection.id);
    if (!flight) return null;
    const shifted = flight.delayApplied && flight.originalEta !== flight.currentEta;
    const time = shifted ? `${flight.originalEta} → ${flight.currentEta} · +25 min` : flight.currentEta;
    return {
      title: flight.flight,
      lines: [
        flight.route,
        `${flight.type === "arrival" ? "ARR" : "DEP"} ${time}`,
        `Assigned gate ${flight.gate}`,
        flight.id === "sw412" ? "Aircraft on stand C14" : "Inbound to stand C14",
        flight.status,
      ],
    };
  }

  if (selection.id === "C14") {
    return {
      title: "C14",
      lines: [
        conflict.detected && !conflict.approved ? "Both flights need this stand" : "Arrival stand",
        `${inbound?.flight ?? "SW 2847"} · ARR ${inbound?.delayApplied ? `${inbound.originalEta} → ${inbound.currentEta}` : inbound?.currentEta ?? "14:05"}`,
        conflict.approved
          ? `${departure?.flight ?? "SW 412"} is still parked here`
          : `${departure?.flight ?? "SW 412"} · DEP ${departure?.currentEta ?? "14:30"}`,
      ],
    };
  }

  if (selection.id === "C19") {
    if (conflict.approved) {
      return {
        title: "C19 · Confirmed",
        lines: [
          `${departure?.flight ?? "SW 412"} assigned here`,
          "Boarding passes updated on the phones",
          "Aircraft has not left stand C14",
        ],
      };
    }
    if (conflict.detected) {
      return {
        title: "C19 · Proposed",
        lines: [
          conflict.reason || `Open stand for ${departure?.flight ?? "SW 412"}`,
          conflict.rejected ? "Station Ops rejected the proposal" : "Awaiting Station Ops approval",
        ],
      };
    }
    return { title: "C19", lines: ["Available", "Becomes the proposed gate after the delay"] };
  }

  const parked = state.gates.find((gate) => gate.label === selection.id)?.flight;
  return { title: selection.id, lines: [parked ? `${parked} on this gate` : "Available"] };
}

function Occupancy({
  flight,
  kind,
  start,
  end,
  marker,
  proposed = false,
}: {
  flight: string;
  kind: "ARR" | "DEP";
  start: number;
  end: number;
  marker: number;
  proposed?: boolean;
}) {
  return (
    <span
      className={["gate-block", kind === "ARR" ? "is-arrival" : "is-departure", proposed ? "is-proposed" : ""]
        .filter(Boolean)
        .join(" ")}
      style={{ left: leftOf(start), width: widthOf(start, end) }}
      data-testid={proposed ? "proposed-block" : `block-${flight.replace(/\s/g, "")}`}
    >
      <span className="gate-block-label">
        {flight} · {kind}
      </span>
      <span className="gate-block-marker" style={{ left: `${((marker - start) / (end - start)) * 100}%` }} />
    </span>
  );
}
