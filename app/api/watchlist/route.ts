import { NextRequest, NextResponse } from "next/server";
import { getWatchlistWithChanges, getOrCreateDefaultWatchlist } from "@/lib/snapshots/snapshotService";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "demo-user-1";
    const watchlistId = searchParams.get("watchlistId") || undefined;

    const data = await getWatchlistWithChanges(userId, watchlistId);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/watchlist error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || "demo-user-1";
    const name = body.name?.trim() || "New Watchlist";

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await getOrCreateDefaultWatchlist(userId);
    }

    const watchlist = await prisma.watchlist.create({
      data: {
        userId,
        name,
      },
    });

    return NextResponse.json(watchlist, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/watchlist error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create watchlist" },
      { status: 500 }
    );
  }
}

