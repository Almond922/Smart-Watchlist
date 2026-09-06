export type Freshness = "LIVE" | "RECENT" | "DELAYED" | "STALE";

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  averageVolume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  high52Week: number;
  low52Week: number;
  timestamp: Date;
  freshness: Freshness;
  dataSource: string;
  isStale: boolean;
  confidence: number; // 0.0 to 1.0
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  exchange: string;
  industry?: string;
  marketCap?: number;
  description?: string;
}

export interface MarketEventItem {
  id: string;
  symbol: string;
  eventType: "earnings" | "news" | "filing" | "dividend" | "analyst";
  title: string;
  description?: string;
  timestamp: Date;
  source: string;
  impact?: "positive" | "negative" | "neutral";
}

export interface MarketStatus {
  isOpen: boolean;
  session: "REGULAR" | "PRE_MARKET" | "AFTER_HOURS" | "CLOSED";
  message: string;
  asOf: Date;
}

export interface SearchResult {
  symbol: string;
  companyName: string;
  exchange: string;
  type: string;
}

export interface MarketDataProvider {
  name: string;
  getQuote(symbol: string): Promise<Quote>;
  getHistoricalData(symbol: string, days?: number): Promise<HistoricalDataPoint[]>;
  getCompany(symbol: string): Promise<CompanyProfile>;
  getEvents(symbol: string, since?: Date): Promise<MarketEventItem[]>;
  search(query: string): Promise<SearchResult[]>;
  getMarketStatus(): Promise<MarketStatus>;
}

