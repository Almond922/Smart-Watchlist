"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Check, ExternalLink, Flame, Info, Clock } from "lucide-react";
import { StockChangeAnalysis } from "@/lib/change-detection/engine";
import { AttentionBadge, FreshnessBadge } from "../ui/Badge";

interface SinceYouLastCheckedProps {
  changes: Array<StockChangeAnalysis & { itemId: string; isReviewed: boolean; changeDetectionId?: string }>;
  onMarkReviewed: (symbol: string, detectionId?: string) => Promise<void>;
  pendingSymbols: Set<string>;
}

export function SinceYouLastChecked({
  changes,
  onMarkReviewed,
  pendingSymbols,
}: SinceYouLastCheckedProps) {
  if (changes.length === 0) {
    return (
      <div className="mb-10 bg-surface/50 border border-border/80 border-dashed rounded-xl p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5" />
        </div>
        <h3 className="text-base font-semibold text-text-primary">
          All Monitored Changes Acknowledged
        </h3>
        <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
          You are completely up to date. When abnormal price fluctuations, volume anomalies, or breaking events occur, cards will appear here.
        </p>
      </div>
    );
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <h2 className="text-lg font-bold tracking-tight text-text-primary">
            Since You Last Checked
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-semibold border border-amber-500/30">
            {changes.length} {changes.length === 1 ? "FLAGGED" : "FLAGGED"}
          </span>
        </div>
        <span className="text-xs text-text-muted hidden sm:inline">
          Showing only stocks with meaningful shifts
        </span>
      </div>

      {/* Grid of Meaningful Change Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {changes.map((item) => {
          const isPending = pendingSymbols.has(item.symbol);
          const isPositive = (item.dailyChangePercent || 0) >= 0;
          const deltaSign = (item.percentDeltaSinceLastCheck ?? item.dailyChangePercent) >= 0 ? "+" : "";

          // Visual card glow based on attention level
          const cardGlow =
            item.attentionLevel === "CRITICAL"
              ? "border-rose-500/40 shadow-rose-500/5 hover:border-rose-500/70"
              : item.attentionLevel === "HIGH"
              ? "border-amber-500/40 shadow-amber-500/5 hover:border-amber-500/70"
              : "border-gold-border shadow-black/20 hover:border-gold";

          return (
            <div
              key={item.symbol}
              className={`bg-surface border rounded-xl p-5 flex flex-col justify-between transition-all duration-200 shadow-md ${cardGlow}`}
            >
              <div>
                {/* Card Top: Ticker, Name, Price, Badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/stock/${item.symbol}`}
                        className="font-mono text-lg font-bold text-text-primary hover:text-gold transition-colors flex items-center gap-1 group"
                      >
                        <span>{item.symbol}</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-gold" />
                      </Link>
                      <span className="text-xs text-text-secondary truncate max-w-[140px] sm:max-w-[200px]">
                        {item.companyName}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-base font-bold text-text-primary">
                      ${item.currentPrice.toFixed(2)}
                    </div>
                    <div
                      className={`font-mono text-xs font-semibold flex items-center justify-end gap-0.5 ${
                        isPositive ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isPositive ? "+" : ""}
                        {item.dailyChangePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attention Badge & Freshness */}
                <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-border">
                  <AttentionBadge level={item.attentionLevel} score={item.attentionScore} />
                  <FreshnessBadge freshness={item.freshness} />
                </div>

                {/* Bullet Points: Since your last check */}
                <div className="mb-4">
                  <div className="text-[11px] font-semibold font-mono uppercase tracking-wider text-text-muted mb-2">
                    Since your last check:
                  </div>
                  <ul className="space-y-1.5">
                    {item.explanation.bulletPoints.map((bp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-text-primary">
                        <span className="text-gold font-bold mt-0.5">•</span>
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Why It Matters Box */}
                <div className="bg-surface-raised/80 border border-border/80 rounded-lg p-3 mb-5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-secondary mb-1">
                    <Info className="w-3.5 h-3.5 text-gold" />
                    <span>Why it matters:</span>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed">
                    &ldquo;{item.explanation.narrativeReason}&rdquo;
                  </p>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
                <Link
                  href={`/stock/${item.symbol}`}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface-raised hover:bg-surface-hover text-text-primary text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <span>View Details</span>
                  <ArrowUpRight className="w-3 h-3 text-text-secondary" />
                </Link>

                <button
                  onClick={() => onMarkReviewed(item.symbol, item.changeDetectionId)}
                  disabled={isPending}
                  className="px-3.5 py-1.5 rounded-lg bg-surface-raised hover:bg-emerald-500/15 border border-border hover:border-emerald-500/30 text-text-secondary hover:text-emerald-400 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isPending ? "Reviewing..." : "Mark Reviewed"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}