import { describe, it, expect } from "vitest";
import { evaluateStockChange } from "../lib/change-detection/engine";
import { Quote } from "../providers/market-data/MarketDataProvider";

describe("Meaningful Change Detection Engine", () => {
  const baseQuote: Quote = {
    symbol: "TEST",
    price: 105.0,
    change: 5.0,
    changePercent: 5.0,
    volume: 2500000,
    averageVolume: 1000000,
    high: 106.0,
    low: 100.0,
    open: 100.5,
    previousClose: 100.0,
    high52Week: 120.0,
    low52Week: 75.0,
    timestamp: new Date(),
    freshness: "LIVE",
    dataSource: "Test",
    isStale: false,
    confidence: 1.0,
  };

  it("calculates price change vs previous snapshot: 100 -> 105 is +5%", () => {
    const analysis = evaluateStockChange({
      symbol: "TEST",
      companyName: "Test Company",
      quote: baseQuote,
      lastCheckedAt: new Date(Date.now() - 3600000),
      lastSeenPrice: 100.0,
      lastSeenVolume: 1000000,
    });

    expect(analysis.priceDeltaSinceLastCheck).toBe(5.0);
    expect(analysis.percentDeltaSinceLastCheck).toBe(5.0);
    expect(analysis.volumeRatio).toBe(2.5);
    expect(analysis.isUnusualVolume).toBe(true);
    expect(analysis.isMeaningful).toBe(true);
  });

  it("distinguishes minor noise (+0.2%) as not meaningful", () => {
    const quietQuote: Quote = {
      ...baseQuote,
      price: 100.2,
      change: 0.2,
      changePercent: 0.2,
      volume: 900000,
      averageVolume: 1000000,
    };

    const analysis = evaluateStockChange({
      symbol: "TEST",
      companyName: "Test Company",
      quote: quietQuote,
      lastCheckedAt: new Date(Date.now() - 3600000),
      lastSeenPrice: 100.0,
      lastSeenVolume: 1000000,
    });

    expect(analysis.percentDeltaSinceLastCheck).toBe(0.2);
    expect(analysis.isMeaningful).toBe(false);
    expect(analysis.attentionLevel).toBe("LOW");
  });

  it("flags sharp negative selloff with heavy volume as meaningful high attention", () => {
    const selloffQuote: Quote = {
      ...baseQuote,
      price: 94.0,
      change: -6.0,
      changePercent: -6.0,
      volume: 3200000, // 3.2x volume
      averageVolume: 1000000,
    };

    const analysis = evaluateStockChange({
      symbol: "TEST",
      companyName: "Test Company",
      quote: selloffQuote,
      lastCheckedAt: new Date(Date.now() - 3600000),
      lastSeenPrice: 100.0,
      lastSeenVolume: 1000000,
    });

    expect(analysis.percentDeltaSinceLastCheck).toBe(-6.0);
    expect(analysis.isMeaningful).toBe(true);
    expect(["HIGH", "CRITICAL"]).toContain(analysis.attentionLevel);
  });

  it("handles first-view when user has no prior snapshot", () => {
    const analysis = evaluateStockChange({
      symbol: "TEST",
      companyName: "Test Company",
      quote: baseQuote,
      lastCheckedAt: null,
      lastSeenPrice: null,
      lastSeenVolume: null,
    });

    expect(analysis.isFirstView).toBe(true);
    expect(analysis.priceDeltaSinceLastCheck).toBeNull();
    expect(analysis.percentDeltaSinceLastCheck).toBeNull();
    // Falls back to daily change for first-time evaluation
    expect(analysis.scoreResult).toBeDefined();
  });
});

