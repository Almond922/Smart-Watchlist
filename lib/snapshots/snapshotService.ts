import { prisma } from "../db";
import { marketDataProvider, Quote } from "../../providers/market-data";
import { evaluateStockChange, StockChangeAnalysis } from "../change-detection/engine";

export interface WatchlistWithChangesResponse {
  watchlistId: string;
  watchlistName: string;
  items: Array<StockChangeAnalysis & { itemId: string; isReviewed: boolean; sortOrder: number }>;
  sinceLastCheckedChanges: Array<
    StockChangeAnalysis & { itemId: string; isReviewed: boolean; changeDetectionId?: string }
  >;
  summary: {
    totalItems: number;
    meaningfulChangesCount: number;
    unreviewedChangesCount: number;
    topAttentionSymbol: string | null;
    highestAttentionLevel: string;
  };
}

export async function getOrCreateDefaultWatchlist(userId: string) {
  let user = await prisma.user.findUnique({
    where: { id: userId },
    include: { watchlists: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@signalwatch.local`,
        name: "Demo Investor",
        watchlists: {
          create: {
            name: "Core Market Radar",
          },
        },
      },
      include: { watchlists: true },
    });
  }

  let watchlist = user.watchlists[0];
  if (!watchlist) {
    watchlist = await prisma.watchlist.create({
      data: {
        userId: user.id,
        name: "Core Market Radar",
      },
    });
  }

  return watchlist;
}

export async function getWatchlistWithChanges(
  userId: string,
  watchlistId?: string
): Promise<WatchlistWithChangesResponse> {
  const watchlist = watchlistId
    ? await prisma.watchlist.findUnique({ where: { id: watchlistId } })
    : await getOrCreateDefaultWatchlist(userId);

  if (!watchlist) {
    throw new Error("Watchlist not found");
  }

  // Fetch watchlist items
  const items = await prisma.watchlistItem.findMany({
    where: { watchlistId: watchlist.id },
    orderBy: { sortOrder: "asc" },
  });

  // Fetch active unreviewed ChangeDetections for this user
  const recentDetections = await prisma.changeDetection.findMany({
    where: {
      userId,
      reviewedAt: null,
    },
  });
  const unreviewedDetectionMap = new Map<string, string>(); // symbol -> detectionId

  for (const det of recentDetections) {
    unreviewedDetectionMap.set(det.symbol, det.id);
  }

  const evaluatedItems: Array<
    StockChangeAnalysis & { itemId: string; isReviewed: boolean; sortOrder: number; changeDetectionId?: string }
  > = [];

  for (const item of items) {
    let quote: Quote;
    try {
      quote = await marketDataProvider.getQuote(item.symbol);
    } catch (err) {
      // Resilient fallback: serve cached snapshot values tagged as STALE
      const baseline = item.lastSeenPrice || 150.0;
      quote = {
        symbol: item.symbol,
        price: baseline,
        change: 0,
        changePercent: 0,
        volume: item.lastSeenVolume || 0,
        averageVolume: item.lastSeenVolume || 10000000,
        high: baseline,
        low: baseline,
        open: baseline,
        previousClose: baseline,
        high52Week: baseline * 1.15,
        low52Week: baseline * 0.85,
        timestamp: item.lastCheckedAt || new Date(Date.now() - 3600000),
        freshness: "STALE",
        dataSource: "Cached Snapshot (Upstream Degraded)",
        isStale: true,
        confidence: 0.3,
      };
    }

    let events: any[] = [];
    try {
      events = await marketDataProvider.getEvents(item.symbol, item.lastCheckedAt || undefined);
    } catch {
      events = [];
    }

    const analysis = evaluateStockChange({
      symbol: item.symbol,
      companyName: item.companyName,
      quote,
      lastCheckedAt: item.lastCheckedAt,
      lastSeenPrice: item.lastSeenPrice,
      lastSeenVolume: item.lastSeenVolume,
      events,
    });

    let detectionId = unreviewedDetectionMap.get(item.symbol);
    let isReviewed = true;

    if (analysis.isMeaningful) {
      if (!detectionId) {
        const detection = await prisma.changeDetection.create({
          data: {
            userId,
            symbol: item.symbol,
            attentionScore: analysis.attentionScore,
            attentionLevel: analysis.attentionLevel,
            reasons: JSON.stringify(analysis.scoreResult.signals),
          },
        });
        detectionId = detection.id;
        unreviewedDetectionMap.set(item.symbol, detectionId);
      }
      isReviewed = false;
    } else {
      isReviewed = true;
    }

    evaluatedItems.push({
      ...analysis,
      itemId: item.id,
      isReviewed,
      sortOrder: item.sortOrder,
      changeDetectionId: detectionId,
    });
  }

  // Sort: highest attention score first
  evaluatedItems.sort((a, b) => b.attentionScore - a.attentionScore);

  // Filter "Since You Last Checked" items:
  // Must be meaningful (Attention score >= 30) AND unreviewed!
  const sinceLastCheckedChanges = evaluatedItems
    .filter((item) => item.isMeaningful && !item.isReviewed)
    .map((item) => ({
      ...item,
      changeDetectionId: item.changeDetectionId,
    }));

  const unreviewedCount = sinceLastCheckedChanges.length;
  const meaningfulCount = evaluatedItems.filter((i) => i.isMeaningful).length;
  const topSymbol = sinceLastCheckedChanges.length > 0 ? sinceLastCheckedChanges[0].symbol : null;
  const highestAttentionLevel =
    sinceLastCheckedChanges.length > 0 ? sinceLastCheckedChanges[0].attentionLevel : "LOW";

  return {
    watchlistId: watchlist.id,
    watchlistName: watchlist.name,
    items: evaluatedItems,
    sinceLastCheckedChanges,
    summary: {
      totalItems: evaluatedItems.length,
      meaningfulChangesCount: meaningfulCount,
      unreviewedChangesCount: unreviewedCount,
      topAttentionSymbol: topSymbol,
      highestAttentionLevel,
    },
  };
}

export async function markItemReviewed(userId: string, symbol: string) {
  const sym = symbol.toUpperCase().trim();
  const now = new Date();

  // 1. Fetch current live quote to snapshot
  let quote: Quote;
  try {
    quote = await marketDataProvider.getQuote(sym);
  } catch {
    quote = {
      symbol: sym,
      price: 150.0,
      change: 0,
      changePercent: 0,
      volume: 10000000,
      averageVolume: 10000000,
      high: 150.0,
      low: 150.0,
      open: 150.0,
      previousClose: 150.0,
      high52Week: 180.0,
      low52Week: 120.0,
      timestamp: now,
      freshness: "STALE",
      dataSource: "Cached Snapshot",
      isStale: true,
      confidence: 0.3,
    };
  }

  // 2. Mark existing ChangeDetection records for this symbol as reviewed
  await prisma.changeDetection.updateMany({
    where: {
      userId,
      symbol: sym,
      reviewedAt: null,
    },
    data: {
      reviewedAt: now,
    },
  });

  // 3. Update the WatchlistItem snapshot values: lastCheckedAt, lastSeenPrice, lastSeenVolume
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { watchlists: true },
  });

  if (user) {
    for (const wl of user.watchlists) {
      await prisma.watchlistItem.updateMany({
        where: {
          watchlistId: wl.id,
          symbol: sym,
        },
        data: {
          lastCheckedAt: now,
          lastSeenPrice: quote.price,
          lastSeenVolume: quote.volume,
        },
      });
    }
  }

  return { symbol: sym, reviewedAt: now, lastSeenPrice: quote.price };
}

export async function markAllReviewed(userId: string, watchlistId?: string) {
  const now = new Date();

  await prisma.changeDetection.updateMany({
    where: {
      userId,
      reviewedAt: null,
    },
    data: {
      reviewedAt: now,
    },
  });

  const watchlist = watchlistId
    ? await prisma.watchlist.findUnique({ where: { id: watchlistId }, include: { items: true } })
    : await getOrCreateDefaultWatchlist(userId);

  if (watchlist) {
    const items = await prisma.watchlistItem.findMany({
      where: { watchlistId: watchlist.id },
    });

    for (const item of items) {
      try {
        const quote = await marketDataProvider.getQuote(item.symbol);
        await prisma.watchlistItem.update({
          where: { id: item.id },
          data: {
            lastCheckedAt: now,
            lastSeenPrice: quote.price,
            lastSeenVolume: quote.volume,
          },
        });
      } catch (e) {
        // Continue
      }
    }
  }

  return { success: true, timestamp: now };
}

