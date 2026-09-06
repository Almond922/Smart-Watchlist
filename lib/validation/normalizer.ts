import { Quote } from "../../providers/market-data/MarketDataProvider";

export interface NormalizedValidationResult {
  isValid: boolean;
  sanitizedSymbol: string;
  reasons: string[];
}

export function sanitizeSymbol(symbol: string): string {
  if (!symbol) return "";
  return symbol
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.\-]/g, "")
    .slice(0, 10);
}

export function validateSymbol(symbol: string): NormalizedValidationResult {
  const sanitized = sanitizeSymbol(symbol);
  const reasons: string[] = [];

  if (!sanitized) {
    reasons.push("Ticker symbol cannot be empty");
  } else if (sanitized.length > 8) {
    reasons.push("Ticker symbol exceeds maximum length (8 characters)");
  } else if (!/^[A-Z0-9.\-]+$/.test(sanitized)) {
    reasons.push("Ticker symbol contains invalid characters");
  }

  return {
    isValid: reasons.length === 0,
    sanitizedSymbol: sanitized,
    reasons,
  };
}

export function validateAndNormalizeQuote(raw: Partial<Quote>, fallback?: Quote): Quote {
  const now = new Date();
  const symbol = sanitizeSymbol(raw.symbol || fallback?.symbol || "UNKNOWN");
  const price = typeof raw.price === "number" && !isNaN(raw.price) && raw.price > 0 ? raw.price : fallback?.price || 0;
  const previousClose =
    typeof raw.previousClose === "number" && !isNaN(raw.previousClose) && raw.previousClose > 0
      ? raw.previousClose
      : fallback?.previousClose || price;

  const change =
    typeof raw.change === "number" && !isNaN(raw.change)
      ? raw.change
      : Math.round((price - previousClose) * 100) / 100;

  const changePercent =
    typeof raw.changePercent === "number" && !isNaN(raw.changePercent)
      ? raw.changePercent
      : previousClose > 0
      ? Math.round(((price - previousClose) / previousClose) * 10000) / 100
      : 0;

  const volume = typeof raw.volume === "number" && raw.volume >= 0 ? raw.volume : fallback?.volume || 0;
  const averageVolume =
    typeof raw.averageVolume === "number" && raw.averageVolume > 0
      ? raw.averageVolume
      : fallback?.averageVolume || volume || 1000000;

  const high = typeof raw.high === "number" && raw.high >= price ? raw.high : price;
  const low = typeof raw.low === "number" && raw.low > 0 && raw.low <= price ? raw.low : price;

  const timestamp = raw.timestamp instanceof Date ? raw.timestamp : raw.timestamp ? new Date(raw.timestamp) : now;
  const ageMinutes = (now.getTime() - timestamp.getTime()) / (60 * 1000);

  let freshness: Quote["freshness"] = "LIVE";
  if (ageMinutes > 60) freshness = "STALE";
  else if (ageMinutes > 15) freshness = "DELAYED";
  else if (ageMinutes > 2) freshness = "RECENT";

  return {
    symbol,
    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    volume,
    averageVolume,
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    open: typeof raw.open === "number" && raw.open > 0 ? raw.open : previousClose,
    previousClose: Math.round(previousClose * 100) / 100,
    high52Week: raw.high52Week || fallback?.high52Week || high * 1.15,
    low52Week: raw.low52Week || fallback?.low52Week || low * 0.85,
    timestamp,
    freshness,
    dataSource: raw.dataSource || fallback?.dataSource || "SignalWatch Normalized Data",
    isStale: freshness === "STALE" || (raw.isStale ?? false),
    confidence: freshness === "LIVE" ? 1.0 : freshness === "RECENT" ? 0.9 : freshness === "DELAYED" ? 0.6 : 0.4,
  };
}

