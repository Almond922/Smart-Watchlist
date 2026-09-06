import {
  MarketDataProvider,
  Quote,
  HistoricalDataPoint,
  CompanyProfile,
  MarketEventItem,
  MarketStatus,
  SearchResult,
} from "./MarketDataProvider";

interface MockStockConfig {
  profile: CompanyProfile;
  basePrice: number;
  currentPrice: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  averageVolume: number;
  high52Week: number;
  low52Week: number;
  events: MarketEventItem[];
}

const NOW = new Date();
const ONE_HOUR_AGO = new Date(NOW.getTime() - 60 * 60 * 1000);
const THREE_HOURS_AGO = new Date(NOW.getTime() - 3 * 60 * 60 * 1000);
const YESTERDAY = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);
const TWO_DAYS_AGO = new Date(NOW.getTime() - 48 * 60 * 60 * 1000);

const MOCK_STOCKS: Record<string, MockStockConfig> = {
  AAPL: {
    profile: {
      symbol: "AAPL",
      companyName: "Apple Inc.",
      exchange: "NASDAQ",
      industry: "Consumer Electronics",
      marketCap: 3580000000000,
      description: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories.",
    },
    basePrice: 227.45,
    currentPrice: 238.42,
    open: 228.10,
    high: 239.10,
    low: 227.80,
    previousClose: 227.45,
    volume: 82400000,
    averageVolume: 35800000, // 2.3x volume ratio -> unusual volume!
    high52Week: 242.50,
    low52Week: 164.08,
    events: [
      {
        id: "aapl-1",
        symbol: "AAPL",
        eventType: "earnings",
        title: "Apple Reports Record Services Revenue and Strong Q3 Guidance",
        description: "Services segment jumped 14% year-over-year while gross margins expanded to 46.2%, outpacing consensus estimates.",
        timestamp: TWO_DAYS_AGO,
        source: "Bloomberg",
        impact: "positive",
      },
      {
        id: "aapl-2",
        symbol: "AAPL",
        eventType: "analyst",
        title: "Morgan Stanley Raises AAPL Price Target to $260 on AI Ecosystem Strength",
        description: "Analyst highlights rapid adoption of Apple Intelligence features and upgraded replacement cycle timeline.",
        timestamp: ONE_HOUR_AGO,
        source: "Morgan Stanley Research",
        impact: "positive",
      },
    ],
  },
  NVDA: {
    profile: {
      symbol: "NVDA",
      companyName: "NVIDIA Corporation",
      exchange: "NASDAQ",
      industry: "Semiconductors",
      marketCap: 3120000000000,
      description: "NVIDIA designs graphics processing units (GPUs) for the gaming and professional markets, as well as systems-on-a-chip for mobile computing and automotive markets.",
    },
    basePrice: 132.80,
    currentPrice: 124.95,
    open: 131.50,
    high: 132.10,
    low: 123.80,
    previousClose: 132.80,
    volume: 98500000,
    averageVolume: 44200000, // 2.23x volume ratio -> high volume selloff
    high52Week: 140.76,
    low52Week: 45.11,
    events: [
      {
        id: "nvda-1",
        symbol: "NVDA",
        eventType: "news",
        title: "Export Control Review Raised in Commerce Department Committee",
        description: "Regulatory sub-committee convenes to evaluate latest advanced packaging chip thresholds for cross-border transit.",
        timestamp: THREE_HOURS_AGO,
        source: "Reuters",
        impact: "negative",
      },
    ],
  },
  TSLA: {
    profile: {
      symbol: "TSLA",
      companyName: "Tesla, Inc.",
      exchange: "NASDAQ",
      industry: "Automotive & Clean Energy",
      marketCap: 810000000000,
      description: "Tesla designs, develops, manufactures, sells, and leases electric vehicles, energy storage systems, and solar panels.",
    },
    basePrice: 248.50,
    currentPrice: 254.80,
    open: 249.20,
    high: 256.40,
    low: 248.00,
    previousClose: 248.50,
    volume: 68100000,
    averageVolume: 42300000, // 1.61x volume ratio -> elevated
    high52Week: 260.00, // current 254.80 is within 2.0% of 52w high!
    low52Week: 138.80,
    events: [
      {
        id: "tsla-1",
        symbol: "TSLA",
        eventType: "news",
        title: "Full Self-Driving V13 Fleet Deployment Initiated in North America",
        description: "Tesla rolls out next-generation end-to-end neural network model with reported 3x reduction in driver interventions.",
        timestamp: ONE_HOUR_AGO,
        source: "Electrek",
        impact: "positive",
      },
    ],
  },
  MSFT: {
    profile: {
      symbol: "MSFT",
      companyName: "Microsoft Corporation",
      exchange: "NASDAQ",
      industry: "Software & Cloud Services",
      marketCap: 3340000000000,
      description: "Microsoft develops and supports software, services, devices and solutions including Azure, Windows, and Office 365.",
    },
    basePrice: 448.10,
    currentPrice: 449.60,
    open: 448.30,
    high: 450.40,
    low: 447.90,
    previousClose: 448.10,
    volume: 18200000,
    averageVolume: 19500000, // 0.93x volume ratio -> normal / quiet
    high52Week: 468.35,
    low52Week: 309.45,
    events: [],
  },
  AMZN: {
    profile: {
      symbol: "AMZN",
      companyName: "Amazon.com, Inc.",
      exchange: "NASDAQ",
      industry: "E-Commerce & Cloud Computing",
      marketCap: 1980000000000,
      description: "Amazon focuses on e-commerce, cloud computing, online advertising, digital streaming, and artificial intelligence.",
    },
    basePrice: 184.20,
    currentPrice: 186.95,
    open: 184.50,
    high: 187.40,
    low: 183.90,
    previousClose: 184.20,
    volume: 41200000,
    averageVolume: 36500000, // 1.13x volume ratio -> normal
    high52Week: 201.20,
    low52Week: 118.35,
    events: [
      {
        id: "amzn-1",
        symbol: "AMZN",
        eventType: "news",
        title: "AWS Announces Expanded Custom Silicon Trainium2 Deployments",
        description: "Amazon Web Services expands availability of cost-efficient AI acceleration hardware to enterprise tier.",
        timestamp: TWO_DAYS_AGO,
        source: "TechCrunch",
        impact: "positive",
      },
    ],
  },
  GOOGL: {
    profile: {
      symbol: "GOOGL",
      companyName: "Alphabet Inc.",
      exchange: "NASDAQ",
      industry: "Internet & AI",
      marketCap: 2150000000000,
      description: "Alphabet is the parent company of Google, YouTube, Waymo, DeepMind, and other technology subsidiaries.",
    },
    basePrice: 178.50,
    currentPrice: 177.10,
    open: 178.20,
    high: 179.00,
    low: 176.40,
    previousClose: 178.50,
    volume: 22100000,
    averageVolume: 24500000, // 0.90x volume ratio -> quiet
    high52Week: 191.75,
    low52Week: 120.21,
    events: [],
  },
};

export class MockMarketDataProvider implements MarketDataProvider {
  name = "mock";
  private forceFailure = false;

  setForceFailure(val: boolean) {
    this.forceFailure = val;
  }

  getForceFailure(): boolean {
    return this.forceFailure;
  }

  async getQuote(symbol: string): Promise<Quote> {
    if (this.forceFailure) {
      throw new Error("Simulated upstream market data outage (503 Service Unavailable)");
    }

    const sym = symbol.toUpperCase().trim();
    const item = MOCK_STOCKS[sym];

    if (!item) {
      // Return a realistic synthetic quote for any unknown symbol added by the user
      const syntheticBase = 150.0;
      const syntheticPrice = 152.4;
      const change = syntheticPrice - syntheticBase;
      return {
        symbol: sym,
        price: syntheticPrice,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round((change / syntheticBase) * 10000) / 100,
        volume: 12000000,
        averageVolume: 10000000,
        high: syntheticPrice + 1.2,
        low: syntheticBase - 0.8,
        open: syntheticBase,
        previousClose: syntheticBase,
        high52Week: 180.0,
        low52Week: 110.0,
        timestamp: new Date(),
        freshness: "LIVE",
        dataSource: "MockMarketDataProvider",
        isStale: false,
        confidence: 1.0,
      };
    }

    const change = item.currentPrice - item.previousClose;
    const changePercent = (change / item.previousClose) * 100;

    return {
      symbol: item.profile.symbol,
      price: item.currentPrice,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: item.volume,
      averageVolume: item.averageVolume,
      high: item.high,
      low: item.low,
      open: item.open,
      previousClose: item.previousClose,
      high52Week: item.high52Week,
      low52Week: item.low52Week,
      timestamp: new Date(),
      freshness: "LIVE",
      dataSource: "MockMarketDataProvider",
      isStale: false,
      confidence: 1.0,
    };
  }

  async getHistoricalData(symbol: string, days = 30): Promise<HistoricalDataPoint[]> {
    const sym = symbol.toUpperCase().trim();
    const item = MOCK_STOCKS[sym];
    const base = item ? item.previousClose : 150.0;
    const avgVol = item ? item.averageVolume : 15000000;

    const points: HistoricalDataPoint[] = [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    // Generate pseudo-deterministic series walking up to current price
    let currentWalk = base * 0.92;
    for (let i = days; i >= 0; i--) {
      const dateStr = new Date(now - i * dayMs).toISOString().split("T")[0];
      // Controlled random-walk drift
      const drift = Math.sin(i * 0.4) * 1.5 + (days - i) * (base * 0.08 / days);
      const open = Math.round((currentWalk + drift) * 100) / 100;
      const high = Math.round((open * 1.015) * 100) / 100;
      const low = Math.round((open * 0.985) * 100) / 100;
      const close = i === 0 && item ? item.currentPrice : Math.round(((open + high + low) / 3) * 100) / 100;
      
      let vol = Math.round(avgVol * (0.8 + Math.sin(i * 0.7) * 0.3));
      if (i === 0 && item) {
        vol = item.volume;
      }

      points.push({
        date: dateStr,
        open,
        high,
        low,
        close,
        volume: vol,
      });
      currentWalk = close;
    }

    return points;
  }

  async getCompany(symbol: string): Promise<CompanyProfile> {
    const sym = symbol.toUpperCase().trim();
    if (MOCK_STOCKS[sym]) {
      return MOCK_STOCKS[sym].profile;
    }
    return {
      symbol: sym,
      companyName: `${sym} Corp`,
      exchange: "NASDAQ",
      industry: "Technology",
      marketCap: 50000000000,
      description: `${sym} Corporation is a publicly traded enterprise listed on the NASDAQ exchange.`,
    };
  }

  async getEvents(symbol: string, since?: Date): Promise<MarketEventItem[]> {
    const sym = symbol.toUpperCase().trim();
    const stock = MOCK_STOCKS[sym];
    if (!stock) return [];

    if (!since) return stock.events;
    return stock.events.filter((e) => e.timestamp >= since);
  }

  async search(query: string): Promise<SearchResult[]> {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const all = Object.values(MOCK_STOCKS).map((s) => ({
      symbol: s.profile.symbol,
      companyName: s.profile.companyName,
      exchange: s.profile.exchange,
      type: "Common Stock",
    }));

    return all.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q)
    );
  }

  async getMarketStatus(): Promise<MarketStatus> {
    // US Market trading hours check (9:30 AM - 4:00 PM Eastern, Monday-Friday)
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcDay = now.getUTCDay();

    // NYSE is UTC-4 or UTC-5 (EDT 13:30 - 20:00 UTC)
    const isWeekend = utcDay === 0 || utcDay === 6;
    const isWeekday = !isWeekend;
    const isRegularTradingHours =
      isWeekday &&
      (utcHours > 13 || (utcHours === 13 && utcMinutes >= 30)) &&
      utcHours < 20;

    if (isRegularTradingHours) {
      return {
        isOpen: true,
        session: "REGULAR",
        message: "US Markets Open (Regular Session 9:30 AM – 4:00 PM ET)",
        asOf: now,
      };
    }

    return {
      isOpen: false,
      session: "CLOSED",
      message: "US Markets Closed — displaying latest official session data",
      asOf: now,
    };
  }
}

export const mockMarketData = new MockMarketDataProvider();

