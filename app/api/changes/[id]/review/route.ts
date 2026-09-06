import { NextRequest, NextResponse } from "next/server";
import { markItemReviewed } from "@/lib/snapshots/snapshotService";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || "demo-user-1";

    let symbol = body.symbol;

    // If id looks like a symbol (e.g. AAPL) or a cuid
    if (!symbol && id.length <= 6 && !id.includes("-")) {
      symbol = id;
    }

    if (!symbol) {
      // Find the change detection record to get the symbol
      const record = await prisma.changeDetection.findUnique({
        where: { id },
      });
      if (record) {
        symbol = record.symbol;
      }
    }

    if (!symbol) {
      return NextResponse.json(
        { error: "Could not identify stock symbol for review" },
        { status: 400 }
      );
    }

    const result = await markItemReviewed(userId, symbol);
    return NextResponse.json({
      success: true,
      symbol,
      reviewedAt: result.reviewedAt,
      snapshotPrice: result.lastSeenPrice,
    });
  } catch (error: any) {
    console.error("POST /api/changes/[id]/review error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark change as reviewed" },
      { status: 500 }
    );
  }
}

