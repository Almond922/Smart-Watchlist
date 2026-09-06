import type { Tier } from "@/lib/sensitivity";

export function TierSummaryPills({ counts }: { counts: Record<Tier, number> }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-negative-dim text-negative border border-negative/30">
        {counts.attention} Significant
      </span>
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-attention-dim text-attention border border-attention/30">
        {counts.watch} Worth Watching
      </span>
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface text-text-secondary border border-border">
        {counts.normal} Normal
      </span>
    </div>
  );
}