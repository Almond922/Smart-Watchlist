import { NextRequest, NextResponse } from "next/server";
import { getWatchlistWithChanges } from "@/lib/snapshots/snapshotService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "demo-user-1";

    const data = await getWatchlistWithChanges(userId);
    return NextResponse.json({
      changes: data.sinceLastCheckedChanges,
      summary: data.summary,
    });
  } catch (error: any) {
    console.error("GET /api/changes error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch changes" },
      { status: 500 }
    );
  }
}

