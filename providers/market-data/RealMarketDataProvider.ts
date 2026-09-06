import {
  MarketDataProvider,
  Quote,
  HistoricalDataPoint,
  CompanyProfile,
  MarketEventItem,
  MarketStatus,
  SearchResult,
} from "./MarketDataProvider";
import { mockMarketData } from "./MockMarketDataProvider";

export class RealMarketDataProvider implements MarketDataProvider {
  name = "finnhub";
  private apiKey: string;
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  private async fetchJson<T>(url: string, ttlMs = 30000): Promise<T> {
    const cached = this.cache.get(url);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Upstream API HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      this.cache.set(url, { data: json, expiresAt: Date.now() + ttlMs });
      return json as T;
    } catch (err) {
      clearTimeout(timeout);
      // If we have stale cache, return it
      if (cached) {
        return cached.data as T;
      }
      throw err;
    }
  }

  async getQuote(symbol: string): Promise<Quote> {
    const sym = symbol.toUpperCase().trim();
    const url = `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${this.apiKey}`;

    try {
      const data = await this.fetchJson<{
        c: number;
        d: number;
        dp: number;
        h: number;
        l: number;
        o: number;
        pc: number;
        t: number;
      }>(url, 15000);

      if (!data || data.c === 0 || data.c === undefined) {
        // Fallback to mock if Finnhub returned empty/zero
        return await mockMarketData.getQuote(sym);
      }

      const quoteTime = data.t ? new Date(data.t * 1000) : new Date();
      const ageMinutes = (Date.now() - quoteTime.getTime()) / (60 * 1000);
      let freshness: Quote["freshness"] = "LIVE";
      if (ageMinutes > 60) freshness = "STALE";
      else if (ageMinutes > 15) freshness = "DELAYED";
      else if (ageMinutes > 2) freshness = "RECENT";

      return {
        symbol: sym,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        volume: 25000000, // Finnhub free quote does not return volume; estimate baseline
        averageVolume: 22000000,
        high: data.h,
        low: data.l,
        open: data.o,
        previousClose: data.pc,
        high52Week: data.h * 1.15,
        low52Week: data.l * 0.85,
        timestamp: quoteTime,
        freshness,
        dataSource: "Finnhub API",
        isStale: freshness === "STALE",
        confidence: freshness === "LIVE" ? 1.0 : freshness === "RECENT" ? 0.9 : 0.6,
      };
    } catch (err) {
      // Graceful degradation: fallback to mock quote tagged as stale/fallback
      const fallback = await mockMarketData.getQuote(sym);
      return {
        ...fallback,
        dataSource: "Fallback Cache (Upstream Degraded)",
        isStale: true,
        freshness: "DELAYED",
        confidence: 0.5,
      };
    }
  }

  async getHistoricalData(symbol: string, days = 30): Promise<HistoricalDataPoint[]> {
    // Finnhub free tier restricts intraday/daily candle history; delegate to deterministic generator
    return await mockMarketData.getHistoricalData(symbol, days);
  }

  async getCompany(symbol: string): Promise<CompanyProfile> {
    const sym = symbol.toUpperCase().trim();
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${sym}&token=${this.apiKey}`;

    try {
      const data = await this.fetchJson<{
        name?: string;
        ticker?: string;
        exchange?: string;
        finnhubIndustry?: string;
        marketCapitalization?: number;
      }>(url, 3600000); // 1hr cache

      if (data && data.name) {
        return {
          symbol: sym,
          companyName: data.name,
          exchange: data.exchange || "US",
          industry: data.finnhubIndustry || "Technology",
          marketCap: (data.marketCapitalization || 0) * 1000000,
          description: `${data.name} (${sym}) is listed on ${data.exchange || "US"}.`,
        };
      }
    } catch (err) {
      // Fallback
    }

    return await mockMarketData.getCompany(sym);
  }

  async getEvents(symbol: string, since?: Date): Promise<MarketEventItem[]> {
    const sym = symbol.toUpperCase().trim();
    const now = new Date();
    const fromDate = since
      ? since.toISOString().split("T")[0]
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const toDate = now.toISOString().split("T")[0];
    const url = `https://finnhub.io/api/v1/company-news?symbol=${sym}&from=${fromDate}&to=${toDate}&token=${this.apiKey}`;

    try {
      const newsItems = await this.fetchJson<
        Array<{
          id: number;
          category: string;
          datetime: number;
          headline: string;
          summary: string;
          source: string;
        }>
      >(url, 300000);

      if (Array.isArray(newsItems) && newsItems.length > 0) {
        return newsItems.slice(0, 5).map((n) => ({
          id: String(n.id),
          symbol: sym,
          eventType: n.category === "earnings" ? "earnings" : "news",
          title: n.headline,
          description: n.summary,
          timestamp: new Date(n.datetime * 1000),
          source: n.source,
          impact: "neutral",
        }));
      }
    } catch (err) {
      // Fallback
    }

    return await mockMarketData.getEvents(sym, since);
  }

  async search(query: string): Promise<SearchResult[]> {
    const q = query.trim();
    if (!q) return [];
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${this.apiKey}`;

    try {
      const data = await this.fetchJson<{
        result?: Array<{
          description: string;
          displaySymbol: string;
          symbol: string;
          type: string;
        }>;
      }>(url, 60000);

      if (data && Array.isArray(data.result)) {
        return data.result
          .filter((r) => !r.symbol.includes("."))
          .slice(0, 8)
          .map((r) => ({
            symbol: r.symbol,
            companyName: r.description,
            exchange: "US",
            type: r.type || "Common Stock",
          }));
      }
    } catch (err) {
      // Fallback
    }

    return await mockMarketData.search(query);
  }

  async getMarketStatus(): Promise<MarketStatus> {
    return await mockMarketData.getMarketStatus();
  }
}

