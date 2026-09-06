import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sanitizeSymbol } from "@/lib/validation/normalizer";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; symbol: string }> }
) {
  try {
    const { id: watchlistId, symbol: rawSymbol } = await params;
    const symbol = sanitizeSymbol(rawSymbol);

    const deleted = await prisma.watchlistItem.deleteMany({
      where: {
        watchlistId,
        symbol,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: `Stock ${symbol} not found on watchlist` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, removed: symbol });
  } catch (error: any) {
    console.error("DELETE /api/watchlist/[id]/items/[symbol] error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove stock from watchlist" },
      { status: 500 }
    );
  }
}

