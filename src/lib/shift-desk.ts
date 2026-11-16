import type { DashboardModel } from "../orchestration/dashboard";
import type { DemoSnapshot } from "../types/contracts";

export interface AttentionItem {
  id: string;
  flight: string;
  route: string;
  change: string;
  impact: string;
  owner: string;
  nextAction: string;
  actByLabel: string;
  actByMinutes: number;
  detail: string;
  agentNote: string;
  history: string[];
}

export interface UpcomingFlight {
  id: string;
  flight: string;
  route: string;
  departs: string;
  gate: string;
  status: "On time" | "Needs attention";
}

const BANK: AttentionItem[] = [
  {
    id: "wn-2147",
    flight: "WN 2147",
    route: "MCI → DEN",
    change: "Cambio a puerta B12",
    impact: "18 pasajeros con conexión ajustada",
    owner: "Customer Service",
    nextAction: "Avisar antes de las 07:35",
    actByLabel: "07:35",
    actByMinutes: 7 * 60 + 35,
    detail:
      "El turno de noche movió WN 2147 de B8 a B12 por un inbound tarde. La puerta nueva alarga la caminata hacia las conexiones de DEN.",
    agentNote:
      "Customer Service encontró dos alternativas de rebooking para las conexiones de menos de 35 minutos. Ninguna se ejecutó: falta confirmación de asiento y de la puerta final.",
    history: [
      "06:41 · Gate planning publicó el cambio B8 → B12.",
      "06:45 · Customer Service marcó 18 conexiones ajustadas.",
      "06:52 · Borrador de aviso listo. No enviado.",
    ],
  },
  {
    id: "wn-882",
    flight: "WN 882",
    route: "MCI → DAL",
    change: "Crew de cabina en límite de duty a las 08:10",
    impact: "Salida en riesgo si el inbound pasa de 07:50",
    owner: "Scheduling",
    nextAction: "Confirmar relevo antes de las 07:50",
    actByLabel: "07:50",
    actByMinutes: 7 * 60 + 50,
    detail: "El relevo dejó un crew legal solo si WN 882 sale antes de las 08:10. No hay reserva confirmada en el brief.",
    agentNote: "Scheduling no tiene un crew de reserva verificado. La fila pide una decisión humana, no un swap automático.",
    history: ["06:20 · Duty restante anotado por el turno anterior.", "06:58 · Sin reserva publicada."],
  },
];

const UPCOMING: UpcomingFlight[] = [
  { id: "wn-2147", flight: "WN 2147", route: "MCI → DEN", departs: "07:40", gate: "B12", status: "Needs attention" },
  { id: "wn-1104", flight: "WN 1104", route: "MCI → MDW", departs: "07:55", gate: "B4", status: "On time" },
  { id: "wn-882", flight: "WN 882", route: "MCI → DAL", departs: "08:05", gate: "A18", status: "Needs attention" },
  { id: "wn-441", flight: "WN 441", route: "MCI → PHX", departs: "08:25", gate: "C2", status: "On time" },
  { id: "wn-90", flight: "WN 90", route: "MCI → LAS", departs: "08:40", gate: "C7", status: "On time" },
];

function groundStopItem(model: DashboardModel): AttentionItem | null {
  const selected = model.selected;
  if (!selected) return null;
  return {
    id: "a31-ground-stop",
    flight: selected.aircraftId,
    route: `${selected.origin} → ${selected.airport}`,
    change: "Ground stop en MCI",
    impact: `${selected.passengers} pasajeros · ${selected.connectingPassengers} conexiones · ${selected.wheelchairPassengers} silla de ruedas`,
    owner: "Aircraft / route planning",
    nextAction: `Revisar alternativas antes de ${selected.fuelFlexibilityMinutes} min de flexibilidad`,
    actByLabel: "12:20",
    actByMinutes: 12 * 60 + 20,
    detail: `${selected.event}. ${selected.constraint}`,
    agentNote:
      "Route planning arma candidatos (STL, OMA, DSM, ICT, TUL) sin declarar factibilidad. Customer Service evalúa el impacto de pasajeros después. Nada se desvía desde esta pantalla.",
    history: [
      `${selected.simulatedTime} · Escenario de clase cargado: ${selected.label}.`,
      "Origen del dato: course brief, no telemetría en vivo.",
    ],
  };
}

export function attentionItems(model: DashboardModel): AttentionItem[] {
  const injected = groundStopItem(model);
  const rows = injected ? [injected, ...BANK] : BANK;
  return [...rows].sort((a, b) => a.actByMinutes - b.actByMinutes);
}

export function upcomingFlights(model: DashboardModel): UpcomingFlight[] {
  const selected = model.selected;
  const extra: UpcomingFlight[] = selected
    ? [
        {
          id: "a31-ground-stop",
          flight: selected.aircraftId,
          route: `${selected.origin} → ${selected.airport}`,
          departs: selected.simulatedTime.replace(" PM", "").replace(" AM", ""),
          gate: "—",
          status: "Needs attention",
        },
      ]
    : [];
  return [...extra, ...UPCOMING];
}

export function handoverLine(model: DashboardModel, snapshot: DemoSnapshot): string {
  const base = "2 conexiones en riesgo desde las 06:45.";
  if (!model.selected) return base;
  if (snapshot.phase === "awaiting_decision") {
    return `${base} A31 espera tu revisión: hay una propuesta lista.`;
  }
  if (snapshot.phase === "running") {
    return `${base} Los agentes están trabajando el ground stop de A31.`;
  }
  return `${base} Ground stop MCI cargado para A31 (${model.selected.origin} → MCI).`;
}

export const SHIFT_CLOCK = "07:12";
export const SHIFT_UPDATED = "07:12";
