export function AttentionMeter({ score }: { score: number }) {
  // scores in this system typically range 0 (nothing unusual) to ~3+
  // (multiple compounding signals); clamp the visual fill at 3 so one
  // extreme symbol doesn't flatten the rest of the list
  const pct = Math.min(100, (score / 3) * 100);
  const isNotable = score > 0;

  return (
    <div className="flex items-center gap-2 w-28">
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: isNotable ? "var(--attention)" : "var(--stale)",
          }}
        />
      </div>
      <span
        className="font-mono text-xs tabular-nums w-8 text-right"
        style={{ color: isNotable ? "var(--attention)" : "var(--text-muted)" }}
      >
        {score.toFixed(2)}
      </span>
    </div>
  );
}
