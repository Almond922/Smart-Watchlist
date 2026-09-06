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

    const quote = await marketDataProvider.getQuote(symbol);
    const company = await marketDataProvider.getCompany(symbol);

    return NextResponse.json({
      ...quote,
      company,
    });
  } catch (error: any) {
    console.error("GET /api/market/quote error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch market quote" },
      { status: 503 }
    );
  }
}
