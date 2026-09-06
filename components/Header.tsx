"use client";

import type { ConnectionState } from "@/lib/types";
import { ConnectionBadge } from "./ConnectionBadge";

export type ActiveTab = "dashboard" | "watchlist" | "settings";

const TABS: { key: ActiveTab; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "watchlist", label: "Watchlist" },
  { key: "settings", label: "Settings" },
];

function LogoMark() {
  return (
    <div className="accent-gradient w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M2 12h4l2.5-7L13 20l3-14 2 6h4"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Header({
  activeTab,
  onChangeTab,
  connection,
  onSwitchAccount,
}: {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  connection: ConnectionState;
  onSwitchAccount: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border flex-wrap">
      <div className="flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <div className="flex items-baseline gap-2">
            <span className="font-semibold tracking-wide text-text-primary text-sm">
              SMART WATCHLIST
            </span>
            <span className="hidden sm:inline text-xs text-text-muted">
              Know what changed
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onChangeTab(tab.key)}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                activeTab === tab.key
                  ? "bg-surface-hover text-text-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <ConnectionBadge state={connection} />
        <button
          onClick={onSwitchAccount}
          className="text-xs px-3 py-1.5 rounded-md border border-border text-text-secondary hover:text-text-primary hover:border-text-secondary transition-colors"
        >
          Switch account
        </button>
      </div>
    </header>
  );
}