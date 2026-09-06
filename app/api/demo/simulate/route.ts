import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mockMarketData } from "@/providers/market-data";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "reset"; // "reset", "simulate-jump", "clear-reviews"
    const userId = body.userId || "demo-user-1";

    if (action === "clear-reviews") {
      // Clear reviewedAt on all ChangeDetection records and set lastCheckedAt to 4 hours ago
      await prisma.changeDetection.updateMany({
        where: { userId },
        data: { reviewedAt: null },
      });

      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { watchlists: true },
      });

      if (user) {
        for (const wl of user.watchlists) {
          // Reset snapshots to previous baselines
          await prisma.watchlistItem.updateMany({
            where: { watchlistId: wl.id, symbol: "AAPL" },
            data: { lastCheckedAt: fourHoursAgo, lastSeenPrice: 227.45, lastSeenVolume: 35800000 },
          });
          await prisma.watchlistItem.updateMany({
            where: { watchlistId: wl.id, symbol: "NVDA" },
            data: { lastCheckedAt: fourHoursAgo, lastSeenPrice: 132.80, lastSeenVolume: 44200000 },
          });
          await prisma.watchlistItem.updateMany({
            where: { watchlistId: wl.id, symbol: "TSLA" },
            data: { lastCheckedAt: fourHoursAgo, lastSeenPrice: 248.50, lastSeenVolume: 42300000 },
          });
          await prisma.watchlistItem.updateMany({
            where: { watchlistId: wl.id, symbol: "MSFT" },
            data: { lastCheckedAt: fourHoursAgo, lastSeenPrice: 448.10, lastSeenVolume: 19500000 },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: "Simulated return after 4 hours away: Meaningful changes are unreviewed again!",
      });
    }

    if (action === "toggle-outage") {
      const current = mockMarketData.getForceFailure();
      mockMarketData.setForceFailure(!current);
      return NextResponse.json({
        success: true,
        outageActive: !current,
        message: !current ? "Upstream failure mode enabled" : "Upstream restored to healthy state",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Simulation command received",
    });
  } catch (error: any) {
    console.error("POST /api/demo/simulate error:", error);
    return NextResponse.json(
      { error: error.message || "Simulation failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    outageActive: mockMarketData.getForceFailure(),
  });
}

