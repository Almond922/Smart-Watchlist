"use client";

import { useState } from "react";
import type { SymbolChange } from "@/lib/types";
import type { Tier } from "@/lib/sensitivity";
import { AddSymbolForm } from "./AddSymbolForm";

const TIER_BADGE: Record<Tier, { label: string; className: string }> = {
  attention: { label: "SIGNIFICANT", className: "bg-negative-dim text-negative border-negative/30" },
  watch: { label: "WATCH", className: "bg-attention-dim text-attention border-attention/30" },
  normal: { label: "NORMAL", className: "bg-surface text-text-muted border-border" },
};

function pctSinceBaseline(change: SymbolChange): number | null {
  if (change.baseline_price == null || change.baseline_price === 0) return null;
  return ((change.current_price - change.baseline_price) / change.baseline_price) * 100;
}

export function WatchlistTable({
  items,
  onAdd,
  onAck,
  onRemove,
  pendingSymbols,
}: {
  items: { change: SymbolChange; tier: Tier }[];
  onAdd: (symbol: string) => void;
  onAck: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  pendingSymbols: Set<string>;
}) {
  const [filter, setFilter] = useState("");

  const visible = items.filter(({ change }) =>
    change.symbol.toLowerCase().includes(filter.trim().toLowerCase())
  );

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">My Watchlist</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Manage your monitored assets. Baseline updates when you mark a symbol as checked.
          </p>
        </div>
        <AddSymbolForm onAdd={onAdd} label="Add stock" />
      </div>

      <div className="flex items-center justify-between gap-4 my-4">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter watchlist…"
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-from w-full max-w-xs"
        />
        <span className="text-xs text-text-muted font-mono shrink-0">
          {items.length} {items.length === 1 ? "Stock" : "Stocks"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center border border-border rounded-lg">
          <p className="text-text-secondary text-sm">Your watchlist is empty.</p>
          <p className="text-text-muted text-xs mt-1">Add a symbol above to start tracking it.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Asset
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted text-right">
                  Current Price
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted text-right">
                  Since Last Check
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {visible.map(({ change, tier }) => {
                const pct = pctSinceBaseline(change);
                const isPositive = pct !== null && pct >= 0;
                const errorSignal = change.signals.find((s) => s.kind === "error");
                const badge = TIER_BADGE[tier];
                const disabled = pendingSymbols.has(change.symbol);

                return (
                  <tr key={change.symbol} className="hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-text-primary">
                        {change.symbol}
                      </span>
                      {change.is_stale && (
                        <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded border border-stale text-stale">
                          stale
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-text-primary">
                      {errorSignal ? "—" : `$${change.current_price.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {pct === null ? (
                        <span className="text-text-muted">—</span>
                      ) : (
                        <span className={isPositive ? "text-positive" : "text-negative"}>
                          {isPositive ? "+" : "-"}
                          {Math.abs(pct).toFixed(1)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onAck(change.symbol)}
                          disabled={disabled}
                          title="Mark as checked"
                          className="text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 p-1"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M20 6L9 17l-5-5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => onRemove(change.symbol)}
                          disabled={disabled}
                          title="Remove"
                          className="text-text-secondary hover:text-negative transition-colors disabled:opacity-40 p-1"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16z"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="py-10 text-center text-sm text-text-secondary">
              No symbols match &ldquo;{filter}&rdquo;.
            </div>
          )}
        </div>
      )}
    </div>
  );
}