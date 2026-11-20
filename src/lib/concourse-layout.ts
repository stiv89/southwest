export const CONCOURSE_GATE_IDS = [
  "C10",
  "C11",
  "C12",
  "C13",
  "C14",
  "C15",
  "C16",
  "C17",
  "C18",
  "C19",
] as const;

export type ConcourseGateId = (typeof CONCOURSE_GATE_IDS)[number];

export const WATCH_GATE_IDS: ConcourseGateId[] = ["C14", "C16", "C18", "C19"];

/** Gate positions along Concourse C (scene units). C14 stays aligned with the SW 412 stand. */
export const GATE_X: Record<ConcourseGateId, number> = {
  C10: -49.5,
  C11: -40.5,
  C12: -31.5,
  C13: -22.5,
  C14: -13.5,
  C15: -9,
  C16: -4.5,
  C17: 0,
  C18: 4.5,
  C19: 13.5,
};

export const CONCOURSE_CENTER_X = -18;

export function gateSpanX(ids: ConcourseGateId[]): { min: number; max: number; center: number } {
  const xs = ids.map((id) => GATE_X[id]);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  return { min, max, center: (min + max) / 2 };
}