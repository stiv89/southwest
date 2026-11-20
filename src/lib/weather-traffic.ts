import type { SimulationState } from "./simulation/types";
import { clockToMinutes, type ScenarioClock } from "./weather-time";

export type LatLng = [number, number];

export type RegionalFlight = {
  id: string;
  flight: string;
  route: string;
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  departMin: ScenarioClock;
  arriveMin: ScenarioClock;
  /** On ground at origin before depart, or at destination after arrive. */
  ground: "origin" | "destination" | null;
  groundLabel?: string;
  status: string;
  etaLabel: string;
  simulationId?: "sw2847" | "sw412";
  simulated?: boolean;
};

export const AIRPORTS = {
  DEN: [39.8561, -104.6737] as LatLng,
  MCI: [39.2976, -94.7139] as LatLng,
  STL: [38.7487, -90.37] as LatLng,
  OMA: [41.3032, -95.8941] as LatLng,
  MDW: [41.7868, -87.7522] as LatLng,
  DAL: [32.8471, -96.8518] as LatLng,
  AUS: [30.1975, -97.6664] as LatLng,
  PHX: [33.4342, -112.0116] as LatLng,
  LAS: [36.084, -115.1537] as LatLng,
  BNA: [36.1245, -86.6782] as LatLng,
};

function baseTraffic(): RegionalFlight[] {
  const { DEN, MCI, STL, OMA, MDW, DAL, AUS, PHX, LAS, BNA } = AIRPORTS;
  return [
    {
      id: "sw2847",
      flight: "SW 2847",
      route: "DEN → MCI",
      origin: DEN,
      destination: MCI,
      departMin: clockToMinutes("13:35"),
      arriveMin: clockToMinutes("14:30"),
      ground: "origin",
      status: "En route",
      etaLabel: "14:30",
      simulationId: "sw2847",
      simulated: true,
    },
    {
      id: "sw412",
      flight: "SW 412",
      route: "MCI → DEN",
      origin: MCI,
      destination: DEN,
      departMin: clockToMinutes("14:55"),
      arriveMin: clockToMinutes("15:55"),
      ground: "origin",
      groundLabel: "Boarding · C19",
      status: "Boarding",
      etaLabel: "14:55",
      simulationId: "sw412",
      simulated: true,
    },
    {
      id: "sw1206",
      flight: "SW 1206",
      route: "DEN → PHX",
      origin: DEN,
      destination: PHX,
      departMin: clockToMinutes("12:05"),
      arriveMin: clockToMinutes("13:35"),
      ground: null,
      status: "En route",
      etaLabel: "13:35",
    },
    {
      id: "sw933",
      flight: "SW 933",
      route: "MCI → STL",
      origin: MCI,
      destination: STL,
      departMin: clockToMinutes("12:40"),
      arriveMin: clockToMinutes("13:25"),
      ground: null,
      status: "En route",
      etaLabel: "13:25",
    },
    {
      id: "sw445",
      flight: "SW 445",
      route: "STL → MCI",
      origin: STL,
      destination: MCI,
      departMin: clockToMinutes("13:15"),
      arriveMin: clockToMinutes("14:05"),
      ground: null,
      status: "En route",
      etaLabel: "14:05",
    },
    {
      id: "sw2101",
      flight: "SW 2101",
      route: "MCI → DAL",
      origin: MCI,
      destination: DAL,
      departMin: clockToMinutes("13:50"),
      arriveMin: clockToMinutes("15:40"),
      ground: null,
      status: "En route",
      etaLabel: "15:40",
    },
    {
      id: "sw88",
      flight: "SW 88",
      route: "DAL → MCI",
      origin: DAL,
      destination: MCI,
      departMin: clockToMinutes("11:45"),
      arriveMin: clockToMinutes("13:20"),
      ground: "destination",
      status: "Arrived",
      etaLabel: "13:20",
    },
    {
      id: "sw302",
      flight: "SW 302",
      route: "OMA → DEN",
      origin: OMA,
      destination: DEN,
      departMin: clockToMinutes("13:00"),
      arriveMin: clockToMinutes("14:05"),
      ground: null,
      status: "En route",
      etaLabel: "14:05",
    },
    {
      id: "sw671",
      flight: "SW 671",
      route: "DEN → LAS",
      origin: DEN,
      destination: LAS,
      waypoints: [[39.2, -106.5]],
      departMin: clockToMinutes("13:10"),
      arriveMin: clockToMinutes("14:35"),
      ground: null,
      status: "En route",
      etaLabel: "14:35",
    },
    {
      id: "sw155",
      flight: "SW 155",
      route: "MCI → BNA",
      origin: MCI,
      destination: BNA,
      departMin: clockToMinutes("12:55"),
      arriveMin: clockToMinutes("14:50"),
      ground: null,
      status: "En route",
      etaLabel: "14:50",
    },
    {
      id: "sw718",
      flight: "SW 718",
      route: "MCI → MDW",
      origin: MCI,
      destination: MDW,
      departMin: clockToMinutes("14:10"),
      arriveMin: clockToMinutes("15:35"),
      ground: "origin",
      status: "Taxi",
      etaLabel: "15:35",
    },
    {
      id: "sw902",
      flight: "SW 902",
      route: "MDW → MCI",
      origin: MDW,
      destination: MCI,
      departMin: clockToMinutes("12:30"),
      arriveMin: clockToMinutes("13:55"),
      ground: null,
      status: "En route",
      etaLabel: "13:55",
    },
    {
      id: "sw441",
      flight: "SW 441",
      route: "MCI → AUS",
      origin: MCI,
      destination: AUS,
      departMin: clockToMinutes("13:25"),
      arriveMin: clockToMinutes("15:55"),
      ground: null,
      status: "En route",
      etaLabel: "15:55",
    },
    {
      id: "sw288",
      flight: "SW 288",
      route: "AUS → MCI",
      origin: AUS,
      destination: MCI,
      departMin: clockToMinutes("11:30"),
      arriveMin: clockToMinutes("14:00"),
      ground: null,
      status: "En route",
      etaLabel: "14:00",
    },
    {
      id: "sw118",
      flight: "SW 118",
      route: "DEN → MCI",
      origin: DEN,
      destination: MCI,
      departMin: clockToMinutes("14:20"),
      arriveMin: clockToMinutes("16:05"),
      ground: "origin",
      status: "Boarding",
      etaLabel: "16:05",
    },
  ];
}

export function buildRegionalTraffic(state: SimulationState): RegionalFlight[] {
  const flights = baseTraffic();
  const inbound = state.flights.find((f) => f.id === "sw2847");
  const outbound = state.flights.find((f) => f.id === "sw412");
  return flights.map((flight) => {
    if (flight.simulationId === "sw2847" && inbound) {
      const arriveMin = clockToMinutes(inbound.currentEta);
      const departMin = arriveMin - 55;
      return {
        ...flight,
        arriveMin,
        departMin,
        status: inbound.delayApplied ? "Delayed · En route" : "En route",
        etaLabel: inbound.currentEta,
      };
    }
    if (flight.simulationId === "sw412" && outbound) {
      const gate = outbound.gate;
      return {
        ...flight,
        groundLabel: outbound.status.includes("Boarding") ? `Boarding · ${gate}` : `On gate · ${gate}`,
        status: outbound.status.split(" ·")[0] ?? "Boarding",
        route: outbound.route,
      };
    }
    return flight;
  });
}

export function pathPoints(flight: RegionalFlight): LatLng[] {
  return [flight.origin, ...(flight.waypoints ?? []), flight.destination];
}

function segmentLengths(points: LatLng[]): number[] {
  const lengths: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    lengths.push(Math.hypot(dx, dy));
  }
  return lengths;
}

export type FlightPose = {
  position: LatLng;
  bearing: number;
  airborne: boolean;
  groundLabel?: string;
  atAirport: "origin" | "destination" | null;
};

export function flightPoseAt(flight: RegionalFlight, minute: ScenarioClock): FlightPose | null {
  if (minute < flight.departMin) {
    if (flight.ground === "origin") {
      return {
        position: flight.origin,
        bearing: bearing(flight.origin, flight.destination),
        airborne: false,
        groundLabel: flight.groundLabel,
        atAirport: "origin",
      };
    }
    return null;
  }
  if (minute >= flight.arriveMin) {
    if (flight.ground === "destination" || flight.status.startsWith("Arrived")) {
      return {
        position: flight.destination,
        bearing: bearing(flight.origin, flight.destination),
        airborne: false,
        atAirport: "destination",
      };
    }
    return {
      position: flight.destination,
      bearing: bearing(flight.origin, flight.destination),
      airborne: false,
      atAirport: "destination",
    };
  }

  const points = pathPoints(flight);
  const lengths = segmentLengths(points);
  const total = lengths.reduce((sum, value) => sum + value, 0);
  const progress = Math.min(1, Math.max(0, (minute - flight.departMin) / Math.max(1, flight.arriveMin - flight.departMin)));
  let cursor = total * progress;
  for (let index = 0; index < lengths.length; index += 1) {
    const len = lengths[index];
    if (cursor <= len || index === lengths.length - 1) {
      const from = points[index];
      const to = points[index + 1];
      const t = len > 0 ? cursor / len : 0;
      const position: LatLng = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
      const lookAhead: LatLng = t > 0.85 ? to : [from[0] + (to[0] - from[0]) * Math.min(1, t + 0.08), from[1] + (to[1] - from[1]) * Math.min(1, t + 0.08)];
      return {
        position,
        bearing: bearing(position, lookAhead),
        airborne: true,
        atAirport: null,
      };
    }
    cursor -= len;
  }
  const last = points[points.length - 1];
  return { position: last, bearing: bearing(points[0], last), airborne: true, atAirport: null };
}

export function bearing(origin: LatLng, destination: LatLng): number {
  const lat1 = (origin[0] * Math.PI) / 180;
  const lat2 = (destination[0] * Math.PI) / 180;
  const dLng = ((destination[1] - origin[1]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

export function routeProgressPoints(flight: RegionalFlight, minute: ScenarioClock): { flown: LatLng[]; remaining: LatLng[] } {
  const pose = flightPoseAt(flight, minute);
  if (!pose || !pose.airborne) {
    return { flown: [], remaining: pathPoints(flight) };
  }
  const points = pathPoints(flight);
  const lengths = segmentLengths(points);
  const total = lengths.reduce((sum, value) => sum + value, 0);
  const progress = Math.min(1, Math.max(0, (minute - flight.departMin) / Math.max(1, flight.arriveMin - flight.departMin)));
  let cursor = total * progress;
  const flown: LatLng[] = [points[0]];
  for (let index = 0; index < lengths.length; index += 1) {
    const len = lengths[index];
    const from = points[index];
    const to = points[index + 1];
    if (cursor <= len) {
      const t = len > 0 ? cursor / len : 0;
      flown.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
      return { flown, remaining: [flown[flown.length - 1], ...points.slice(index + 1)] };
    }
    cursor -= len;
    flown.push(to);
  }
  return { flown: points, remaining: [points[points.length - 1]] };
}