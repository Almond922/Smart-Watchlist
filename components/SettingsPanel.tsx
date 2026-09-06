"use client";

import { SENSITIVITY_PRESETS, type Sensitivity } from "@/lib/sensitivity";

const SENSITIVITY_COPY: Record<Sensitivity, { label: string; blurb: string }> = {
  high: { label: "High", blurb: "Flags more — good for volatile symbols you watch closely." },
  medium: { label: "Medium", blurb: "Balanced default." },
  low: { label: "Low", blurb: "Flags less — only clearly unusual moves surface." },
};

export function SettingsPanel({
  sensitivity,
  onChangeSensitivity,
  outageOn,
  onToggleOutage,
  onResetDemo,
}: {
  sensitivity: Sensitivity;
  onChangeSensitivity: (s: Sensitivity) => void;
  outageOn: boolean;
  onToggleOutage: () => void;
  onResetDemo: () => void;
}) {
  const thresholds = SENSITIVITY_PRESETS[sensitivity];

  return (
    <div className="px-6 py-8 max-w-2xl">
      <h1 className="text-lg font-semibold text-text-primary mb-1">Settings</h1>
      <p className="text-sm text-text-secondary mb-6">
        Configure how Smart Watchlist detects and prioritizes market movement.
      </p>

      <div className="border border-border rounded-lg p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Attention Sensitivity</h2>
        <p className="text-xs text-text-secondary mb-4">
          Controls the attention-score cutoffs used to group symbols below — not a flat
          price percentage, since that would treat a calm stock and a volatile one the same way.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(SENSITIVITY_PRESETS) as Sensitivity[]).map((key) => (
            <button
              key={key}
              onClick={() => onChangeSensitivity(key)}
              className={`text-center p-4 rounded-lg border transition-colors ${
                sensitivity === key
                  ? "border-accent-from bg-accent-from/10"
                  : "border-border hover:border-text-secondary"
              }`}
            >
              <div
                className={`text-base font-semibold ${
                  sensitivity === key ? "accent-gradient-text" : "text-text-primary"
                }`}
              >
                {SENSITIVITY_COPY[key].label}
              </div>
              {sensitivity === key && (
                <div className="text-xs text-accent-from mt-1 flex items-center justify-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M20 6L9 17l-5-5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Active
                </div>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-3">{SENSITIVITY_COPY[sensitivity].blurb}</p>

        <div className="mt-4 pt-4 border-t border-border-soft">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted mb-2">
            Classification breakdown for &ldquo;{SENSITIVITY_COPY[sensitivity].label}&rdquo;
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono px-3 py-2 rounded-lg bg-negative-dim text-negative">
              <span>≥ {thresholds.attention.toFixed(1)} score</span>
              <span className="font-semibold">Needs Attention</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono px-3 py-2 rounded-lg bg-attention-dim text-attention">
              <span>
                {thresholds.watch.toFixed(1)}–{thresholds.attention.toFixed(1)}
              </span>
              <span className="font-semibold">Worth Watching</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono px-3 py-2 rounded-lg bg-surface text-text-muted border border-border-soft">
              <span>&lt; {thresholds.watch.toFixed(1)}</span>
              <span className="font-semibold">Normal Movement</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-1">Demo &amp; Hackathon Tools</h2>
        <p className="text-xs text-text-secondary mb-4">
          Utilities for testing and demoing the resilience and reset behavior live.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onToggleOutage}
            className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
              outageOn
                ? "border-negative text-negative bg-negative-dim"
                : "border-border text-text-secondary hover:border-text-secondary"
            }`}
          >
            {outageOn ? "Outage ON — click to restore" : "Trigger upstream outage"}
          </button>
          <button
            onClick={onResetDemo}
            className="text-sm px-3 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors"
          >
            Reset demo watchlist
          </button>
        </div>
      </div>
    </div>
  );
}