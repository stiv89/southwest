import { useEffect, useState } from "react";
import { scenario } from "./mock-data";

const PINGS = [
  "A31 DEN → MCI is still airborne. The MCI ground stop is in effect.",
  `Track update for A31. ${scenario.passengers} passengers, ${scenario.connectingPassengers} connecting, ${scenario.wheelchairPassengers} wheelchair.`,
  "No destination recorded. STL, OMA, DSM, ICT, and TUL stay Not verified.",
  "A31 fuel flexibility is still the course figure: 55 minutes.",
];

function formatDeskTime(totalSeconds: number): string {
  const bounded = ((totalSeconds % 86400) + 86400) % 86400;
  const hours = Math.floor(bounded / 3600);
  const minutes = Math.floor((bounded % 3600) / 60);
  const seconds = bounded % 60;
  const hour12 = ((hours + 11) % 12) + 1;
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hour12}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} ${suffix}`;
}

export interface LivePing {
  id: string;
  time: string;
  text: string;
}

const START = 12 * 3600 + 20 * 60;

export function useLiveDesk(): { timeLabel: string; events: LivePing[] } {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const count = Math.floor(seconds / 4);
  const events = Array.from({ length: 4 }, (_, index) => {
    const stepsAgo = index;
    const at = START + Math.max(0, seconds - stepsAgo * 4);
    const pingIndex = (count - stepsAgo + PINGS.length * 8) % PINGS.length;
    return {
      id: `${count}-${index}`,
      time: formatDeskTime(at),
      text: PINGS[pingIndex],
    };
  });

  return { timeLabel: formatDeskTime(START + seconds), events };
}
