import React from "react";
import { AttentionLevel } from "@/lib/attention/scoring";
import { FreshnessLevel } from "@/lib/market/freshness";

interface AttentionBadgeProps {
  level: AttentionLevel;
  score?: number;
  className?: string;
  size?: "sm" | "md";
}

export function AttentionBadge({ level, score, className = "", size = "md" }: AttentionBadgeProps) {
  const configs: Record<AttentionLevel, { label: string; bg: string; text: string; border: string }> = {
    CRITICAL: {
      label: "CRITICAL",
      bg: "bg-rose-500/15",
      text: "text-rose-400",
      border: "border-rose-500/30",
    },
    HIGH: {
      label: "HIGH ATTENTION",
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      border: "border-amber-500/30",
    },
    MEDIUM: {
      label: "MEDIUM",
      bg: "bg-blue-500/15",
      text: "text-blue-400",
      border: "border-blue-500/30",
    },
    LOW: {
      label: "LOW",
      bg: "bg-zinc-800/80",
      text: "text-zinc-400",
      border: "border-zinc-700/50",
    },
  };

  const c = configs[level] || configs.LOW;
  const padding = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold font-mono tracking-wide rounded-md border ${c.bg} ${c.text} ${c.border} ${padding} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      <span>{c.label}</span>
      {score !== undefined && (
        <span className="opacity-75 font-normal">({score})</span>
      )}
    </span>
  );
}

export function FreshnessBadge({ freshness }: { freshness: FreshnessLevel | string }) {
  const f = (freshness || "LIVE").toUpperCase();

  if (f === "LIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        LIVE
      </span>
    );
  }

  if (f === "RECENT") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        RECENT
      </span>
    );
  }

  if (f === "DELAYED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        DELAYED
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
      STALE
    </span>
  );
}

