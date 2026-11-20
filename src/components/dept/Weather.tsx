import { useEffect, useMemo, useState } from "react";
import type { SimulationState } from "../../lib/simulation/types";
import { buildRegionalTraffic } from "../../lib/weather-traffic";
import {
  minutesToClock,
  WEATHER_MAX,
  WEATHER_MIN,
  WEATHER_PLAY_RATE,
  WEATHER_TIMELINE,
  type ScenarioClock,
} from "../../lib/weather-time";
import { RouteMap } from "./RouteMap";

type StationSnap = {
  visibility: string;
  ceiling: string;
  windDirection: number | null;
  windSpeedKt: number;
  windGustKt: number | null;
};

type ForecastPeriod = {
  from: string;
  to: string;
  summary: string;
  windShift: boolean;
  lowVisibility: boolean;
  storms: boolean;
};

type WeatherReport = StationSnap & {
  stale?: boolean;
  observedAt: string;
  flightCategory: string;
  periods: ForecastPeriod[];
  den?: StationSnap | null;
};

type Conditions = {
  wind: string;
  visibility: string;
  ceiling: string;
};

const SCENARIO_NOW: Conditions = {
  wind: "240° 12 kt",
  visibility: "10 sm",
  ceiling: "BKN 4,500 ft",
};

const SCENARIO_ARRIVAL: Conditions = {
  wind: "240° 12 kt",
  visibility: "10 sm",
  ceiling: "BKN 4,500 ft",
};

const SCENARIO_LATER: Conditions = {
  wind: "280° 18 kt",
  visibility: "10 sm",
  ceiling: "SCT 8,000 ft",
};

function conditionsAt(minute: ScenarioClock): Conditions {
  if (minute >= 15 * 60) return SCENARIO_LATER;
  if (minute >= 14 * 60 + 30) return SCENARIO_ARRIVAL;
  return SCENARIO_NOW;
}

function windLine(station: StationSnap): string {
  const direction = station.windDirection == null ? "Variable" : `${station.windDirection}°`;
  const gust = station.windGustKt ? ` G${station.windGustKt}` : "";
  return `${direction} ${station.windSpeedKt} kt${gust}`;
}

export function Weather({
  state,
  onOpenFlightWatch,
}: {
  state: SimulationState;
  onOpenFlightWatch: (flightId?: string) => void;
}) {
  const [mode, setMode] = useState<"scenario" | "live">("scenario");
  const [live, setLive] = useState<WeatherReport | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [flightId, setFlightId] = useState("sw2847");
  const [scenarioMinute, setScenarioMinute] = useState<ScenarioClock>(WEATHER_MIN);
  const [playing, setPlaying] = useState(false);
  const [frameToken, setFrameToken] = useState(0);

  const traffic = useMemo(() => buildRegionalTraffic(state), [state]);
  const selected = traffic.find((flight) => flight.id === flightId) ?? traffic[0];
  const liveMode = mode === "live";

  useEffect(() => {
    if (!liveMode) return;
    let cancelled = false;
    setLoading(true);
    setLiveError(null);
    void fetch("/api/weather/kmci")
      .then(async (response) => {
        const body = (await response.json()) as WeatherReport & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Live weather is unavailable.");
        return body;
      })
      .then((report) => {
        if (!cancelled) setLive(report);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLiveError(error instanceof Error ? error.message : "Live weather is unavailable.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [liveMode]);

  useEffect(() => {
    if (!playing || liveMode) return;
    const tick = window.setInterval(() => {
      setScenarioMinute((current) => {
        const next = Math.min(WEATHER_MAX, current + WEATHER_PLAY_RATE / 2);
        if (next >= WEATHER_MAX) setPlaying(false);
        return next;
      });
    }, 500);
    return () => window.clearInterval(tick);
  }, [playing, liveMode]);

  function chooseFlight(id: string) {
    setFlightId(id);
    setFrameToken((value) => value + 1);
  }

  function chooseMode(next: "scenario" | "live") {
    setMode(next);
    setPlaying(false);
    setFrameToken((value) => value + 1);
  }

  function snapTime(minutes: ScenarioClock) {
    setScenarioMinute(minutes);
    setPlaying(false);
    setFrameToken((value) => value + 1);
  }

  const nowConditions = liveMode && live
    ? { wind: windLine(live), visibility: live.visibility, ceiling: live.ceiling }
    : SCENARIO_NOW;
  const arrivalConditions = liveMode && live ? arrivalFromLive(live) : conditionsAt(scenarioMinute);

  const liveSource =
    liveMode && live ? `Live layer · KMCI · observed ${new Date(live.observedAt).toLocaleTimeString()}` : null;

  const panelStatus = selected?.simulationId
    ? state.flights.find((flight) => flight.id === selected.simulationId)?.status ?? selected.status
    : selected?.status;

  return (
    <section className="page-screen wx-screen" aria-labelledby="weather-heading">
      <header className="page-heading page-heading--split">
        <div>
          <h2 id="weather-heading">Weather</h2>
          <p>Regional traffic · {selected?.flight ?? "SW 2847"}</p>
        </div>
        <div className="mode-switch" role="group" aria-label="Weather source">
          <button type="button" aria-pressed={mode === "scenario"} onClick={() => chooseMode("scenario")}>
            Scenario
          </button>
          <button type="button" aria-pressed={mode === "live"} onClick={() => chooseMode("live")}>
            Live
          </button>
        </div>
      </header>

      <div className="wx-stage">
        <div className="wx-map-wrap" data-testid="weather-map">
          <RouteMap
            state={state}
            live={liveMode}
            scenarioMinute={scenarioMinute}
            selectedId={flightId}
            onSelectFlight={chooseFlight}
            frameToken={frameToken}
            liveSourceLine={liveSource}
          />
          {liveMode ? null : <MotionLegend />}
          {liveMode ? null : (
            <div className="wx-scrubber" data-testid="weather-timebar" role="group" aria-label="Scenario time">
              <button
                type="button"
                className="wx-play"
                data-testid="weather-play"
                aria-pressed={playing}
                onClick={() => setPlaying((value) => !value)}
              >
                {playing ? "Pause" : "Play"}
              </button>
              <span className="wx-play-rate">{WEATHER_PLAY_RATE} min/s</span>
              <div className="wx-scrub-track">
                {WEATHER_TIMELINE.map((slot) => {
                  const active = Math.abs(scenarioMinute - slot.minutes) < 4;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      className={[
                        "wx-scrub-tick",
                        "eta" in slot && slot.eta ? "is-eta" : "",
                        "windShift" in slot && slot.windShift ? "is-shift" : "",
                        active ? "is-active" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      data-testid={`weather-time-${slot.id}`}
                      onClick={() => snapTime(slot.minutes)}
                    >
                      <span>{slot.label}</span>
                      {"eta" in slot && slot.eta ? <em>ETA</em> : null}
                      {"windShift" in slot && slot.windShift ? <em>Wind</em> : null}
                    </button>
                  );
                })}
              </div>
              <span className="wx-scrub-clock">{minutesToClock(scenarioMinute)}</span>
            </div>
          )}
        </div>

        <aside className="wx-panel" data-testid="weather-panel">
          <h3 className="wx-flight-title">
            {selected?.flight} · {selected?.route}
          </h3>
          <p className="wx-flight-status">
            {panelStatus} · ETA <strong>{selected?.etaLabel}</strong>
          </p>

          {liveMode && loading && !live ? <p className="source-line">Requesting the latest observation…</p> : null}
          {liveMode && liveError && !live ? <p className="source-line">{liveError}</p> : null}

          <div className="wx-mci-grid" data-testid="weather-arrival">
            <div>
              <p className="wx-mci-label">MCI · Now</p>
              <ConditionList conditions={nowConditions} />
            </div>
            <div>
              <p className="wx-mci-label">MCI · At arrival</p>
              <ConditionList conditions={arrivalConditions} />
            </div>
          </div>

          <div className="wx-next-change" data-testid="weather-time-note">
            <p className="wx-mci-label">Next change</p>
            <p>
              <strong>15:00</strong> · Wind shifts to <strong>280° at 18 kt</strong>
            </p>
            <p className="source-line">30 min after SW 2847 ETA.</p>
          </div>

          <button
            type="button"
            className="wx-open"
            data-testid="open-flight-watch"
            onClick={() => onOpenFlightWatch(selected?.simulationId ?? "sw2847")}
          >
            Open in Flight Watch
          </button>
          {liveMode && live?.stale ? <p className="source-line">Observation may be outdated.</p> : null}
        </aside>
      </div>
    </section>
  );
}

function MotionLegend() {
  return (
    <div className="wx-legend" aria-label="Precipitation legend">
      <span className="wx-legend__item is-moderate">Moderate</span>
      <span className="wx-legend__item is-light">Light</span>
      <span className="wx-legend__sim">Simulated traffic</span>
    </div>
  );
}

function arrivalFromLive(report: WeatherReport): Conditions {
  const shift = report.periods.find((period) => period.windShift || period.storms || period.lowVisibility);
  if (!shift) {
    return { wind: windLine(report), visibility: report.visibility, ceiling: report.ceiling };
  }
  const [wind, visibility, ceiling] = shift.summary.split(" · ");
  return {
    wind: wind ?? windLine(report),
    visibility: visibility ?? report.visibility,
    ceiling: ceiling ?? report.ceiling,
  };
}

function ConditionList({ conditions }: { conditions: Conditions }) {
  return (
    <ul className="wx-conds">
      <li>
        <span>Wind</span>
        <strong>{conditions.wind}</strong>
      </li>
      <li>
        <span>Vis</span>
        <strong>{conditions.visibility}</strong>
      </li>
      <li>
        <span>Ceiling</span>
        <strong>{conditions.ceiling}</strong>
      </li>
    </ul>
  );
}