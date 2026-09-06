import { describe, it, expect } from "vitest";
import { generateExplanation } from "../lib/change-detection/explainer";
import { calculateAttentionScore } from "../lib/attention/scoring";

describe("Deterministic Explanation Engine", () => {
  it("generates clear structured bullets and narrative for flagged stock without LLM", () => {
    const scoreResult = calculateAttentionScore({
      currentPrice: 238.42,
      lastSeenPrice: 227.45,
      dailyChangePercent: 4.82,
      currentVolume: 82400000,
      averageVolume: 35800000, // 2.3x
      high: 239.1,
      low: 227.8,
      previousClose: 227.45,
      newEventCount: 2,
      hasEarningsEvent: true,
    });

    const explanation = generateExplanation("AAPL", "Apple Inc.", scoreResult, true);

    expect(explanation.headline).toContain("High Attention");
    expect(explanation.bulletPoints.some((b) => b.includes("Price moved"))).toBe(true);
    expect(explanation.bulletPoints.some((b) => b.includes("2.3×"))).toBe(true);
    expect(explanation.bulletPoints.some((b) => b.includes("2 new market events"))).toBe(true);
    expect(explanation.narrativeReason).toContain("Apple Inc.");
    expect(explanation.narrativeReason).toContain("elevated volume");
  });
});

