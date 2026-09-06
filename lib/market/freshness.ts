export type FreshnessLevel = "LIVE" | "RECENT" | "DELAYED" | "STALE";

export interface FreshnessInfo {
  level: FreshnessLevel;
  label: string;
  ageSeconds: number;
  isStale: boolean;
  colorClass: string;
  badgeClass: string;
}

export function computeFreshness(timestamp: Date | string | number): FreshnessInfo {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = Date.now();
  const ageMs = Math.max(0, now - date.getTime());
  const ageSeconds = Math.floor(ageMs / 1000);
  const ageMinutes = ageSeconds / 60;

  if (ageMinutes < 2) {
    return {
      level: "LIVE",
      label: ageSeconds < 10 ? "Real-time • Just now" : `Live • Updated ${ageSeconds}s ago`,
      ageSeconds,
      isStale: false,
      colorClass: "text-emerald-400",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
  }

  if (ageMinutes <= 15) {
    return {
      level: "RECENT",
      label: `Recent • Updated ${Math.round(ageMinutes)}m ago`,
      ageSeconds,
      isStale: false,
      colorClass: "text-blue-400",
      badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };
  }

  if (ageMinutes <= 60) {
    return {
      level: "DELAYED",
      label: `Delayed • Last updated ${Math.round(ageMinutes)}m ago`,
      ageSeconds,
      isStale: true,
      colorClass: "text-amber-400",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    };
  }

  const hours = Math.round(ageMinutes / 60);
  return {
    level: "STALE",
    label: `Stale Data • Last updated ${hours}h ago`,
    ageSeconds,
    isStale: true,
    colorClass: "text-zinc-400",
    badgeClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
}

