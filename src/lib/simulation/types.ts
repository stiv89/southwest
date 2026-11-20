export interface WatchFlight {
  id: string;
  flight: string;
  type: "arrival" | "departure";
  route: string;
  gate: string;
  proposedGate: string | null;
  originalEta: string;
  currentEta: string;
  status: string;
  delayApplied: boolean;
}

export interface GateSlot {
  id: string;
  label: string;
  status: "occupied" | "available";
  flight: string | null;
  conflict?: boolean;
}

export interface GateConflict {
  detected: boolean;
  fromGate: string;
  toGate: string;
  reason: string;
  approved: boolean;
  rejected?: boolean;
}

export interface PassengerConnection {
  flight: string;
  route: string;
  gate: string;
  departs: string;
  walkMinutes: number;
  missed?: boolean;
}

export interface FlightOffer {
  flight: string;
  route: string;
  departs: string;
  gate: string;
  seat: string;
}

export interface DemoPassenger {
  id: string;
  assignable?: boolean;
  hasToken?: boolean;
  name: string;
  persona: "terminal" | "connection" | "misconnect";
  flight: string;
  route: string;
  seat: string;
  gate: string;
  boardingGroup: number;
  boardingEnds: string;
  connection: PassengerConnection | null;
  offer: FlightOffer | null;
  offerStatus: "offered" | "accepted" | null;
  alerts: string[];
}

export interface SimulationActivityEvent {
  id: string;
  at: string;
  clock?: string;
  actor?: string;
  message: string;
  detail: string;
}

export interface StationTaskRecord {
  id: string;
  status: "open" | "done";
}

export interface SimulationState {
  sessionId: string;
  revision: number;
  incidentActive: boolean;
  flights: WatchFlight[];
  gates: GateSlot[];
  gateConflict: GateConflict;
  passengers: DemoPassenger[];
  stationTasks: StationTaskRecord[];
  activity: SimulationActivityEvent[];
}