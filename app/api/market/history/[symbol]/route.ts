import { NextRequest, NextResponse } from "next/server";
import { marketDataProvider } from "@/providers/market-data";
import { sanitizeSymbol } from "@/lib/validation/normalizer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol: rawSymbol } = await params;
    const symbol = sanitizeSymbol(rawSymbol);
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const history = await marketDataProvider.getHistoricalData(symbol, days);
    return NextResponse.json(history);
  } catch (error: any) {
    console.error("GET /api/market/history error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch historical data" },
      { status: 500 }
    );
  }
}
