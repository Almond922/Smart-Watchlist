import { Quote, MarketEventItem } from "../../providers/market-data/MarketDataProvider";
import {
  calculateAttentionScore,
  AttentionScoreResult,
  AttentionLevel,
} from "../attention/scoring";
import { generateExplanation, ExplanationSummary } from "./explainer";

export interface StockChangeAnalysis {
  symbol: string;
  companyName: string;
  currentPrice: number;
  dailyChange: number;
  dailyChangePercent: number;
  lastSeenPrice: number | null;
  priceDeltaSinceLastCheck: number | null;
  percentDeltaSinceLastCheck: number | null;
  currentVolume: number;
  averageVolume: number;
  volumeRatio: number;
  isUnusualVolume: boolean;
  high: number;
  low: number;
  high52Week: number | null;
  low52Week: number | null;
  newEvents: MarketEventItem[];
  newEventCount: number;
  hasEarningsEvent: boolean;
  attentionScore: number;
  attentionLevel: AttentionLevel;
  isMeaningful: boolean;
  scoreResult: AttentionScoreResult;
  explanation: ExplanationSummary;
  freshness: Quote["freshness"];
  dataSource: string;
  isStale: boolean;
  timestamp: Date;
  lastCheckedAt: Date | null;
  isFirstView: boolean;
}

export interface EvaluateChangeParams {
  symbol: string;
  companyName: string;
  quote: Quote;
  lastCheckedAt?: Date | null;
  lastSeenPrice?: number | null;
  lastSeenVolume?: number | null;
  events?: MarketEventItem[];
}

export function evaluateStockChange(params: EvaluateChangeParams): StockChangeAnalysis {
  const {
    symbol,
    companyName,
    quote,
    lastCheckedAt,
    lastSeenPrice,
    lastSeenVolume,
    events = [],
  } = params;

  const isFirstView = !lastCheckedAt || lastSeenPrice === null || lastSeenPrice === undefined;

  // Filter events strictly published AFTER user's last check (or in last 24h if first view)
  const eventCutoff = lastCheckedAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
  const newEvents = events.filter((e) => new Date(e.timestamp) > eventCutoff);
  const hasEarningsEvent = newEvents.some((e) => e.eventType === "earnings");

  // Price delta since last check
  let priceDeltaSinceLastCheck: number | null = null;
  let percentDeltaSinceLastCheck: number | null = null;

  if (!isFirstView && lastSeenPrice && lastSeenPrice > 0) {
    priceDeltaSinceLastCheck = quote.price - lastSeenPrice;
    percentDeltaSinceLastCheck = ((quote.price - lastSeenPrice) / lastSeenPrice) * 100;
  }

  // Volume ratio
  const volumeRatio = quote.averageVolume > 0 ? quote.volume / quote.averageVolume : 1.0;
  const isUnusualVolume = volumeRatio >= 2.0;

  // Compute composite attention score
  const scoreResult = calculateAttentionScore({
    currentPrice: quote.price,
    lastSeenPrice: isFirstView ? null : lastSeenPrice,
    dailyChangePercent: quote.changePercent,
    currentVolume: quote.volume,
    averageVolume: quote.averageVolume,
    high: quote.high,
    low: quote.low,
    previousClose: quote.previousClose,
    high52Week: quote.high52Week,
    low52Week: quote.low52Week,
    newEventCount: newEvents.length,
    hasEarningsEvent,
  });

  // Meaningful change evaluation:
  // For a stock with a previous snapshot, a change is meaningful IF:
  // (1) The price moved meaningfully since last check (|delta| >= 2.0%), OR
  // (2) It moved moderately (|delta| >= 1.0%) with unusual volume (ratio >= 1.8), OR
  // (3) There are new market events published since last check, OR
  // (4) Score >= 50 and price delta > 0.5%
  let isMeaningful = false;

  if (isFirstView) {
    isMeaningful = scoreResult.isMeaningful;
  } else {
    const absSinceCheck = Math.abs(percentDeltaSinceLastCheck || 0);
    if (absSinceCheck >= 2.0) {
      isMeaningful = true;
    } else if (absSinceCheck >= 1.0 && volumeRatio >= 1.8) {
      isMeaningful = true;
    } else if (newEvents.length > 0) {
      isMeaningful = true;
    } else if (scoreResult.score >= 50 && absSinceCheck >= 0.5) {
      isMeaningful = true;
    } else {
      isMeaningful = false;
    }
  }

  // Generate deterministic "Why am I seeing this?" explanation
  const explanation = generateExplanation(
    symbol,
    companyName,
    scoreResult,
    !isFirstView && percentDeltaSinceLastCheck !== null
  );

  return {
    symbol,
    companyName,
    currentPrice: quote.price,
    dailyChange: quote.change,
    dailyChangePercent: quote.changePercent,
    lastSeenPrice: lastSeenPrice ?? null,
    priceDeltaSinceLastCheck:
      priceDeltaSinceLastCheck !== null ? Math.round(priceDeltaSinceLastCheck * 100) / 100 : null,
    percentDeltaSinceLastCheck:
      percentDeltaSinceLastCheck !== null
        ? Math.round(percentDeltaSinceLastCheck * 100) / 100
        : null,
    currentVolume: quote.volume,
    averageVolume: quote.averageVolume,
    volumeRatio: Math.round(volumeRatio * 100) / 100,
    isUnusualVolume,
    high: quote.high,
    low: quote.low,
    high52Week: quote.high52Week || null,
    low52Week: quote.low52Week || null,
    newEvents,
    newEventCount: newEvents.length,
    hasEarningsEvent,
    attentionScore: scoreResult.score,
    attentionLevel: scoreResult.level,
    isMeaningful,
    scoreResult,
    explanation,
    freshness: quote.freshness,
    dataSource: quote.dataSource,
    isStale: quote.isStale,
    timestamp: quote.timestamp,
    lastCheckedAt: lastCheckedAt ?? null,
    isFirstView,
  };
}

