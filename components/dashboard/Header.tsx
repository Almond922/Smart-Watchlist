"use client";

import React from "react";
import { RefreshCw, Database } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  watchlistCount?: number;
  lastUpdated?: Date;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  marketOpen?: boolean;
}

export function Header({
  title,
  subtitle,
  watchlistCount,
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  marketOpen = true,
}: HeaderProps) {
  const formattedTime = lastUpdated
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true,
      }).format(lastUpdated)
    : null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/95 backdrop-blur px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-text-primary">{title}</h1>
          {subtitle && <p className="text-[11px] text-text-secondary">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {typeof watchlistCount === "number" && (
            <div className="hidden md:flex items-center gap-2 pr-3 border-r border-border">
              <span className="text-xs text-text-secondary">Watching</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-surface-raised border border-border text-text-primary">
                {watchlistCount} stocks
              </span>
            </div>
          )}

          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-surface-raised border border-border text-[11px] text-text-secondary">
            <Database className="w-3.5 h-3.5 text-gold" />
            <span>Deterministic Demo Mode</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border border-border bg-surface">
            <span
              className={`w-2 h-2 rounded-full ${
                marketOpen ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
              }`}
            />
            <span className={marketOpen ? "text-emerald-400" : "text-zinc-400"}>
              {marketOpen ? "MARKET OPEN" : "MARKET CLOSED"}
            </span>
          </div>

          {formattedTime && (
            <span className="hidden xl:inline text-xs text-text-muted font-mono">
              Updated {formattedTime}
            </span>
          )}

          {onRefresh && (
            <button
              onClick={() => onRefresh()}
              disabled={isRefreshing}
              title="Refresh Quotes"
              className="p-2 rounded-lg border border-border bg-surface text-text-secondary hover:text-gold hover:border-gold-border hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-gold" : ""}`} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}