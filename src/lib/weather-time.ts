export type ScenarioClock = number;

export function clockToMinutes(clock: string): ScenarioClock {
  const [hour, minute] = clock.split(":").map((part) => Number.parseInt(part, 10));
  return hour * 60 + minute;
}

export function minutesToClock(minutes: ScenarioClock): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour}:${minute.toString().padStart(2, "0")}`;
}

export const WEATHER_TIMELINE = [
  { minutes: 12 * 60 + 20, label: "Now", id: "now" as const },
  { minutes: 14 * 60, label: "14:00", id: "1400" as const },
  { minutes: 14 * 60 + 30, label: "14:30", id: "1430" as const, eta: true },
  { minutes: 15 * 60, label: "15:00", id: "1500" as const, windShift: true },
] as const;

export type WeatherTimelineId = (typeof WEATHER_TIMELINE)[number]["id"];

export const WEATHER_MIN = WEATHER_TIMELINE[0].minutes;
export const WEATHER_MAX = WEATHER_TIMELINE[WEATHER_TIMELINE.length - 1].minutes;

/** Demo play speed: scenario minutes advanced per real second while playing. */
export const WEATHER_PLAY_RATE = 8;