import type { ScenarioClock } from "./weather-time";

export type PrecipIntensity = "light" | "moderate";

type PrecipKeyframe = {
  at: ScenarioClock;
  zones: { intensity: PrecipIntensity; ring: [number, number][] }[];
};

/** Irregular scenario precipitation (moves east toward MCI through the afternoon). */
const KEYFRAMES: PrecipKeyframe[] = [
  {
    at: 12 * 60 + 20,
    zones: [
      {
        intensity: "moderate",
        ring: [
          [38.1, -103.2],
          [38.85, -101.8],
          [39.05, -100.2],
          [38.55, -99.4],
          [37.85, -100.5],
          [37.95, -102.4],
        ],
      },
      {
        intensity: "light",
        ring: [
          [39.5, -104.8],
          [40.1, -103.3],
          [39.7, -102.1],
          [39.0, -102.8],
        ],
      },
    ],
  },
  {
    at: 14 * 60,
    zones: [
      {
        intensity: "moderate",
        ring: [
          [38.55, -100.4],
          [39.2, -98.9],
          [39.45, -97.2],
          [38.85, -96.2],
          [38.2, -97.4],
          [38.25, -99.6],
        ],
      },
      {
        intensity: "light",
        ring: [
          [39.8, -102.0],
          [40.3, -100.5],
          [39.9, -99.1],
          [39.2, -99.9],
        ],
      },
    ],
  },
  {
    at: 14 * 60 + 30,
    zones: [
      {
        intensity: "moderate",
        ring: [
          [39.0, -98.1],
          [39.55, -96.8],
          [39.65, -95.5],
          [39.1, -94.9],
          [38.55, -95.8],
          [38.6, -97.5],
        ],
      },
      {
        intensity: "light",
        ring: [
          [39.9, -99.3],
          [40.2, -98.0],
          [39.75, -97.0],
          [39.25, -97.9],
        ],
      },
    ],
  },
  {
    at: 15 * 60,
    zones: [
      {
        intensity: "light",
        ring: [
          [39.35, -96.2],
          [39.7, -95.2],
          [39.55, -94.5],
          [39.05, -95.0],
          [39.1, -96.0],
        ],
      },
      {
        intensity: "moderate",
        ring: [
          [38.9, -97.8],
          [39.4, -96.9],
          [39.35, -95.8],
          [38.85, -96.5],
        ],
      },
    ],
  },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpRing(a: [number, number][], b: [number, number][], t: number): [number, number][] {
  const count = Math.min(a.length, b.length);
  return Array.from({ length: count }, (_, index) => {
    const from = a[index];
    const to = b[index] ?? a[index];
    return [lerp(from[0], to[0], t), lerp(from[1], to[1], t)] as [number, number];
  });
}

export function precipZonesAt(minute: ScenarioClock): PrecipKeyframe["zones"] {
  if (minute <= KEYFRAMES[0].at) return KEYFRAMES[0].zones;
  for (let index = 1; index < KEYFRAMES.length; index += 1) {
    const prev = KEYFRAMES[index - 1];
    const next = KEYFRAMES[index];
    if (minute <= next.at) {
      const span = next.at - prev.at;
      const t = span > 0 ? (minute - prev.at) / span : 0;
      const pairs = Math.max(prev.zones.length, next.zones.length);
      return Array.from({ length: pairs }, (_, zoneIndex) => {
        const from = prev.zones[zoneIndex] ?? prev.zones[prev.zones.length - 1];
        const to = next.zones[zoneIndex] ?? next.zones[next.zones.length - 1];
        return {
          intensity: minute - prev.at > (next.at - prev.at) / 2 ? to.intensity : from.intensity,
          ring: lerpRing(from.ring, to.ring, t),
        };
      });
    }
  }
  return KEYFRAMES[KEYFRAMES.length - 1].zones;
}