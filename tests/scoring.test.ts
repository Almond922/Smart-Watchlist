import { describe, it, expect } from "vitest";
import { calculateAttentionScore, SCORING_WEIGHTS } from "../lib/attention/scoring";

describe("Attention Scoring Engine", () => {
  it("calculates LOW attention score for minor price fluctuations (<1%) and normal volume", () => {
    const result = calculateAttentionScore({
      currentPrice: 100.5,
      lastSeenPrice: 100.0,
      dailyChangePercent: 0.5,
      currentVolume: 1000000,
      averageVolume: 1000000,
      high: 101.0,
      low: 99.8,
      previousClose: 100.0,
      newEventCount: 0,
    });

    expect(result.score).toBeLessThan(30);
    expect(result.level).toBe("LOW");
    expect(result.isMeaningful).toBe(false);
  });

  it("calculates HIGH or CRITICAL score for a major price move (>5%) with 2.5x volume surge", () => {
    const result = calculateAttentionScore({
      currentPrice: 105.5,
      lastSeenPrice: 100.0, // +5.5% move since last check
      dailyChangePercent: 5.5,
      currentVolume: 2500000, // 2.5x volume
      averageVolume: 1000000,
      high: 106.0,
      low: 100.0,
      previousClose: 100.0,
      newEventCount: 2,
      hasEarningsEvent: true,
    });

    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(["HIGH", "CRITICAL"]).toContain(result.level);
    expect(result.isMeaningful).toBe(true);
  });

  it("correctly scores volume anomaly ratio", () => {
    // 2.5M volume / 1.0M baseline = 2.5x ratio
    const highVolumeResult = calculateAttentionScore({
      currentPrice: 100,
      lastSeenPrice: 100,
      dailyChangePercent: 0,
      currentVolume: 2500000,
      averageVolume: 1000000,
      high: 100.5,
      low: 99.5,
      previousClose: 100,
      newEventCount: 0,
    });

    const volSignal = highVolumeResult.signals.find((s) => s.kind === "volume");
    expect(volSignal).toBeDefined();
    expect(volSignal?.metrics.volumeRatio).toBe(2.5);
    expect(volSignal?.points).toBeGreaterThanOrEqual(20);
  });

  it("adds bonus points for breaching 52-week high", () => {
    const result = calculateAttentionScore({
      currentPrice: 205.0,
      lastSeenPrice: 200.0,
      dailyChangePercent: 2.5,
      currentVolume: 1500000,
      averageVolume: 1000000,
      high: 206.0,
      low: 199.0,
      previousClose: 200.0,
      high52Week: 204.0, // breached!
      low52Week: 120.0,
      newEventCount: 0,
    });

    const extremeSignal = result.signals.find((s) => s.kind === "extreme52w");
    expect(extremeSignal).toBeDefined();
    expect(extremeSignal?.points).toBe(10);
    expect(extremeSignal?.severity).toBe("major");
  });

  it("handles edge case: zero average volume gracefully without division by zero", () => {
    const result = calculateAttentionScore({
      currentPrice: 100,
      lastSeenPrice: 100,
      dailyChangePercent: 0,
      currentVolume: 0,
      averageVolume: 0, // Zero volume edge case
      high: 100,
      low: 100,
      previousClose: 100,
      newEventCount: 0,
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(isNaN(result.score)).toBe(false);
  });

  it("caps maximum total attention score at 100", () => {
    const extremeResult = calculateAttentionScore({
      currentPrice: 200,
      lastSeenPrice: 100, // +100% move
      dailyChangePercent: 100,
      currentVolume: 50000000, // 50x volume
      averageVolume: 1000000,
      high: 220,
      low: 90,
      previousClose: 100,
      high52Week: 150,
      newEventCount: 10,
      hasEarningsEvent: true,
    });

    expect(extremeResult.score).toBe(100);
    expect(extremeResult.level).toBe("CRITICAL");
  });
});

