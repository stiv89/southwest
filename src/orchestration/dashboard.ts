import { assistance, scenario, type ScenarioRecord } from "../lib/mock-data";
import type { DemoSnapshot } from "../types/contracts";

export interface DashboardModel {
  status: "Normal" | "Grounded";
  simulatedTime: string;
  scenarioLabel: string;
  selected: ScenarioRecord | null;
  assistanceReason: string;
}

export function getDashboardModel(snapshot: DemoSnapshot): DashboardModel {
  const selected = snapshot.scenarioId === scenario.id;
  return {
    status: selected ? "Grounded" : "Normal",
    simulatedTime: selected ? `${scenario.dayLabel}, ${scenario.simulatedTime}` : "—",
    scenarioLabel: selected ? scenario.label : "No scenario selected",
    selected: selected ? scenario : null,
    assistanceReason: assistance.reason,
  };
}
