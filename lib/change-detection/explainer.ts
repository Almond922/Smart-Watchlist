import { AttentionScoreResult, SignalDetail } from "../attention/scoring";

export interface ExplanationSummary {
  headline: string;
  bulletPoints: string[];
  narrativeReason: string;
  keyDrivers: string[];
}

export function generateExplanation(
  symbol: string,
  companyName: string,
  scoreResult: AttentionScoreResult,
  sinceLastCheck = true
): ExplanationSummary {
  const bulletPoints: string[] = [];
  const keyDrivers: string[] = [];

  const priceSignal = scoreResult.signals.find((s) => s.kind === "price");
  const volumeSignal = scoreResult.signals.find((s) => s.kind === "volume");
  const eventSignal = scoreResult.signals.find((s) => s.kind === "event");
  const intradaySignal = scoreResult.signals.find((s) => s.kind === "intraday");
  const extremeSignal = scoreResult.signals.find((s) => s.kind === "extreme52w");

  // 1. Price bullet
  if (priceSignal) {
    const delta = priceSignal.metrics.priceDeltaPercent as number;
    const sign = delta >= 0 ? "+" : "";
    const prefix = sinceLastCheck ? "Price moved" : "Daily price changed";
    bulletPoints.push(`${prefix} ${sign}${delta.toFixed(2)}%`);
    if (priceSignal.severity === "major" || priceSignal.severity === "significant") {
      keyDrivers.push(`a ${sign}${delta.toFixed(1)}% price move`);
    }
  }

  // 2. Volume bullet
  if (volumeSignal) {
    const ratio = volumeSignal.metrics.volumeRatio as number;
    if (ratio >= 1.5) {
      bulletPoints.push(`Volume is ${ratio.toFixed(1)}× its recent average`);
      keyDrivers.push(`${ratio.toFixed(1)}× elevated volume`);
    } else {
      bulletPoints.push(`Volume is normal (${ratio.toFixed(1)}× average)`);
    }
  }

  // 3. Events bullet
  if (eventSignal) {
    const count = (eventSignal.metrics.newEventCount as number) || 0;
    const hasEarnings = eventSignal.metrics.hasEarningsEvent as boolean;
    if (count > 0) {
      bulletPoints.push(`${count} new market event${count > 1 ? "s" : ""}${hasEarnings ? " (Earnings announcement)" : ""}`);
      keyDrivers.push(`${count} new market event${count > 1 ? "s" : ""}`);
    }
  }

  // 4. Extreme bullet
  if (extremeSignal && (extremeSignal.severity === "major" || extremeSignal.severity === "significant")) {
    bulletPoints.push(extremeSignal.description);
    keyDrivers.push(extremeSignal.description.toLowerCase());
  }

  // Build headline
  let headline = "";
  if (scoreResult.level === "CRITICAL") {
    headline = "Critical Attention Required: Multi-Factor Market Outlier";
  } else if (scoreResult.level === "HIGH") {
    headline = "High Attention: Unusual Market Activity Detected";
  } else if (scoreResult.level === "MEDIUM") {
    headline = "Moderate Change: Activity Warrants Monitoring";
  } else {
    headline = "Normal Activity: Trading Within Expected Baseline";
  }

  // Build deterministic narrative paragraph
  let narrativeReason = "";
  const companyRef = companyName || symbol;

  if (scoreResult.level === "CRITICAL" || scoreResult.level === "HIGH") {
    if (priceSignal && volumeSignal && (volumeSignal.metrics.volumeRatio as number) >= 1.8) {
      narrativeReason = `Today's move is unusually large relative to ${companyRef}'s recent trading range and is accompanied by elevated volume (${(volumeSignal.metrics.volumeRatio as number).toFixed(1)}× average), indicating institutional participation.`;
    } else if (eventSignal && (eventSignal.metrics.newEventCount as number) > 0) {
      narrativeReason = `${companyRef} is experiencing elevated volatility driven by newly released market developments and material events since your last visit.`;
    } else {
      narrativeReason = `This stock was flagged because the price movement significantly exceeded normal baseline volatility thresholds for this asset.`;
    }
  } else if (scoreResult.level === "MEDIUM") {
    if (extremeSignal && extremeSignal.severity !== "none") {
      narrativeReason = `${companyRef} is testing key historical price boundaries near its 52-week envelope, signaling a potential breakout or resistance test.`;
    } else if (volumeSignal && (volumeSignal.metrics.volumeRatio as number) >= 1.5) {
      narrativeReason = `Trading volume has picked up moderately above the baseline while price has experienced a moderate positional shift.`;
    } else {
      narrativeReason = `Price has drifted moderately since your last check, but overall trading remains within manageable volatility bands.`;
    }
  } else {
    narrativeReason = `${companyRef} is currently trading quietly with volume and price action well within standard statistical expectations.`;
  }

  return {
    headline,
    bulletPoints,
    narrativeReason,
    keyDrivers,
  };
}

