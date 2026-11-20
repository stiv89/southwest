import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CACHE_MS = 10 * 60 * 1000;
const USER_AGENT = "SouthwestClassroomDemo/0.1 (educational MCI exercise)";
const cacheFile = join(dirname(fileURLToPath(import.meta.url)), "../data/runtime/weather-kmci.json");

let memory = null;

function ceilingText(clouds, cover) {
  const layers = Array.isArray(clouds) ? clouds : [];
  const ceiling = layers.find((layer) => ["BKN", "OVC", "VV"].includes(layer.cover));
  if (!ceiling) {
    if (cover === "CLR" || cover === "SKC" || layers.length === 0) return "Clear";
    return "No ceiling";
  }
  const base = typeof ceiling.base === "number" ? `${ceiling.base.toLocaleString("en-US")} ft` : "";
  return `${ceiling.cover} ${base}`.trim();
}

function visibilityText(visib) {
  if (visib == null || visib === "") return "Unknown";
  const text = String(visib);
  return text.includes("sm") ? text : `${text} sm`;
}

function lowVisibility(visib) {
  if (typeof visib === "number") return visib < 3;
  const value = Number.parseFloat(String(visib).replace("+", ""));
  return Number.isFinite(value) && value < 3 && !String(visib).includes("+");
}

function storms(period) {
  if (/TS|SQ|FC|\bGR\b/i.test(period.wxString ?? "")) return true;
  return (period.clouds ?? []).some((layer) => layer.type === "CB" || layer.type === "TCU");
}

function directionDelta(previous, next) {
  if (typeof previous !== "number" || typeof next !== "number") return 0;
  const diff = Math.abs(next - previous) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function windShift(previous, next) {
  if (!previous) return false;
  const gustAppears = previous.wgst == null && next.wgst != null;
  return (
    directionDelta(previous.wdir, next.wdir) >= 30 ||
    Math.abs((next.wspd ?? 0) - (previous.wspd ?? 0)) >= 8 ||
    gustAppears
  );
}

function cloudSummary(clouds) {
  const layer = (clouds ?? []).find((item) => item.cover && item.cover !== "NSC");
  if (!layer) return "Clear";
  if (layer.base == null) return layer.cover;
  return `${layer.cover} ${Number(layer.base).toLocaleString("en-US")} ft`;
}

function periodSummary(period) {
  const direction = typeof period.wdir === "number" ? `${period.wdir}°` : "VRB";
  const gust = period.wgst ? ` G${period.wgst}` : "";
  return `${direction} ${period.wspd ?? 0} kt${gust} · ${visibilityText(period.visib)} · ${cloudSummary(period.clouds)}`;
}

function stationSnapshot(metar) {
  if (!metar) return null;
  return {
    station: metar.icaoId ?? "",
    visibility: visibilityText(metar.visib),
    ceiling: ceilingText(metar.clouds, metar.cover),
    flightCategory: metar.fltCat ?? "Unknown",
    windDirection: typeof metar.wdir === "number" ? metar.wdir : null,
    windSpeedKt: metar.wspd ?? 0,
    windGustKt: metar.wgst ?? null,
  };
}

async function readMetar(response) {
  if (!response.ok) return null;
  const body = await response.json();
  return Array.isArray(body) ? body[0] ?? null : null;
}

export function normalizeAviationWeather(metar, taf, fetchedAt = new Date().toISOString()) {
  const forecasts = taf?.fcsts ?? [];
  const periods = forecasts.map((period, index) => ({
    from: new Date(period.timeFrom * 1000).toISOString(),
    to: new Date(period.timeTo * 1000).toISOString(),
    summary: periodSummary(period),
    windShift: windShift(forecasts[index - 1], period),
    lowVisibility: lowVisibility(period.visib),
    storms: storms(period),
  }));

  return {
    station: "KMCI",
    stale: false,
    fetchedAt,
    observedAt: metar.reportTime ?? fetchedAt,
    visibility: visibilityText(metar.visib),
    ceiling: ceilingText(metar.clouds, metar.cover),
    flightCategory: metar.fltCat ?? "Unknown",
    windDirection: typeof metar.wdir === "number" ? metar.wdir : null,
    windSpeedKt: metar.wspd ?? 0,
    windGustKt: metar.wgst ?? null,
    periods,
  };
}

function readDisk() {
  try {
    return JSON.parse(readFileSync(cacheFile, "utf8"));
  } catch {
    return null;
  }
}

function writeDisk(report) {
  if (process.env.VITEST) return;
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(report), "utf8");
}

async function fetchFresh() {
  const headers = { "User-Agent": USER_AGENT, Accept: "application/json" };
  const [metarRes, tafRes, denRes] = await Promise.all([
    fetch("https://aviationweather.gov/api/data/metar?ids=KMCI&format=json", { headers }),
    fetch("https://aviationweather.gov/api/data/taf?ids=KMCI&format=json", { headers }),
    fetch("https://aviationweather.gov/api/data/metar?ids=KDEN&format=json", { headers }),
  ]);
  if (!metarRes.ok || !tafRes.ok) {
    throw new Error(`Aviation Weather Center returned ${metarRes.status}/${tafRes.status}`);
  }
  const metars = await metarRes.json();
  const tafs = await tafRes.json();
  if (!Array.isArray(metars) || !metars[0]) throw new Error("No KMCI METAR");
  const report = normalizeAviationWeather(metars[0], Array.isArray(tafs) ? tafs[0] : null);
  report.den = stationSnapshot(await readMetar(denRes));
  memory = { savedAt: Date.now(), report };
  writeDisk(report);
  return report;
}

export async function getKmciWeather() {
  if (memory && Date.now() - memory.savedAt < CACHE_MS) return memory.report;
  try {
    return await fetchFresh();
  } catch (error) {
    const last = memory?.report ?? readDisk();
    if (!last) throw error;
    return { ...last, stale: true };
  }
}
