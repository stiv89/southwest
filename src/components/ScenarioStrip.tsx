import type { DashboardModel } from "../orchestration/dashboard";
import type { SimulationState } from "../lib/simulation/types";

function scenarioCopy(model: DashboardModel, simulation: SimulationState | null): { title: string; detail: string } {
  if (model.selected) {
    return {
      title: `${model.scenarioLabel} · ${model.selected.aircraftId}`,
      detail: model.selected.event,
    };
  }
  if (!simulation) {
    return { title: "Connecting session", detail: "Waiting for the shared incident." };
  }
  const inbound = simulation.flights.find((flight) => flight.id === "sw2847");
  const departure = simulation.flights.find((flight) => flight.id === "sw412");
  if (simulation.gateConflict.approved) {
    return {
      title: `Gate change · ${departure?.flight ?? "SW 412"}`,
      detail: `Departure is boarding at ${departure?.gate ?? "C19"}. Passenger phones already have the new gate.`,
    };
  }
  if (simulation.gateConflict.detected) {
    return {
      title: `Gate overlap · ${inbound?.flight ?? "SW 2847"}`,
      detail: "Inbound delay is published. Station Operations can approve the move from C14 to C19.",
    };
  }
  return {
    title: `Gate overlap · ${inbound?.flight ?? "SW 2847"}`,
    detail: "Simulate a 25-minute inbound delay in Flight Watch to start the gate conflict.",
  };
}

export function ScenarioStrip({
  model,
  simulation,
}: {
  model: DashboardModel;
  simulation: SimulationState | null;
}) {
  const copy = scenarioCopy(model, simulation);
  return (
    <section className="scenario-strip" aria-label="Active scenario" data-testid="scenario-label">
      <strong>{copy.title}</strong>
      <span>{copy.detail}</span>
    </section>
  );
}
