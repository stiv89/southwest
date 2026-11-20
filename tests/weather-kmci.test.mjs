import { describe, expect, it } from "vitest";
import { normalizeAviationWeather } from "../server/weather-kmci.mjs";

const metar = {
  reportTime: "2026-11-20T01:00:00.000Z",
  temp: 11.7,
  wdir: 150,
  wspd: 7,
  wgst: null,
  visib: "10+",
  cover: "CLR",
  clouds: [],
  fltCat: "VFR",
};

const taf = {
  fcsts: [
    {
      timeFrom: 1795132800,
      timeTo: 1795186800,
      wdir: 170,
      wspd: 10,
      wgst: null,
      visib: "6+",
      wxString: null,
      clouds: [{ cover: "SKC", base: null }],
    },
    {
      timeFrom: 1795186800,
      timeTo: 1795197600,
      wdir: 190,
      wspd: 12,
      wgst: 22,
      visib: "6+",
      wxString: null,
      clouds: [{ cover: "SCT", base: 25000 }],
    },
    {
      timeFrom: 1795197600,
      timeTo: 1795219200,
      fcstChange: "FM",
      wdir: 190,
      wspd: 18,
      wgst: 30,
      visib: 2,
      wxString: "-TSRA",
      clouds: [{ cover: "BKN", base: 2500, type: "CB" }],
    },
  ],
};

describe("KMCI weather normalize", () => {
  it("turns METAR and TAF into a dispatch view and flags later changes", () => {
    const report = normalizeAviationWeather(metar, taf, "2026-11-20T01:05:00.000Z");
    expect(report.visibility).toBe("10+ sm");
    expect(report.ceiling).toBe("Clear");
    expect(report.windDirection).toBe(150);
    expect(report.periods).toHaveLength(3);
    expect(report.periods[1].windShift).toBe(true);
    expect(report.periods[2].lowVisibility).toBe(true);
    expect(report.periods[2].storms).toBe(true);
    expect(report.stale).toBe(false);
  });
});
