import { MarketDataProvider } from "./MarketDataProvider";
import { MockMarketDataProvider, mockMarketData } from "./MockMarketDataProvider";
import { RealMarketDataProvider } from "./RealMarketDataProvider";

const apiKey = process.env.FINNHUB_API_KEY || process.env.MARKET_DATA_API_KEY || "";
const preferredProvider = (process.env.MARKET_DATA_PROVIDER || "mock").toLowerCase();

let activeProvider: MarketDataProvider;

if (preferredProvider === "finnhub" && apiKey.trim()) {
  activeProvider = new RealMarketDataProvider(apiKey);
} else {
  activeProvider = mockMarketData;
}

export const marketDataProvider = activeProvider;
export { MockMarketDataProvider, RealMarketDataProvider, mockMarketData };
export * from "./MarketDataProvider";

