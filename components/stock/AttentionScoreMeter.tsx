"use client";

import React from "react";
import { AttentionScoreResult } from "@/lib/attention/scoring";
import { AttentionBadge } from "../ui/Badge";
import { Gauge, CheckCircle2 } from "lucide-react";

export function AttentionScoreMeter({ scoreResult }: { scoreResult: AttentionScoreResult }) {
  const { score, level, signals, breakdown } = scoreResult;

  const barColor =
    level === "CRITICAL"
      ? "bg-rose-500"
      : level === "HIGH"
      ? "bg-amber-400"
      : level === "MEDIUM"
      ? "bg-blue-500"
      : "bg-zinc-500";

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-sm text-text-primary">Attention Engine Score</h3>
        </div>
        <AttentionBadge level={level} score={score} />
      </div>

      {/* Meter Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-baseline mb-2">
          <span className="font-mono text-3xl font-bold text-text-primary">
            {score}
            <span className="text-sm font-normal text-text-muted font-sans ml-1">/ 100</span>
          </span>
          <span className="text-xs font-mono text-text-secondary">
            {level === "CRITICAL"
              ? "Urgent Outlier Move"
              : level === "HIGH"
              ? "Material Deviation Flagged"
              : level === "MEDIUM"
              ? "Moderate Activity"
              : "Expected Market Behavior"}
          </span>
        </div>

        <div className="w-full h-3 bg-surface-raised rounded-full overflow-hidden border border-border/80">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${Math.max(4, score)}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] font-mono text-text-muted mt-1.5 px-0.5">
          <span>0 (Low)</span>
          <span>30 (Medium)</span>
          <span>60 (High)</span>
          <span>80+ (Critical)</span>
        </div>
      </div>

      {/* Signal Breakdown List */}
      <div className="border-t border-border pt-4">
        <h4 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-3">
          Signal Contribution Breakdown
        </h4>

        <div className="space-y-3">
          {signals.map((sig) => {
            const pct = sig.maxPoints > 0 ? (sig.points / sig.maxPoints) * 100 : 0;
            return (
              <div key={sig.kind} className="text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-text-primary">{sig.label}</span>
                  <span className="font-mono font-semibold text-text-secondary">
                    +{sig.points} <span className="text-[10px] text-text-muted font-normal">/ {sig.maxPoints} pts</span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-raised rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[11px] text-text-muted mt-1">{sig.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

