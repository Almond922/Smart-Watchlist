import { NextRequest, NextResponse } from "next/server";
import { markAllReviewed } from "@/lib/snapshots/snapshotService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: watchlistId } = await params;
    const body = await request.json().catch(() => ({}));
    const userId = body.userId || "demo-user-1";

    const result = await markAllReviewed(userId, watchlistId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/watchlist/[id]/check error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark watchlist as reviewed" },
      { status: 500 }
    );
  }
}

