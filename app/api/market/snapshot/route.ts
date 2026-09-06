import { NextResponse } from "next/server";
import { marketDataProvider } from "@/providers/market-data";

export async function GET() {
  try {
    const symbols = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL"];
    const quotes = await Promise.all(
      symbols.map(async (s) => {
        try {
          return await marketDataProvider.getQuote(s);
        } catch {
          return null;
        }
      })
    );

    const validQuotes = quotes.filter((q): q is NonNullable<typeof q> => q !== null);

    // Biggest gain
    const sortedByGain = [...validQuotes].sort((a, b) => b.changePercent - a.changePercent);
    const biggestGain = sortedByGain[0] || null;

    // Biggest drop
    const sortedByDrop = [...validQuotes].sort((a, b) => a.changePercent - b.changePercent);
    const biggestDrop = sortedByDrop[0] || null;

    // Unusual volume (volume / averageVolume)
    const sortedByVolumeRatio = [...validQuotes].sort(
      (a, b) => (b.volume / b.averageVolume) - (a.volume / a.averageVolume)
    );
    const unusualVolume = sortedByVolumeRatio[0] || null;

    // Moving significantly (|changePercent| >= 2%)
    const movingSignificantly = validQuotes.filter((q) => Math.abs(q.changePercent) >= 2.0);

    // Market status
    const marketStatus = await marketDataProvider.getMarketStatus();

    return NextResponse.json({
      biggestGain: biggestGain
        ? {
            symbol: biggestGain.symbol,
            price: biggestGain.price,
            changePercent: biggestGain.changePercent,
          }
        : null,
      biggestDrop: biggestDrop
        ? {
            symbol: biggestDrop.symbol,
            price: biggestDrop.price,
            changePercent: biggestDrop.changePercent,
          }
        : null,
      unusualVolume: unusualVolume
        ? {
            symbol: unusualVolume.symbol,
            volumeRatio: Math.round((unusualVolume.volume / unusualVolume.averageVolume) * 10) / 10,
            volume: unusualVolume.volume,
          }
        : null,
      movingSignificantlyCount: movingSignificantly.length,
      marketStatus,
      asOf: new Date(),
    });
  } catch (error: any) {
    console.error("GET /api/market/snapshot error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch market snapshot" },
      { status: 500 }
    );
  }
}

