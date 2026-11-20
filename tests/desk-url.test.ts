import { describe, expect, it } from "vitest";
import { deskPath, parseDeskPath } from "../src/lib/desk-url";

describe("desk url", () => {
  it("round-trips a department screen", () => {
    expect(parseDeskPath(deskPath("station-ops", "gate-map"))).toEqual({
      role: "station-ops",
      screen: "gate-map",
    });
    expect(parseDeskPath("/customer-service/messages")).toEqual({
      role: "customer-service",
      screen: "messages",
    });
  });

  it("keeps the department when the screen is a shared desk view", () => {
    expect(parseDeskPath("/dispatch/activity")?.screen).toBe("activity");
  });

  it("allows activity on every department", () => {
    expect(parseDeskPath("/dispatch/activity")?.screen).toBe("activity");
    expect(parseDeskPath("/station-ops/activity")?.screen).toBe("activity");
  });

  it("falls back to the department home for an unknown screen", () => {
    expect(parseDeskPath("/station-ops/not-a-screen")).toEqual({
      role: "station-ops",
      screen: "gate-map",
    });
    expect(parseDeskPath("/passenger")).toBeNull();
  });
});
