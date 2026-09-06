export type Sensitivity = "high" | "medium" | "low";

export interface TierThresholds {
  attention: number; // score >= this => "Needs Attention"
  watch: number;      // score >= this (and < attention) => "Worth Watching"
}

// Higher sensitivity = lower cutoffs = more things get flagged.
// These operate on the app's own attention score (volatility z-score +
// volume anomaly + level breaks + news), not a raw price percentage —
// unlike a flat "% moved" threshold, this stays meaningful across
// symbols with very different normal volatility.
export const SENSITIVITY_PRESETS: Record<Sensitivity, TierThresholds> = {
  high: { attention: 0.8, watch: 0.3 },
  medium: { attention: 1.5, watch: 0.5 },
  low: { attention: 2.5, watch: 1.0 },
};

const STORAGE_KEY = "smart-watchlist-sensitivity";

export function loadSensitivity(): Sensitivity {
  if (typeof window === "undefined") return "medium";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "high" || stored === "medium" || stored === "low") return stored;
  return "medium";
}

export function saveSensitivity(value: Sensitivity) {
  localStorage.setItem(STORAGE_KEY, value);
}

export type Tier = "attention" | "watch" | "normal";

export function tierFor(score: number, thresholds: TierThresholds): Tier {
  if (score >= thresholds.attention) return "attention";
  if (score >= thresholds.watch) return "watch";
  return "normal";
}