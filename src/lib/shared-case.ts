import { diversion } from "./mock-data";

export type DemoRole = "station-ops" | "dispatch" | "customer-service";

export interface RecordedDestination {
  code: string;
  name: string;
}

export interface SharedCaseState {
  recordedDestination: RecordedDestination | null;
}

export type TaskOwner = DemoRole | "communications";
export type TaskStatus = "Open" | "Waiting" | "Done" | "Draft";

export interface SharedTask {
  id: string;
  owner: TaskOwner;
  ownerLabel: string;
  title: string;
  status: TaskStatus;
  nextStep: string;
}

export const ROLES: { id: DemoRole; label: string; initials: string }[] = [
  { id: "station-ops", label: "Station Ops", initials: "SO" },
  { id: "dispatch", label: "Dispatch", initials: "DI" },
  { id: "customer-service", label: "Customer Service", initials: "CS" },
];

export const ROLE_LABEL: Record<DemoRole, string> = {
  "station-ops": "Station Ops",
  dispatch: "Dispatch",
  "customer-service": "Customer Service",
};

export const ROUTE_PLANNING_RESULT = "Route Planning · 5 alternates identified · verification pending";

export function emptySharedCase(): SharedCaseState {
  return { recordedDestination: null };
}

export function recordDestination(state: SharedCaseState, code: string): SharedCaseState {
  const candidate = diversion.candidates.find((item) => item.airport === code);
  if (!candidate || state.recordedDestination) return state;
  return { recordedDestination: { code: candidate.airport, name: candidate.name } };
}

export function caseTasks(state: SharedCaseState): SharedTask[] {
  const dest = state.recordedDestination;
  return [
    {
      id: "dispatch-review",
      owner: "dispatch",
      ownerLabel: "Dispatch",
      title: dest ? `Destination recorded · ${dest.code}` : "Airborne · Review needed",
      status: dest ? "Done" : "Open",
      nextStep: dest
        ? "The record is shared. Station, Customer Service, and Communications have the update."
        : "Review the ground-stop restriction, the unverified alternates, and the data still missing.",
    },
    {
      id: "cs-passengers",
      owner: "customer-service",
      ownerLabel: "Customer Service",
      title: dest ? `Adjust options for ${dest.code}` : "42 connections to review · 3 mobility assists",
      status: "Open",
      nextStep: dest
        ? `Adjust rebooking options for ${dest.code}. Dispatch recorded the destination.`
        : "Prepare rebooking options and coordinate assistance while the destination is unconfirmed.",
    },
    {
      id: "station-arrival",
      owner: "station-ops",
      ownerLabel: "Station Ops",
      title: dest ? `Arrival preparation · ${dest.code}` : "Arrival preparation",
      status: dest ? "Open" : "Waiting",
      nextStep: dest
        ? `Confirm gate, staff, and ground assistance at ${dest.code}.`
        : "Waiting for a recorded destination before gate, staff, and ground assistance can be tasked.",
    },
    {
      id: "comms-draft",
      owner: "communications",
      ownerLabel: "Communications",
      title: "Passenger update · Draft",
      status: "Draft",
      nextStep: dest
        ? `Update the draft with ${dest.code}. A person must approve the message before it is sent.`
        : "Draft only from confirmed facts. A person must approve the message before it is sent.",
    },
  ];
}

export function myTasks(role: DemoRole, state: SharedCaseState): SharedTask[] {
  return caseTasks(state).filter((task) => task.owner === role);
}

export function changesFor(role: DemoRole, state: SharedCaseState): string {
  const dest = state.recordedDestination;
  if (!dest) {
    if (role === "dispatch") return "Ground stop at MCI. No destination has been recorded.";
    if (role === "customer-service") return "No destination recorded yet. Rebooking stays provisional.";
    return "Arrival preparation is waiting on a recorded destination.";
  }
  if (role === "dispatch") {
    return `You recorded ${dest.code}. Customer Service can adjust options. Station Ops has an arrival task.`;
  }
  if (role === "customer-service") {
    return `Dispatch recorded ${dest.code}. Adjust rebooking options for the confirmed destination.`;
  }
  return `Dispatch recorded ${dest.code}. Confirm gate, staff, and ground assistance there.`;
}
