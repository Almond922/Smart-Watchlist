/**
 * Centralized Attention Scoring Configuration & Engine
 *
 * Scoring breakdown (0 - 100 points):
 * - Price Movement vs Last Check & Volatility: 0 - 30 pts
 * - Volume Anomaly: 0 - 25 pts
 * - Intraday Movement / Volatility: 0 - 20 pts
 * - Material Events & News since last check: 0 - 15 pts
 * - 52-Week Extreme Proximity/Break: 0 - 10 pts
 *
 * Level mapping:
 * 0 - 29:   LOW
 * 30 - 59:  MEDIUM
 * 60 - 79:  HIGH
 * 80 - 100: CRITICAL
 */

export type AttentionLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SignalDetail {
  kind: "price" | "volume" | "intraday" | "event" | "extreme52w";
  label: string;
  points: number;
  maxPoints: number;
  description: string;
  severity: "none" | "moderate" | "significant" | "major";
  metrics: Record<string, number | string | boolean>;
}

export interface AttentionScoreResult {
  score: number; // 0 - 100 rounded
  level: AttentionLevel;
  isMeaningful: boolean; // >= 30 points (Medium or above)
  signals: SignalDetail[];
  breakdown: {
    pricePoints: number;
    volumePoints: number;
    intradayPoints: number;
    eventPoints: number;
    extremePoints: number;
  };
}

export const SCORING_WEIGHTS = {
  PRICE_MAX: 30,
  VOLUME_MAX: 25,
  INTRADAY_MAX: 20,
  EVENT_MAX: 15,
  EXTREME_MAX: 10,
} as const;

export const ATTENTION_THRESHOLDS = {
  LOW_MAX: 29,
  MEDIUM_MAX: 59,
  HIGH_MAX: 79,
  CRITICAL_MIN: 80,
  MEANINGFUL_CUTOFF: 30, // threshold to qualify for "Since You Last Checked"
} as const;

export interface CalculateScoreParams {
  currentPrice: number;
  lastSeenPrice?: number | null;
  dailyChangePercent: number;
  currentVolume: number;
  averageVolume: number;
  high: number;
  low: number;
  previousClose: number;
  high52Week?: number | null;
  low52Week?: number | null;
  newEventCount: number;
  hasEarningsEvent?: boolean;
  historicalVolatilityPercent?: number; // e.g., 1.5% typical daily move
}

export function calculateAttentionScore(params: CalculateScoreParams): AttentionScoreResult {
  const {
    currentPrice,
    lastSeenPrice,
    dailyChangePercent,
    currentVolume,
    averageVolume,
    high,
    low,
    previousClose,
    high52Week,
    low52Week,
    newEventCount,
    hasEarningsEvent = false,
    historicalVolatilityPercent = 1.8,
  } = params;

  const signals: SignalDetail[] = [];

  // 1. PRICE MOVEMENT SCORE (0 - 30 pts)
  // Compare current price vs lastSeenPrice (if available), else daily change
  let priceDeltaPercent: number;
  let isSinceLastCheck = false;

  if (lastSeenPrice !== undefined && lastSeenPrice !== null && lastSeenPrice > 0) {
    priceDeltaPercent = ((currentPrice - lastSeenPrice) / lastSeenPrice) * 100;
    isSinceLastCheck = true;
  } else {
    priceDeltaPercent = dailyChangePercent;
  }

  const absPriceDelta = Math.abs(priceDeltaPercent);
  let pricePoints = 0;
  let priceSeverity: SignalDetail["severity"] = "none";

  if (absPriceDelta >= 5.0) {
    // Major move: > 5% -> 25 to 30 points
    pricePoints = Math.min(SCORING_WEIGHTS.PRICE_MAX, 25 + (absPriceDelta - 5.0) * 1.5);
    priceSeverity = "major";
  } else if (absPriceDelta >= 3.0) {
    // Meaningful move: 3% - 5% -> 18 to 24 points
    pricePoints = 18 + ((absPriceDelta - 3.0) / 2.0) * 6;
    priceSeverity = "significant";
  } else if (absPriceDelta >= 1.0) {
    // Moderate move: 1% - 3% -> 8 to 17 points
    pricePoints = 8 + ((absPriceDelta - 1.0) / 2.0) * 9;
    priceSeverity = "moderate";
  } else {
    // Insignificant move: < 1% -> 0 to 7 points
    pricePoints = (absPriceDelta / 1.0) * 7;
    priceSeverity = "none";
  }

  // Adjust by volatility baseline: if stock moved 2x its normal volatility, bonus points
  const volatilityMultiplier = historicalVolatilityPercent > 0 ? absPriceDelta / historicalVolatilityPercent : 1.0;
  if (volatilityMultiplier >= 2.0 && pricePoints > 10) {
    pricePoints = Math.min(SCORING_WEIGHTS.PRICE_MAX, pricePoints * 1.15);
  }

  pricePoints = Math.round(pricePoints * 10) / 10;
  const sign = priceDeltaPercent >= 0 ? "+" : "";
  signals.push({
    kind: "price",
    label: isSinceLastCheck ? "Change Since Last Check" : "Daily Price Change",
    points: pricePoints,
    maxPoints: SCORING_WEIGHTS.PRICE_MAX,
    description: `${sign}${priceDeltaPercent.toFixed(2)}% move (${volatilityMultiplier.toFixed(1)}× typical daily volatility)`,
    severity: priceSeverity,
    metrics: {
      priceDeltaPercent: Math.round(priceDeltaPercent * 100) / 100,
      absPriceDelta: Math.round(absPriceDelta * 100) / 100,
      volatilityMultiplier: Math.round(volatilityMultiplier * 10) / 10,
      isSinceLastCheck,
    },
  });

  // 2. VOLUME ANOMALY SCORE (0 - 25 pts)
  const volumeRatio = averageVolume > 0 ? currentVolume / averageVolume : 1.0;
  let volumePoints = 0;
  let volumeSeverity: SignalDetail["severity"] = "none";

  if (volumeRatio >= 2.5) {
    // Highly unusual: >= 2.5x
    volumePoints = Math.min(SCORING_WEIGHTS.VOLUME_MAX, 22 + (volumeRatio - 2.5) * 2);
    volumeSeverity = "major";
  } else if (volumeRatio >= 2.0) {
    // Unusual: 2.0x - 2.5x -> 18 to 22 pts
    volumePoints = 18 + ((volumeRatio - 2.0) / 0.5) * 4;
    volumeSeverity = "significant";
  } else if (volumeRatio >= 1.5) {
    // Elevated: 1.5x - 2.0x -> 10 to 17 pts
    volumePoints = 10 + ((volumeRatio - 1.5) / 0.5) * 7;
    volumeSeverity = "moderate";
  } else {
    // Normal: < 1.5x -> 0 to 9 pts
    volumePoints = Math.min(9, (volumeRatio / 1.5) * 9);
    volumeSeverity = "none";
  }

  volumePoints = Math.round(volumePoints * 10) / 10;
  signals.push({
    kind: "volume",
    label: "Volume Anomaly",
    points: volumePoints,
    maxPoints: SCORING_WEIGHTS.VOLUME_MAX,
    description: `${volumeRatio.toFixed(1)}× recent average volume (${formatVolume(currentVolume)} shares)`,
    severity: volumeSeverity,
    metrics: {
      volumeRatio: Math.round(volumeRatio * 100) / 100,
      currentVolume,
      averageVolume,
    },
  });

  // 3. INTRADAY MOVEMENT / VOLATILITY (0 - 20 pts)
  const intradayRange = high > low && previousClose > 0 ? ((high - low) / previousClose) * 100 : 0;
  let intradayPoints = 0;
  let intradaySeverity: SignalDetail["severity"] = "none";

  if (intradayRange >= 5.0) {
    intradayPoints = Math.min(SCORING_WEIGHTS.INTRADAY_MAX, 16 + (intradayRange - 5.0) * 1.2);
    intradaySeverity = "major";
  } else if (intradayRange >= 3.0) {
    intradayPoints = 11 + ((intradayRange - 3.0) / 2.0) * 5;
    intradaySeverity = "significant";
  } else if (intradayRange >= 1.5) {
    intradayPoints = 5 + ((intradayRange - 1.5) / 1.5) * 6;
    intradaySeverity = "moderate";
  } else {
    intradayPoints = (intradayRange / 1.5) * 5;
    intradaySeverity = "none";
  }

  intradayPoints = Math.round(intradayPoints * 10) / 10;
  signals.push({
    kind: "intraday",
    label: "Intraday Range",
    points: intradayPoints,
    maxPoints: SCORING_WEIGHTS.INTRADAY_MAX,
    description: `${intradayRange.toFixed(2)}% intraday spread (High: $${high.toFixed(2)} / Low: $${low.toFixed(2)})`,
    severity: intradaySeverity,
    metrics: {
      intradayRange: Math.round(intradayRange * 100) / 100,
      high,
      low,
    },
  });

  // 4. NEW EVENTS & NEWS (0 - 15 pts)
  let eventPoints = 0;
  let eventSeverity: SignalDetail["severity"] = "none";

  if (newEventCount > 0) {
    if (hasEarningsEvent) {
      eventPoints = Math.min(SCORING_WEIGHTS.EVENT_MAX, 10 + (newEventCount - 1) * 2.5);
      eventSeverity = "major";
    } else if (newEventCount >= 2) {
      eventPoints = Math.min(SCORING_WEIGHTS.EVENT_MAX, 8 + (newEventCount - 2) * 3);
      eventSeverity = "significant";
    } else {
      eventPoints = 6;
      eventSeverity = "moderate";
    }
  }

  eventPoints = Math.round(eventPoints * 10) / 10;
  signals.push({
    kind: "event",
    label: "New Market Events",
    points: eventPoints,
    maxPoints: SCORING_WEIGHTS.EVENT_MAX,
    description:
      newEventCount === 0
        ? "No new events since your last check"
        : `${newEventCount} new market event${newEventCount > 1 ? "s" : ""}${hasEarningsEvent ? " (including Earnings)" : ""}`,
    severity: eventSeverity,
    metrics: {
      newEventCount,
      hasEarningsEvent,
    },
  });

  // 5. 52-WEEK EXTREMES (0 - 10 pts)
  let extremePoints = 0;
  let extremeSeverity: SignalDetail["severity"] = "none";
  let extremeDescription = "Within typical 52-week trading bounds";

  if (high52Week && high52Week > 0) {
    const distToHighPercent = ((high52Week - currentPrice) / high52Week) * 100;
    if (currentPrice >= high52Week) {
      extremePoints = 10;
      extremeSeverity = "major";
      extremeDescription = `Breached 52-week high ($${high52Week.toFixed(2)})`;
    } else if (distToHighPercent <= 2.5) {
      extremePoints = 7 + ((2.5 - distToHighPercent) / 2.5) * 2;
      extremeSeverity = "significant";
      extremeDescription = `Approaching 52-week high (within ${distToHighPercent.toFixed(1)}% of $${high52Week.toFixed(2)})`;
    }
  }

  if (low52Week && low52Week > 0 && extremePoints === 0) {
    const distToLowPercent = ((currentPrice - low52Week) / low52Week) * 100;
    if (currentPrice <= low52Week) {
      extremePoints = 10;
      extremeSeverity = "major";
      extremeDescription = `Breached 52-week low ($${low52Week.toFixed(2)})`;
    } else if (distToLowPercent <= 2.5) {
      extremePoints = 7 + ((2.5 - distToLowPercent) / 2.5) * 2;
      extremeSeverity = "significant";
      extremeDescription = `Approaching 52-week low (within ${distToLowPercent.toFixed(1)}% of $${low52Week.toFixed(2)})`;
    }
  }

  extremePoints = Math.round(extremePoints * 10) / 10;
  signals.push({
    kind: "extreme52w",
    label: "52-Week Range Extremes",
    points: extremePoints,
    maxPoints: SCORING_WEIGHTS.EXTREME_MAX,
    description: extremeDescription,
    severity: extremeSeverity,
    metrics: {
      high52Week: high52Week || 0,
      low52Week: low52Week || 0,
      currentPrice,
    },
  });

  // Calculate composite total (capped at 100)
  const totalScore = Math.min(
    100,
    Math.round(pricePoints + volumePoints + intradayPoints + eventPoints + extremePoints)
  );

  let level: AttentionLevel = "LOW";
  if (totalScore >= ATTENTION_THRESHOLDS.CRITICAL_MIN) {
    level = "CRITICAL";
  } else if (totalScore > ATTENTION_THRESHOLDS.MEDIUM_MAX) {
    level = "HIGH";
  } else if (totalScore > ATTENTION_THRESHOLDS.LOW_MAX) {
    level = "MEDIUM";
  } else {
    level = "LOW";
  }

  const isMeaningful = totalScore >= ATTENTION_THRESHOLDS.MEANINGFUL_CUTOFF;

  return {
    score: totalScore,
    level,
    isMeaningful,
    signals,
    breakdown: {
      pricePoints,
      volumePoints,
      intradayPoints,
      eventPoints,
      extremePoints,
    },
  };
}

function formatVolume(vol: number): string {
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
  return String(vol);
}

