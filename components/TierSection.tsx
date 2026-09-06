"use client";

import type { SymbolChange } from "@/lib/types";
import type { Tier, TierThresholds } from "@/lib/sensitivity";
import { SymbolCard } from "./SymbolCard";
import { WatchlistRow } from "./WatchlistRow";

const TIER_META: Record<Tier, { label: string; dot: string }> = {
  attention: { label: "Needs Your Attention", dot: "bg-negative" },
  watch: { label: "Worth Watching", dot: "bg-attention" },
  normal: { label: "Normal Movement", dot: "bg-text-muted" },
};

function thresholdLabel(tier: Tier, thresholds: TierThresholds): string {
  if (tier === "attention") return `≥ ${thresholds.attention.toFixed(1)} score`;
  if (tier === "watch") return `${thresholds.watch.toFixed(1)}–${thresholds.attention.toFixed(1)} score`;
  return `< ${thresholds.watch.toFixed(1)} score`;
}

export function TierSection({
  tier,
  items,
  thresholds,
  onAck,
  onRemove,
  pendingSymbols,
}: {
  tier: Tier;
  items: SymbolChange[];
  thresholds: TierThresholds;
  onAck: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  pendingSymbols: Set<string>;
}) {
  if (items.length === 0) return null;
  const meta = TIER_META[tier];

  return (
    <section className="px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${meta.dot}`} />
          <h2 className="text-sm font-semibold text-text-primary tracking-wide uppercase">
            {meta.label}
          </h2>
          <span className="text-xs text-text-muted font-mono">({items.length})</span>
        </div>
        <span className="text-xs text-text-muted font-mono">{thresholdLabel(tier, thresholds)}</span>
      </div>

      {tier === "normal" ? (
        <div className="rounded-lg border border-border divide-y divide-border-soft overflow-hidden">
          {items.map((change) => (
            <WatchlistRow
              key={change.symbol}
              change={change}
              onAck={onAck}
              onRemove={onRemove}
              disabled={pendingSymbols.has(change.symbol)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((change) => (
            <SymbolCard
              key={change.symbol}
              change={change}
              tier={tier}
              onAck={onAck}
              onRemove={onRemove}
              disabled={pendingSymbols.has(change.symbol)}
            />
          ))}
        </div>
      )}
    </section>
  );
}