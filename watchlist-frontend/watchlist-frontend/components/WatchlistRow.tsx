"use client";

import { useEffect, useRef, useState } from "react";
import type { SymbolChange } from "@/lib/types";
import { AttentionMeter } from "./AttentionMeter";

function topSignalReason(change: SymbolChange): string | null {
  const meaningful = change.signals.filter((s) => s.kind !== "staleness" && s.kind !== "error");
  if (meaningful.length === 0) return null;
  const top = [...meaningful].sort((a, b) => b.score - a.score)[0];
  return top.reason;
}

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
  const [justUpdated, setJustUpdated] = useState(false);
  const prevScoreRef = useRef(change.attention_score);

  useEffect(() => {
    if (prevScoreRef.current !== change.attention_score) {
      setJustUpdated(true);
      const t = setTimeout(() => setJustUpdated(false), 900);
      prevScoreRef.current = change.attention_score;
      return () => clearTimeout(t);
    }
  }, [change.attention_score]);

  const reason = topSignalReason(change);
  const errorSignal = change.signals.find((s) => s.kind === "error");

  return (
    <div
      className={`group flex items-center gap-4 px-4 py-3 border-b border-border transition-colors duration-700 ${
        justUpdated ? "bg-surface-hover" : "bg-transparent"
      }`}
    >
      <div className="w-16 shrink-0">
        <span className="font-mono font-semibold text-text-primary">{change.symbol}</span>
      </div>

      <div className="w-24 shrink-0 font-mono text-sm tabular-nums text-text-primary">
        {errorSignal ? "—" : `$${change.current_price.toFixed(2)}`}
      </div>

      <div className="flex-1 min-w-0 text-sm text-text-secondary truncate">
        {errorSignal
          ? errorSignal.reason
          : reason ?? (change.is_first_view ? "First look — nothing to compare yet." : "Nothing unusual since your last visit.")}
      </div>

      {change.is_stale && (
        <span className="shrink-0 text-xs font-mono px-1.5 py-0.5 rounded border border-stale text-stale">
          stale · {Math.round(change.confidence * 100)}%
        </span>
      )}

      <AttentionMeter score={change.attention_score} />

      <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={() => onAck(change.symbol)}
          disabled={disabled}
          className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {disabled ? "…" : "Ack"}
        </button>
        <button
          onClick={() => onRemove(change.symbol)}
          disabled={disabled}
          className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-negative hover:border-negative transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {disabled ? "…" : "Remove"}
        </button>
      </div>
    </div>
  );
}