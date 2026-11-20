import { useEffect, useMemo, useState } from "react";
import { CONCOURSE_GATE_IDS, type ConcourseGateId } from "../../lib/concourse-layout";
import type { SimulationState } from "../../lib/simulation/types";
import {
  RampScene,
  type GateLabel,
  type RampCameraFocus,
  type RampMapView,
  type RampSelection,
} from "./RampScene";

function buildGateMapLabels(state: SimulationState): GateLabel[] {
  const { gates, gateConflict, flights } = state;
  const departure = flights.find((flight) => flight.id === "sw412");
  const inbound = flights.find((flight) => flight.id === "sw2847");

  return CONCOURSE_GATE_IDS.map((id) => {
    const slot = gates.find((gate) => gate.label === id);
    let tone: GateLabel["tone"] = "idle";
    if (id === "C14" && gateConflict.detected && !gateConflict.approved) tone = "amber";
    if (id === "C19" && gateConflict.detected && !gateConflict.approved) tone = "proposed";
    if (id === "C19" && gateConflict.approved) tone = "confirmed";

    let detail = slot?.status === "occupied" ? slot.flight ?? "Occupied" : "Available";
    if (id === "C14" && gateConflict.detected) {
      detail = inbound?.delayApplied ? `${inbound.flight} · overlap` : slot?.flight ?? detail;
    }
    if (id === "C19" && gateConflict.detected && !gateConflict.approved) {
      detail = `Proposed · ${departure?.flight ?? "SW 412"}`;
    }
    if (id === "C19" && gateConflict.approved) {
      detail = `Assigned · ${departure?.flight ?? "SW 412"}`;
    }
    return { id, detail, tone };
  });
}

function panelForGate(
  gateId: ConcourseGateId,
  state: SimulationState,
): { title: string; lines: string[]; showProposal: boolean } {
  const { gateConflict, flights, gates } = state;
  const departure = flights.find((flight) => flight.id === "sw412");
  const inbound = flights.find((flight) => flight.id === "sw2847");
  const slot = gates.find((gate) => gate.label === gateId);
  const boarding = departure?.status?.includes("Boarding") ? "Boarding" : departure?.status ?? "Boarding";

  if (gateId === "C19" && gateConflict.detected && !gateConflict.approved) {
    return {
      title: "Gate change proposal",
      lines: [
        `${departure?.flight ?? "SW 412"} · ${gateConflict.fromGate} → ${gateConflict.toGate}`,
        "Available for the proposed boarding window · 14:25–14:55",
        `${departure?.flight ?? "SW 412"} · ${boarding}`,
        "Aircraft remains on stand C14 until a transfer is recorded.",
        gateConflict.reason,
      ],
      showProposal: true,
    };
  }

  if (gateId === "C14" && gateConflict.detected) {
    return {
      title: "Stand conflict",
      lines: [
        `${inbound?.flight ?? "SW 2847"} arrival overlaps ${departure?.flight ?? "SW 412"} boarding`,
        `${departure?.flight ?? "SW 412"} on stand C14 · assigned gate ${departure?.gate ?? "C14"}`,
        "Select C19 to review the proposed move.",
      ],
      showProposal: false,
    };
  }

  if (gateConflict.approved && gateId === "C19") {
    return {
      title: "Assigned gate",
      lines: [
        `${departure?.flight ?? "SW 412"} boards at C19`,
        "Boarding passes updated on passenger phones.",
        "Aircraft still visible on stand C14.",
      ],
      showProposal: false,
    };
  }

  return {
    title: gateId,
    lines: [slot?.status === "occupied" ? `${slot.flight} on this stand` : "Stand available", "Touch another gate to compare space."],
    showProposal: false,
  };
}

export function GateMap({
  state,
  onApproveGateChange,
  onRejectGateChange,
}: {
  state: SimulationState;
  onApproveGateChange: () => void;
  onRejectGateChange: () => void;
}) {
  const { gateConflict, flights } = state;
  const departure = flights.find((flight) => flight.id === "sw412");
  const [mapView, setMapView] = useState<RampMapView>("3d");
  const [selection, setSelection] = useState<RampSelection | null>(null);
  const [frameToken, setFrameToken] = useState(0);

  const labels = useMemo(() => buildGateMapLabels(state), [state]);

  useEffect(() => {
    if (!gateConflict.detected) return;
    setSelection({ kind: "gate", id: "C19" });
    setFrameToken((value) => value + 1);
  }, [gateConflict.detected, gateConflict.approved]);

  const cameraFocus: RampCameraFocus = useMemo(() => {
    if (!gateConflict.detected || gateConflict.approved) return "overview";
    if (selection?.kind === "gate" && (selection.id === "C14" || selection.id === "C19")) return "pair";
    return "overview";
  }, [selection, gateConflict.approved, gateConflict.detected]);

  const selectedGate = selection?.kind === "gate" ? selection.id : null;
  const panel = selectedGate ? panelForGate(selectedGate, state) : null;
  const aircraftCaption =
    gateConflict.approved && departure?.gate === "C19"
      ? "Assigned C19 · on stand C14"
      : "On stand C14";

  return (
    <section className="page-screen gate-map-screen" aria-labelledby="gate-map-heading">
      <header className="page-heading page-heading--split">
        <div>
          <h2 id="gate-map-heading">Gate Map</h2>
          <p>Concourse C · C10 to C19</p>
        </div>
        <div className="gate-map-view-toggle" role="group" aria-label="Map view">
          <button
            type="button"
            className={mapView === "top" ? "is-active" : undefined}
            aria-pressed={mapView === "top"}
            onClick={() => {
              setMapView("top");
              setFrameToken((value) => value + 1);
            }}
            data-testid="gate-map-top"
          >
            Top view
          </button>
          <button
            type="button"
            className={mapView === "3d" ? "is-active" : undefined}
            aria-pressed={mapView === "3d"}
            onClick={() => {
              setMapView("3d");
              setFrameToken((value) => value + 1);
            }}
            data-testid="gate-map-3d"
          >
            3D
          </button>
        </div>
      </header>

      <div className="gate-map-stage" data-testid="gate-map">
        <div className="gate-map-scene">
          <RampScene
            mode="gate-map"
            mapView={mapView}
            cameraFocus={cameraFocus}
            frameToken={frameToken}
            labels={labels}
            arrivalLabel="ARR inbound"
            aircraftCaption={aircraftCaption}
            showFlightTags={false}
            visibleGateIds={[...CONCOURSE_GATE_IDS]}
            selection={selection}
            onSelect={(next) => {
              setSelection(next);
              setFrameToken((value) => value + 1);
            }}
          />
        </div>

        <aside className="gate-map-side" data-testid="gate-map-panel">
          {panel ? (
            <>
              <h3>{panel.title}</h3>
              {selectedGate ? (
                <p className="gate-map-gate-kicker">{selectedGate}</p>
              ) : null}
              <ul className="gate-map-detail">
                {panel.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              {panel.showProposal ? (
                <div className="gate-proposal" data-testid="gate-proposal">
                  <p data-testid="gate-proposal-status">
                    {departure?.flight} · {departure?.status?.includes("Boarding") ? "Boarding" : departure?.status}
                  </p>
                  {gateConflict.rejected ? (
                    <p data-testid="gate-proposal-rejected">
                      Proposal rejected. SW 412 stays at C14 until this proposal is approved.
                    </p>
                  ) : null}
                  <div className="gate-proposal-actions">
                    <button type="button" className="btn btn-primary" onClick={onApproveGateChange} data-testid="approve-gate">
                      Approve gate change
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onRejectGateChange}
                      disabled={gateConflict.rejected}
                      data-testid="reject-gate"
                    >
                      {gateConflict.rejected ? "Proposal rejected" : "Reject proposal"}
                    </button>
                  </div>
                </div>
              ) : gateConflict.approved && selectedGate === "C19" ? (
                <p className="gate-approved" data-testid="gate-approved">
                  Gate change approved. {departure?.flight} boarding at C19. Boarding passes updated.
                </p>
              ) : null}
            </>
          ) : (
            <p className="source-line">Select a gate on the map to review stand use and proposals.</p>
          )}

          {!gateConflict.detected ? (
            <p className="source-line">No gate conflict yet. Dispatch can simulate inbound delay to trigger overlap.</p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}