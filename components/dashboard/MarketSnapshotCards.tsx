"use client";

import React from "react";
import { TrendingUp, TrendingDown, Zap, Clock, ShieldCheck, Activity } from "lucide-react";

interface MarketSnapshotData {
  biggestGain: { symbol: string; price: number; changePercent: number } | null;
  biggestDrop: { symbol: string; price: number; changePercent: number } | null;
  unusualVolume: { symbol: string; volumeRatio: number; volume: number } | null;
  movingSignificantlyCount: number;
  marketStatus?: {
    isOpen: boolean;
    session: string;
    message: string;
  };
}

export function MarketSnapshotCards({ data }: { data: MarketSnapshotData | null }) {
  if (!data) return null;

  return (
    <section className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-gold" />
        <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-text-secondary">
          Market Snapshot & Regimes
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Biggest Gainer */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted mb-2">
            <span>Biggest Gain</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          {data.biggestGain ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-base text-text-primary">
                  {data.biggestGain.symbol}
                </span>
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  +{data.biggestGain.changePercent.toFixed(2)}%
                </span>
              </div>
              <span className="font-mono text-xs text-text-secondary">
                ${data.biggestGain.price.toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </div>

        {/* Card 2: Biggest Drop */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted mb-2">
            <span>Biggest Drop</span>
            <TrendingDown className="w-4 h-4 text-rose-400" />
          </div>
          {data.biggestDrop ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-base text-text-primary">
                  {data.biggestDrop.symbol}
                </span>
                <span className="font-mono text-xs font-semibold text-rose-400">
                  {data.biggestDrop.changePercent.toFixed(2)}%
                </span>
              </div>
              <span className="font-mono text-xs text-text-secondary">
                ${data.biggestDrop.price.toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </div>

        {/* Card 3: Unusual Volume */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted mb-2">
            <span>Unusual Volume</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          {data.unusualVolume ? (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono font-bold text-base text-text-primary">
                  {data.unusualVolume.symbol}
                </span>
                <span className="font-mono text-xs font-semibold text-amber-400">
                  {data.unusualVolume.volumeRatio}× normal
                </span>
              </div>
              <span className="font-mono text-xs text-text-secondary">
                Institutional participation
              </span>
            </div>
          ) : (
            <span className="text-xs text-text-muted">—</span>
          )}
        </div>

        {/* Card 4: Moving Significantly */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted mb-2">
            <span>Volatile Movers</span>
            <Clock className="w-4 h-4 text-gold" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-base text-text-primary">
                {data.movingSignificantlyCount}
              </span>
              <span className="text-xs text-text-secondary">assets &gt; 2.0%</span>
            </div>
            <span className="text-xs text-text-muted">
              {data.marketStatus?.isOpen ? "Active Session" : "Closed Session"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}