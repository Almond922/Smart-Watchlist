"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { StockChart } from "@/components/charts/StockChart";
import { AttentionScoreMeter } from "@/components/stock/AttentionScoreMeter";
import { AttentionBadge, FreshnessBadge } from "@/components/ui/Badge";
import { StockChangeAnalysis } from "@/lib/change-detection/engine";
import { HistoricalDataPoint, MarketEventItem } from "@/providers/market-data";

interface StockPageProps {
  params: Promise<{ symbol: string }>;
}

export default function StockDetailPage({ params }: StockPageProps) {
  const { symbol: rawSymbol } = use(params);
  const symbol = rawSymbol.toUpperCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stockAnalysis, setStockAnalysis] = useState<StockChangeAnalysis | null>(null);
  const [history, setHistory] = useState<HistoricalDataPoint[]>([]);
  const [events, setEvents] = useState<MarketEventItem[]>([]);
  const [isReviewed, setIsReviewed] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    loadStockData();
  }, [symbol]);

  async function loadStockData() {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch watchlist analysis for this stock
      const wlRes = await fetch(`/api/watchlist`);
      const wlData = await wlRes.json();

      const item = wlData.items?.find(
        (i: StockChangeAnalysis) => i.symbol.toUpperCase() === symbol
      );

      if (item) {
        setStockAnalysis(item);
        setIsReviewed(item.isReviewed);
      } else {
        // Fallback: fetch directly from quote API
        const qRes = await fetch(`/api/market/quote/${symbol}`);
        if (!qRes.ok) throw new Error("Stock not found");
        const quote = await qRes.json();

        // Synthetic fallback analysis
        setStockAnalysis({
          symbol,
          companyName: quote.company?.companyName || `${symbol} Corp`,
          currentPrice: quote.price,
          dailyChange: quote.change,
          dailyChangePercent: quote.changePercent,
          lastSeenPrice: quote.price * 0.97,
          priceDeltaSinceLastCheck: quote.change,
          percentDeltaSinceLastCheck: quote.changePercent,
          currentVolume: quote.volume,
          averageVolume: quote.averageVolume,
          volumeRatio: 1.2,
          isUnusualVolume: false,
          high: quote.high,
          low: quote.low,
          high52Week: quote.high52Week,
          low52Week: quote.low52Week,
          newEvents: [],
          newEventCount: 0,
          hasEarningsEvent: false,
          attentionScore: 42,
          attentionLevel: "MEDIUM",
          isMeaningful: true,
          scoreResult: {
            score: 42,
            level: "MEDIUM",
            isMeaningful: true,
            signals: [],
            breakdown: { pricePoints: 15, volumePoints: 12, intradayPoints: 10, eventPoints: 5, extremePoints: 0 },
          },
          explanation: {
            headline: "Market Activity Update",
            bulletPoints: [`Price moved +${quote.changePercent}% today`],
            narrativeReason: "Stock is tracking within moderate baseline volatility bands.",
            keyDrivers: ["daily price shift"],
          },
          freshness: quote.freshness || "LIVE",
          dataSource: quote.dataSource || "SignalWatch Normalized",
          isStale: false,
          timestamp: new Date(),
          lastCheckedAt: null,
          isFirstView: true,
        });
      }

      // 2. Fetch historical data
      const histRes = await fetch(`/api/market/history/${symbol}?days=90`);
      if (histRes.ok) {
        const histData = await histRes.json();
        setHistory(histData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load stock details");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkReviewed() {
    setReviewing(true);
    try {
      const res = await fetch(`/api/changes/${symbol}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      if (res.ok) {
        setIsReviewed(true);
      }
    } catch (err) {
      // Continue
    } finally {
      setReviewing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12141a] text-text-primary flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-text-muted">Loading intelligence for {symbol}...</span>
        </div>
      </div>
    );
  }

  if (error || !stockAnalysis) {
    return (
      <div className="min-h-screen bg-[#12141a] text-text-primary p-6">
        <div className="max-w-4xl mx-auto py-12 text-center">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold">Unable to Load Stock Details</h2>
          <p className="text-xs text-text-secondary mt-1 mb-6">{error || "Asset not found"}</p>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-surface-raised border border-border text-xs font-medium inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isTodayPos = stockAnalysis.dailyChangePercent >= 0;
  const isSincePos = (stockAnalysis.percentDeltaSinceLastCheck ?? stockAnalysis.dailyChangePercent) >= 0;

  // 52-Week range progress calculation
  const curPrice = stockAnalysis.currentPrice;
  const low52 = stockAnalysis.low52Week || curPrice * 0.7;
  const high52 = stockAnalysis.high52Week || curPrice * 1.3;
  const range52Pct = Math.min(100, Math.max(0, ((curPrice - low52) / (high52 - low52)) * 100));

  return (
    <div className="min-h-screen bg-[#12141a] text-text-primary pb-16">
      {/* Top Bar */}
      <div className="border-b border-border bg-[#12141a]/90 backdrop-blur sticky top-0 z-20 px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Watchlist Radar</span>
          </Link>

          <div className="flex items-center gap-2">
            <FreshnessBadge freshness={stockAnalysis.freshness} />
            <span className="text-[11px] font-mono text-text-muted hidden sm:inline">
              Source: {stockAnalysis.dataSource}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        {/* HERO SECTION: "What Changed Since You Last Checked" */}
        <div className="bg-gradient-to-br from-surface to-surface-raised border border-border rounded-xl p-6 mb-8 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-semibold uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>What Changed Since You Last Checked</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
                {stockAnalysis.explanation.headline}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <AttentionBadge
                level={stockAnalysis.attentionLevel}
                score={stockAnalysis.attentionScore}
              />
              {!isReviewed ? (
                <button
                  onClick={handleMarkReviewed}
                  disabled={reviewing}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{reviewing ? "Marking..." : "Mark Reviewed"}</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                  <Check className="w-3.5 h-3.5" />
                  Reviewed
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
                Identified Shifts:
              </div>
              <ul className="space-y-2">
                {stockAnalysis.explanation.bulletPoints.map((bp, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-primary">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>{bp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-surface/80 border border-border/70 rounded-lg p-4">
              <div className="text-xs font-semibold text-text-secondary mb-1">
                Algorithmic Context & Drivers:
              </div>
              <p className="text-xs text-text-primary leading-relaxed">
                &ldquo;{stockAnalysis.explanation.narrativeReason}&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* STOCK HEADER & 52-WEEK RANGE */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 bg-surface border border-border rounded-xl p-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-3xl font-bold tracking-tight text-text-primary">
                {stockAnalysis.symbol}
              </h1>
              <span className="text-sm font-medium text-text-secondary">
                {stockAnalysis.companyName}
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-4 mt-3">
              <span className="font-mono text-3xl font-bold text-text-primary">
                ${stockAnalysis.currentPrice.toFixed(2)}
              </span>

              <div
                className={`font-mono text-sm font-bold flex items-center gap-0.5 ${
                  isTodayPos ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isTodayPos ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span>
                  {isTodayPos ? "+" : ""}
                  {stockAnalysis.dailyChange.toFixed(2)} ({stockAnalysis.dailyChangePercent.toFixed(2)}%)
                </span>
                <span className="text-xs text-text-muted font-normal ml-1">Today</span>
              </div>

              {stockAnalysis.percentDeltaSinceLastCheck !== null && (
                <div
                  className={`font-mono text-sm font-bold flex items-center gap-0.5 pl-3 border-l border-border ${
                    isSincePos ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  <span>
                    {isSincePos ? "+" : ""}
                    {stockAnalysis.percentDeltaSinceLastCheck.toFixed(2)}%
                  </span>
                  <span className="text-xs text-text-muted font-normal ml-1">Since Last Check</span>
                </div>
              )}
            </div>
          </div>

          {/* 52-Week Range Bar */}
          <div className="w-full lg:w-72 bg-surface-raised border border-border rounded-lg p-3 text-xs">
            <div className="flex justify-between text-[11px] font-mono text-text-muted mb-1.5">
              <span>52W Low: ${low52.toFixed(2)}</span>
              <span>52W High: ${high52.toFixed(2)}</span>
            </div>
            <div className="w-full h-2 bg-surface rounded-full overflow-hidden relative">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${range52Pct}%` }}
              />
            </div>
            <div className="text-right font-mono text-[10px] text-text-muted mt-1">
              Current at {range52Pct.toFixed(0)}% of 52-week range
            </div>
          </div>
        </div>

        {/* MAIN GRID: Charts & Attention Scoring Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          {/* Left 2 Cols: Interactive Recharts Chart */}
          <div className="lg:col-span-2">
            <StockChart
              data={history}
              symbol={stockAnalysis.symbol}
              isPositive={isTodayPos}
            />
          </div>

          {/* Right 1 Col: Attention Engine Meter & Signals */}
          <div>
            <AttentionScoreMeter scoreResult={stockAnalysis.scoreResult} />
          </div>
        </div>

        {/* EVENTS & NEWS SECTION */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-blue-400" />
            <h3 className="font-semibold text-sm text-text-primary">
              Recent Events & News Disclosures
            </h3>
          </div>

          {stockAnalysis.newEvents.length === 0 ? (
            <p className="text-xs text-text-muted py-4">
              No new corporate filings, earnings announcements, or material disclosures reported since your last check.
            </p>
          ) : (
            <div className="space-y-4 divide-y divide-border/50">
              {stockAnalysis.newEvents.map((ev) => (
                <div key={ev.id} className="pt-3 first:pt-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {ev.eventType}
                    </span>
                    <span className="text-xs text-text-muted font-mono">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="text-xs text-text-muted">• {ev.source}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-text-primary">
                    {ev.title}
                  </h4>
                  {ev.description && (
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {ev.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

