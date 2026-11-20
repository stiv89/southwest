import type { SimulationState } from "../../lib/simulation/types";

export interface StationTaskRow {
  id: string;
  title: string;
  status: "Open" | "Ready" | "Done" | "Waiting";
  nextStep: string;
  completable: boolean;
}

export function stationTasksFromState(state: SimulationState): StationTaskRow[] {
  const { gateConflict } = state;
  const signageDone = state.stationTasks?.find((t) => t.id === "signage")?.status === "done";
  const rampDone = state.stationTasks?.find((t) => t.id === "ramp")?.status === "done";

  return [
    {
      id: "watch-conflict",
      title: "Monitor C14 for overlap",
      status: gateConflict.detected ? "Done" : "Waiting",
      nextStep: "Dispatch simulates inbound delay on SW 2847.",
      completable: false,
    },
    {
      id: "approve-gate",
      title: "Approve gate change to C19",
      status: gateConflict.approved ? "Done" : gateConflict.detected ? "Ready" : "Waiting",
      nextStep: gateConflict.detected
        ? "Use Gate Map · Approve Gate Change."
        : "Waiting for overlap detection.",
      completable: false,
    },
    {
      id: "signage",
      title: "Update FIDS and gate signage",
      status: signageDone ? "Done" : gateConflict.approved ? "Ready" : "Waiting",
      nextStep: "Push new gate to terminal displays after approval.",
      completable: gateConflict.approved && !signageDone,
    },
    {
      id: "ramp",
      title: "Brief ramp crew",
      status: rampDone ? "Done" : gateConflict.detected ? "Ready" : "Waiting",
      nextStep: "Confirm equipment move before push.",
      completable: gateConflict.detected && !rampDone,
    },
  ];
}

export function StationTasks({
  state,
  onCompleteTask,
}: {
  state: SimulationState;
  onCompleteTask: (taskId: string) => void;
}) {
  const rows = stationTasksFromState(state);

  return (
    <section className="card card--panel dept-screen" aria-labelledby="station-tasks-heading">
      <header className="dept-screen-head">
        <h2 id="station-tasks-heading">Tasks</h2>
        <p className="lede">Station Ops checklist for the SW 412 gate incident</p>
      </header>

      <ul className="station-task-list" data-testid="station-tasks">
        {rows.map((task) => (
          <li key={task.id} className={task.status === "Done" ? "is-done" : undefined}>
            <div className="station-task-copy">
              <strong>{task.title}</strong>
              <span className={`task-pill status-${task.status.toLowerCase()}`}>{task.status}</span>
              <p>{task.nextStep}</p>
            </div>
            {task.completable ? (
              <button type="button" className="btn btn-secondary" onClick={() => onCompleteTask(task.id)}>
                Mark complete
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}