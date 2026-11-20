import { scenario } from "./mock-data";
import type { DemoRole } from "./shared-case";

export type DeskMode = "normal" | "late" | "ground-stop";
export type FlightTone = "ok" | "attention" | "blocked";
export type FlightFilter = "departures" | "airborne" | "review";

export interface BoardFlight {
  id: string;
  flight: string;
  route: string;
  scheduled: string;
  estimated: string;
  gate: string;
  status: string;
  tone: FlightTone;
  kind: "departure" | "arrival" | "airborne";
  needsReview: boolean;
  sort: number;
  detail: string;
}

export interface AttentionCard {
  id: string;
  flightId: string;
  flight: string;
  reason: string;
  owner: string;
  action: string;
  tone: FlightTone;
}

export interface RecentChange {
  id: string;
  time: string;
  flight: string;
  text: string;
}

export interface GateRevision {
  from: string;
  to: string;
  status: "proposed" | "confirmed";
}

interface Seed {
  id: string;
  flight: string;
  route: string;
  scheduled: string;
  gate: string;
  kind: BoardFlight["kind"];
  sort: number;
}

const DEPARTURES: Seed[] = [
  { id: "wn-1104", flight: "WN 1104", route: "MCI → MDW", scheduled: "12:35", gate: "B4", kind: "departure", sort: 12 * 60 + 35 },
  { id: "wn-882", flight: "WN 882", route: "MCI → DAL", scheduled: "12:50", gate: "A18", kind: "departure", sort: 12 * 60 + 50 },
  { id: "wn-2147", flight: "WN 2147", route: "MCI → DEN", scheduled: "13:05", gate: "B12", kind: "departure", sort: 13 * 60 + 5 },
  { id: "wn-441", flight: "WN 441", route: "MCI → PHX", scheduled: "13:20", gate: "C2", kind: "departure", sort: 13 * 60 + 20 },
  { id: "wn-90", flight: "WN 90", route: "MCI → LAS", scheduled: "13:40", gate: "C7", kind: "departure", sort: 13 * 60 + 40 },
  { id: "wn-318", flight: "WN 318", route: "MCI → BWI", scheduled: "13:55", gate: "B8", kind: "departure", sort: 13 * 60 + 55 },
  { id: "wn-602", flight: "WN 602", route: "MCI → AUS", scheduled: "14:10", gate: "A6", kind: "departure", sort: 14 * 60 + 10 },
  { id: "wn-775", flight: "WN 775", route: "MCI → DEN", scheduled: "14:15", gate: "B16", kind: "departure", sort: 14 * 60 + 15 },
];

const AIRBORNE: Seed[] = [
  { id: "wn-14", flight: "WN 14", route: "MCI → BNA", scheduled: "11:40", gate: "A2", kind: "airborne", sort: 11 * 60 + 40 },
  { id: "wn-88", flight: "WN 88", route: "MCI → STL", scheduled: "11:55", gate: "C1", kind: "airborne", sort: 11 * 60 + 55 },
  { id: "wn-201", flight: "WN 201", route: "MCI → DAL", scheduled: "12:05", gate: "A9", kind: "airborne", sort: 12 * 60 + 5 },
];

function onTime(seed: Seed, detail: string): BoardFlight {
  return {
    ...seed,
    estimated: seed.scheduled,
    status: seed.kind === "airborne" ? "Airborne" : "On time",
    tone: "ok",
    needsReview: false,
    detail,
  };
}

export function buildBoard(mode: DeskMode, gate: GateRevision | null): BoardFlight[] {
  const departures = DEPARTURES.map((seed) =>
    onTime(seed, `${seed.flight} is scheduled on time from gate ${seed.gate}.`),
  );
  const airborne = AIRBORNE.map((seed) => onTime(seed, `${seed.flight} is airborne on ${seed.route}.`));
  const a31Gate = mode === "late" && gate?.status === "confirmed" ? gate.to : "B12";
  const a31: BoardFlight =
    mode === "ground-stop"
      ? {
          id: "a31",
          flight: "A31",
          route: "DEN → MCI",
          scheduled: "12:40",
          estimated: "—",
          gate: "—",
          status: "Needs review",
          tone: "attention",
          kind: "airborne",
          needsReview: true,
          sort: 12 * 60 + 20,
          detail:
            "A31 is airborne from DEN. A ground stop is in effect at MCI. Five alternates are identified and still not verified.",
        }
      : mode === "late"
        ? {
            id: "a31",
            flight: "A31",
            route: "DEN → MCI",
            scheduled: "12:40",
            estimated: "12:50",
            gate: a31Gate,
            status: gate?.status === "confirmed" ? "Delayed · gate confirmed" : "Delayed · gate proposed",
            tone: "attention",
            kind: "arrival",
            needsReview: true,
            sort: 12 * 60 + 50,
            detail:
              gate?.status === "confirmed"
                ? `A31 is 10 minutes late. Station Ops confirmed gate ${gate.to}. The previous gate was ${gate.from}.`
                : "A31 is 10 minutes late. The new estimate overlaps the next occupancy of gate B12. A gate change to B18 is proposed.",
          }
        : {
            id: "a31",
            flight: "A31",
            route: "DEN → MCI",
            scheduled: "12:40",
            estimated: "12:40",
            gate: "B12",
            status: "On time",
            tone: "ok",
            kind: "arrival",
            needsReview: false,
            sort: 12 * 60 + 40,
            detail: "A31 is expected on time at gate B12. No gate conflict.",
          };

  return [...departures, ...airborne, a31].sort((a, b) => a.sort - b.sort);
}

export function summaryCounts(flights: BoardFlight[]): Record<FlightFilter, number> {
  return {
    departures: flights.filter((flight) => flight.kind === "departure").length,
    airborne: flights.filter((flight) => flight.kind === "airborne").length,
    review: flights.filter((flight) => flight.needsReview).length,
  };
}

export function visibleFlights(flights: BoardFlight[], filter: FlightFilter | null): BoardFlight[] {
  if (filter === "departures") return flights.filter((flight) => flight.kind === "departure");
  if (filter === "airborne") return flights.filter((flight) => flight.kind === "airborne");
  if (filter === "review") return flights.filter((flight) => flight.needsReview);
  return flights.filter((flight) => flight.kind !== "airborne" || flight.id === "a31");
}

export function attentionFor(role: DemoRole, mode: DeskMode, gate: GateRevision | null): AttentionCard[] {
  if (mode === "normal") return [];
  if (mode === "ground-stop") {
    if (role === "dispatch") {
      return [
        {
          id: "a31-review",
          flightId: "a31",
          flight: "A31",
          reason: "Airborne during the MCI ground stop. Alternates are not verified.",
          owner: "Dispatch",
          action: "Review A31",
          tone: "attention",
        },
      ];
    }
    if (role === "customer-service") {
      return [
        {
          id: "a31-connections",
          flightId: "a31",
          flight: "A31",
          reason: "42 connections and 3 mobility requests. Destination is not confirmed.",
          owner: "Customer Service",
          action: "Review connections",
          tone: "attention",
        },
      ];
    }
    return [
      {
        id: "a31-station",
        flightId: "a31",
        flight: "A31",
        reason: "Arrival gate cannot be assigned while the ground stop is in effect.",
        owner: "Station Ops",
        action: "Hold gate plan",
        tone: "blocked",
      },
    ];
  }
  if (role === "station-ops" && gate?.status !== "confirmed") {
    return [
      {
        id: "gate-overlap",
        flightId: "a31",
        flight: "A31",
        reason: "ETA 12:50 overlaps the next occupancy of gate B12.",
        owner: "Station Ops",
        action: "Confirm gate change",
        tone: "attention",
      },
    ];
  }
  if (role === "dispatch" && gate?.status === "confirmed") {
    return [
      {
        id: "next-leg",
        flightId: "a31",
        flight: "A31",
        reason: "The arrival delay can move the estimate for the next A31 departure.",
        owner: "Dispatch",
        action: "Review A31",
        tone: "attention",
      },
    ];
  }
  if (role === "customer-service" && gate?.status === "confirmed") {
    return [
      {
        id: "connections",
        flightId: "a31",
        flight: "A31",
        reason: `Gate ${gate.to} is confirmed. Tight connections need a passenger update.`,
        owner: "Customer Service",
        action: "Review connections",
        tone: "attention",
      },
    ];
  }
  return [];
}

export function recentChanges(mode: DeskMode, gate: GateRevision | null): RecentChange[] {
  if (mode === "normal") {
    return [{ id: "open", time: "12:20", flight: "MCI", text: "Shift opened. No disruptions on the next two hours." }];
  }
  if (mode === "ground-stop") {
    return [
      { id: "stop", time: "12:20", flight: "A31", text: "Ground stop at MCI. A31 is airborne from DEN and needs review." },
      {
        id: "facts",
        time: "12:20",
        flight: "A31",
        text: `${scenario.passengers} passengers, ${scenario.connectingPassengers} connections, ${scenario.wheelchairPassengers} wheelchair. Alternates not verified.`,
      },
    ];
  }
  const rows: RecentChange[] = [
    { id: "eta", time: "12:21", flight: "A31", text: "ETA changed from 12:40 to 12:50. Source: simulated arrival update." },
    {
      id: "proposal",
      time: "12:22",
      flight: "A31",
      text: "Gate change B12 → B18 proposed. Owner: Station Ops.",
    },
  ];
  if (gate?.status === "confirmed") {
    rows.unshift({
      id: "confirmed",
      time: "12:24",
      flight: "A31",
      text: `Gate ${gate.to} confirmed by Station Ops. Previous gate ${gate.from}.`,
    });
  }
  return rows;
}

export const SUMMARY_LABEL: Record<FlightFilter, string> = {
  departures: "departures in next 2h",
  airborne: "airborne",
  review: "needs review",
};
