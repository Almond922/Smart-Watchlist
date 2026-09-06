"use client";

import { useState } from "react";
import type { SymbolChange } from "@/lib/types";

function topSignalReason(change: SymbolChange): string | null {
  const meaningful = change.signals.filter((s) => s.kind !== "staleness" && s.kind !== "error");
  if (meaningful.length === 0) return null;
  return [...meaningful].sort((a, b) => b.score - a.score)[0].reason;
}

function pctSinceBaseline(change: SymbolChange): number | null {
  if (change.baseline_price == null || change.baseline_price === 0) return null;
  return ((change.current_price - change.baseline_price) / change.baseline_price) * 100;
}

// Compact single-line row used for the "Normal Movement" tier — deliberately
// lighter-weight than SymbolCard since these are the items the person is
// least likely to need to act on.
export function WatchlistRow({
  change,
  onAck,
  onRemove,
  disabled = false,
}: {
  change: SymbolChange;
  onAck: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const reason = topSignalReason(change);
  const errorSignal = change.signals.find((s) => s.kind === "error");
  const pct = pctSinceBaseline(change);
  const isPositive = pct !== null && pct >= 0;

  return (
    <div className="group">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-surface-hover transition-colors"
      >
        <span className="font-mono font-semibold text-text-primary w-16 shrink-0">
          {change.symbol}
        </span>

        <span className="flex-1 min-w-0 text-sm text-text-secondary truncate">
          {change.is_stale
            ? `stale · ${Math.round(change.confidence * 100)}% confidence`
            : errorSignal
            ? errorSignal.reason
            : reason ?? "Nothing unusual since your last check."}
        </span>

        {pct !== null && (
          <span
            className={`shrink-0 text-sm font-mono w-16 text-right ${
              isPositive ? "text-positive" : "text-negative"
            }`}
          >
            {isPositive ? "+" : "-"}
            {Math.abs(pct).toFixed(1)}%
          </span>
        )}

        <span className="shrink-0 text-sm font-mono text-text-primary w-20 text-right">
          {errorSignal ? "—" : `$${change.current_price.toFixed(2)}`}
        </span>

        <span className="shrink-0 text-text-muted w-4 text-right">{open ? "︿" : "›"}</span>
      </button>

      {open && (
        <div className="px-4 pb-3 flex items-center gap-2">
          <button
            onClick={() => onAck(change.symbol)}
            disabled={disabled}
            className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors disabled:opacity-40"
          >
            {disabled ? "…" : "Mark as checked"}
          </button>
          <button
            onClick={() => onRemove(change.symbol)}
            disabled={disabled}
            className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-negative hover:border-negative transition-colors disabled:opacity-40"
          >
            {disabled ? "…" : "Remove"}
          </button>
        </div>
      )}
    </div>
  );
}