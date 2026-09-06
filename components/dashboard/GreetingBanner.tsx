"use client";

import React, { useState } from "react";
import { CheckCheck, Sparkles, Sliders, AlertTriangle } from "lucide-react";
import { StockChangeAnalysis } from "@/lib/change-detection/engine";

interface GreetingBannerProps {
  unreviewedChanges: Array<StockChangeAnalysis & { itemId: string; isReviewed: boolean }>;
  onMarkAllReviewed: () => Promise<void>;
  onTriggerSimulation: (action: string) => Promise<void>;
  isProcessing?: boolean;
}

export function GreetingBanner({
  unreviewedChanges,
  onMarkAllReviewed,
  onTriggerSimulation,
  isProcessing = false,
}: GreetingBannerProps) {
  const [showDemoTools, setShowDemoTools] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const count = unreviewedChanges.length;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 mb-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Greeting & count */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-gold font-mono">
              Market Intelligence Radar
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="text-xs text-text-muted">Since Your Last Visit</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
            {getGreeting()}.{" "}
            {count > 0 ? (
              <span className="text-amber-400">
                {count} {count === 1 ? "stock changed" : "stocks changed"} meaningfully
              </span>
            ) : (
              <span className="text-emerald-400">All caught up</span>
            )}{" "}
            while you were away.
          </h1>

          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl">
            {count > 0
              ? "We filtered out raw market noise and flagged positions with significant price deviation, abnormal volume surges, or breaking news."
              : "No unusual volatility or unexpected volume spikes detected across your monitored assets since your last check."}
          </p>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          {/* Demo tools trigger */}
          <button
            onClick={() => setShowDemoTools(!showDemoTools)}
            className="px-3 py-2 rounded-lg border border-border bg-surface-raised hover:bg-surface-hover text-text-secondary hover:text-text-primary text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Demo and Evaluation Controls"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Judge Demo Tools</span>
          </button>

          {/* Mark all as checked */}
          <button
            onClick={() => onMarkAllReviewed()}
            disabled={count === 0 || isProcessing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg accent-gradient text-black text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-35 disabled:cursor-not-allowed shadow-md shadow-black/30"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All Reviewed</span>
          </button>
        </div>
      </div>

      {/* Demo Controls Drawer */}
      {showDemoTools && (
        <div className="mt-4 pt-4 border-t border-border/80 flex flex-wrap items-center gap-3 bg-bg/60 -mx-5 -mb-5 p-4 rounded-b-xl">
          <span className="text-xs font-mono text-text-muted flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            Interactive Evaluation:
          </span>

          <button
            onClick={() => onTriggerSimulation("clear-reviews")}
            className="text-xs px-2.5 py-1 rounded border border-border bg-surface hover:bg-surface-hover text-text-primary transition-colors font-mono"
          >
            Simulate 4h Away (Reset Diffs)
          </button>

          <button
            onClick={() => onTriggerSimulation("toggle-outage")}
            className="text-xs px-2.5 py-1 rounded border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors font-mono flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3" />
            Toggle Upstream Outage Test
          </button>
        </div>
      )}

      {/* Ranked Attention Summary Pills */}
      {count > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-text-muted mr-1">Ranked Attention:</span>
          {unreviewedChanges.slice(0, 4).map((item, idx) => (
            <div
              key={item.symbol}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-raised border border-border text-xs"
            >
              <span className="font-mono font-bold text-text-muted">{idx + 1}.</span>
              <span className="font-mono font-bold text-text-primary">{item.symbol}</span>
              <span className="text-text-muted">•</span>
              <span
                className={`font-mono text-[11px] font-semibold ${
                  item.attentionLevel === "CRITICAL"
                    ? "text-rose-400"
                    : item.attentionLevel === "HIGH"
                    ? "text-amber-400"
                    : "text-gold"
                }`}
              >
                {item.attentionLevel}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}