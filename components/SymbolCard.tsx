"use client";

import { useState } from "react";
import type { SymbolChange } from "@/lib/types";
import type { Tier } from "@/lib/sensitivity";

const TIER_ALERT_STYLES: Record<"attention" | "watch", { border: string; text: string; bg: string }> = {
  attention: { border: "border-negative/40", text: "text-negative", bg: "bg-negative-dim" },
  watch: { border: "border-attention/40", text: "text-attention", bg: "bg-attention-dim" },
};

function topSignalReason(change: SymbolChange): string | null {
  const meaningful = change.signals.filter((s) => s.kind !== "staleness" && s.kind !== "error");
  if (meaningful.length === 0) return null;
  return [...meaningful].sort((a, b) => b.score - a.score)[0].reason;
}

function otherSignals(change: SymbolChange): typeof change.signals {
  const meaningful = change.signals.filter((s) => s.kind !== "staleness" && s.kind !== "error");
  const sorted = [...meaningful].sort((a, b) => b.score - a.score);
  return sorted.slice(1);
}

function pctSinceBaseline(change: SymbolChange): number | null {
  if (change.baseline_price == null || change.baseline_price === 0) return null;
  return ((change.current_price - change.baseline_price) / change.baseline_price) * 100;
}

function formatBaselineTime(iso: string | null): string {
  if (!iso) return "No baseline yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No baseline yet";
  return `Baseline: ${d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function SymbolCard({
  change,
  tier,
  onAck,
  onRemove,
  disabled = false,
}: {
  change: SymbolChange;
  tier: Extract<Tier, "attention" | "watch">;
  onAck: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const alertStyle = TIER_ALERT_STYLES[tier];
  const reason = topSignalReason(change);
  const rest = otherSignals(change);
  const errorSignal = change.signals.find((s) => s.kind === "error");
  const pct = pctSinceBaseline(change);
  const isPositive = pct !== null && pct >= 0;

  const glowClass =
    pct === null ? "" : isPositive ? "card-glow-positive" : "card-glow-negative";

  return (
    <div className={`group relative rounded-xl border border-border bg-surface p-4 ${glowClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-text-primary text-base">
            {change.symbol}
          </span>
          {change.is_stale && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-stale text-stale">
              stale · {Math.round(change.confidence * 100)}%
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="hidden group-hover:flex items-center gap-1">
            <button
              onClick={() => onAck(change.symbol)}
              disabled={disabled}
              title="Mark as checked"
              className="text-[11px] px-2 py-1 rounded border border-border text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors disabled:opacity-40"
            >
              {disabled ? "…" : "Ack"}
            </button>
            <button
              onClick={() => onRemove(change.symbol)}
              disabled={disabled}
              title="Remove from watchlist"
              className="text-[11px] px-2 py-1 rounded border border-border text-text-secondary hover:text-negative hover:border-negative transition-colors disabled:opacity-40"
            >
              {disabled ? "…" : "Remove"}
            </button>
          </div>
          {pct !== null && (
            <span
              className={`shrink-0 text-sm font-mono font-medium px-2 py-0.5 rounded-md ${
                isPositive ? "bg-positive-dim text-positive" : "bg-negative-dim text-negative"
              }`}
            >
              {isPositive ? "↗" : "↘"} {Math.abs(pct).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-4 font-mono">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-text-muted">Current price</div>
          <div className="text-text-primary text-lg mt-0.5">
            {errorSignal ? "—" : `$${change.current_price.toFixed(2)}`}
          </div>
        </div>
        {change.baseline_price !== null && (
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wide text-text-muted">Baseline price</div>
            <div className="text-text-secondary text-sm mt-0.5">
              ${change.baseline_price.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      <div className={`mt-3 flex items-start gap-2 rounded-lg border ${alertStyle.border} ${alertStyle.bg} px-3 py-2`}>
        <svg
          className={`shrink-0 mt-0.5 ${alertStyle.text}`}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.14A1 1 0 0 0 3 19.5h18a1 1 0 0 0 .89-1.5L13.71 3.86a1 1 0 0 0-1.72 0z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className={`text-sm ${alertStyle.text}`}>
          {errorSignal
            ? errorSignal.reason
            : reason ??
              (change.is_first_view
                ? "Newly added — a baseline will be set once you mark this as checked."
                : "Nothing unusual since your last check.")}
        </p>
      </div>

      {rest.length > 0 && expanded && (
        <ul className="mt-2 space-y-1 pl-1">
          {rest.map((s, i) => (
            <li key={i} className="text-xs text-text-secondary">
              · {s.reason}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 pt-3 border-t border-border-soft flex items-center justify-between text-xs text-text-muted">
        <span>{formatBaselineTime(change.baseline_seen_at)}</span>
        {rest.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-accent-from hover:underline"
          >
            {expanded ? "Hide details" : "Details"} {expanded ? "︿" : "›"}
          </button>
        )}
      </div>
    </div>
  );
}