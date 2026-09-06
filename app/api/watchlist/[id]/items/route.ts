import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateSymbol } from "@/lib/validation/normalizer";
import { marketDataProvider } from "@/providers/market-data";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: watchlistId } = await params;
    const body = await request.json();
    const rawSymbol = body.symbol;
    const companyNameInput = body.companyName;

    const validation = validateSymbol(rawSymbol);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.reasons.join(", ") },
        { status: 400 }
      );
    }

    const symbol = validation.sanitizedSymbol;

    // Check duplicate
    const existing = await prisma.watchlistItem.findUnique({
      where: {
        watchlistId_symbol: {
          watchlistId,
          symbol,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `${symbol} is already in this watchlist`, alreadyExists: true },
        { status: 409 }
      );
    }

    // Fetch company info & quote for baseline snapshot
    let companyName = companyNameInput;
    let quotePrice: number | null = null;
    let quoteVolume: number | null = null;

    try {
      const company = await marketDataProvider.getCompany(symbol);
      companyName = companyName || company.companyName;
      const quote = await marketDataProvider.getQuote(symbol);
      quotePrice = quote.price;
      quoteVolume = quote.volume;
    } catch (e) {
      companyName = companyName || `${symbol} Corp`;
    }

    const count = await prisma.watchlistItem.count({ where: { watchlistId } });

    const item = await prisma.watchlistItem.create({
      data: {
        watchlistId,
        symbol,
        companyName,
        sortOrder: count,
        lastCheckedAt: new Date(),
        lastSeenPrice: quotePrice,
        lastSeenVolume: quoteVolume,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/watchlist/[id]/items error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add stock to watchlist" },
      { status: 500 }
    );
  }
}

