"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Trash2, Check, ExternalLink, Plus, Search, ShieldAlert } from "lucide-react";
import { StockChangeAnalysis } from "@/lib/change-detection/engine";
import { AttentionBadge, FreshnessBadge } from "../ui/Badge";

interface WatchlistTableProps {
  items: Array<StockChangeAnalysis & { itemId: string; isReviewed: boolean; sortOrder: number }>;
  onRemove: (symbol: string) => Promise<void>;
  onMarkReviewed: (symbol: string) => Promise<void>;
  onQuickAdd: (symbol: string) => Promise<void>;
  pendingSymbols: Set<string>;
}

export function WatchlistTable({
  items,
  onRemove,
  onMarkReviewed,
  onQuickAdd,
  pendingSymbols,
}: WatchlistTableProps) {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredItems = items.filter(
    (item) =>
      item.symbol.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.companyName.toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (items.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center my-6">
        <div className="w-12 h-12 rounded-xl bg-gold-soft text-gold flex items-center justify-center mx-auto mb-4">
          <Plus className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-text-primary">Build your market radar</h3>
        <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto mb-6">
          Add stocks you care about and we&rsquo;ll tell you what meaningfully changed since your last visit.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {["AAPL", "MSFT", "NVDA", "TSLA"].map((sym) => (
            <button
              key={sym}
              onClick={() => onQuickAdd(sym)}
              disabled={pendingSymbols.has(sym)}
              className="px-3.5 py-1.5 rounded-lg border border-border bg-surface-raised hover:bg-surface-hover hover:border-gold-border text-text-primary text-xs font-mono font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-3 h-3 text-gold" />
              <span>{sym}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-text-primary">
            Your Watchlist
          </h2>
          <p className="text-xs text-text-secondary">
            Tracking {items.length} assets with continuous anomaly detection
          </p>
        </div>

        {/* Filter Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter watchlist..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-raised/40 text-[11px] font-mono uppercase tracking-wider text-text-muted">
                <th className="py-3 px-4">Symbol / Company</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right">Today's Change</th>
                <th className="py-3 px-4 text-right">Since Last Check</th>
                <th className="py-3 px-4 text-right">Volume</th>
                <th className="py-3 px-4 text-center">Attention</th>
                <th className="py-3 px-4 text-center">Freshness</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {filteredItems.map((item) => {
                const isPending = pendingSymbols.has(item.symbol);
                const isTodayPos = (item.dailyChangePercent || 0) >= 0;
                const sinceLastDelta = item.percentDeltaSinceLastCheck;
                const isSincePos = (sinceLastDelta ?? item.dailyChangePercent) >= 0;

                return (
                  <tr
                    key={item.symbol}
                    className="hover:bg-surface-hover/50 transition-colors group"
                  >
                    {/* Symbol / Company */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Link
                          href={`/stock/${item.symbol}`}
                          className="font-mono font-bold text-text-primary hover:text-gold flex items-center gap-1"
                        >
                          <span>{item.symbol}</span>
                          <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <span className="text-text-secondary text-xs truncate max-w-[120px] lg:max-w-[180px]">
                          {item.companyName}
                        </span>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-text-primary">
                      ${item.currentPrice.toFixed(2)}
                    </td>

                    {/* Today's Change */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      <span
                        className={`inline-flex items-center justify-end gap-0.5 font-semibold ${
                          isTodayPos ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isTodayPos ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isTodayPos ? "+" : ""}
                          {item.dailyChangePercent.toFixed(2)}%
                        </span>
                      </span>
                    </td>

                    {/* Change Since Last Check */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      {sinceLastDelta !== null ? (
                        <span
                          className={`inline-flex items-center justify-end gap-0.5 font-semibold ${
                            isSincePos ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          <span>
                            {isSincePos ? "+" : ""}
                            {sinceLastDelta.toFixed(2)}%
                          </span>
                        </span>
                      ) : (
                        <span className="text-text-muted text-[11px]">—</span>
                      )}
                    </td>

                    {/* Volume & ratio */}
                    <td className="py-3.5 px-4 text-right font-mono text-text-secondary">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>{formatVolume(item.currentVolume)}</span>
                        {item.volumeRatio >= 1.5 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              item.volumeRatio >= 2.0
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-gold-soft text-gold"
                            }`}
                          >
                            {item.volumeRatio.toFixed(1)}×
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Attention Badge */}
                    <td className="py-3.5 px-4 text-center">
                      <AttentionBadge level={item.attentionLevel} score={item.attentionScore} size="sm" />
                    </td>

                    {/* Freshness */}
                    <td className="py-3.5 px-4 text-center">
                      <FreshnessBadge freshness={item.freshness} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/stock/${item.symbol}`}
                          title="Open Details"
                          className="p-1.5 rounded hover:bg-surface-raised text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>

                        {!item.isReviewed && item.isMeaningful && (
                          <button
                            onClick={() => onMarkReviewed(item.symbol)}
                            disabled={isPending}
                            title="Mark Reviewed"
                            className="p-1.5 rounded hover:bg-emerald-500/20 text-text-secondary hover:text-emerald-400 transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => onRemove(item.symbol)}
                          disabled={isPending}
                          title="Remove from Watchlist"
                          className="p-1.5 rounded hover:bg-rose-500/20 text-text-secondary hover:text-rose-400 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function formatVolume(vol: number): string {
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
  return String(vol);
}