import { describe, it, expect } from "vitest";
import { computeFreshness } from "../lib/market/freshness";

describe("Data Freshness and Staleness Engine", () => {
  it("classifies observation < 2 minutes old as LIVE", () => {
    const fortySecondsAgo = new Date(Date.now() - 40 * 1000);
    const freshness = computeFreshness(fortySecondsAgo);

    expect(freshness.level).toBe("LIVE");
    expect(freshness.isStale).toBe(false);
    expect(freshness.label).toContain("Updated 40s ago");
  });

  it("classifies observation between 2 and 15 minutes old as RECENT", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const freshness = computeFreshness(fiveMinutesAgo);

    expect(freshness.level).toBe("RECENT");
    expect(freshness.isStale).toBe(false);
    expect(freshness.label).toContain("Updated 5m ago");
  });

  it("classifies observation between 15 and 60 minutes old as DELAYED", () => {
    const twentyFiveMinutesAgo = new Date(Date.now() - 25 * 60 * 1000);
    const freshness = computeFreshness(twentyFiveMinutesAgo);

    expect(freshness.level).toBe("DELAYED");
    expect(freshness.isStale).toBe(true);
    expect(freshness.label).toContain("Delayed");
  });

  it("classifies observation > 60 minutes old as STALE", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const freshness = computeFreshness(twoHoursAgo);

    expect(freshness.level).toBe("STALE");
    expect(freshness.isStale).toBe(true);
    expect(freshness.label).toContain("Stale Data");
  });
});

