"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, ListChecks, Settings, LogIn, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { SignInModal } from "@/components/auth/SignInModal";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Live Dashboard", icon: LayoutDashboard },
  { href: "/watchlist", label: "Watchlist", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const initials = (user?.name || user?.email || "G")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-bg text-text-primary">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex lg:flex-col w-60 shrink-0 border-r border-border bg-surface">
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center shadow-lg shadow-black/40">
            <Activity className="w-4.5 h-4.5 text-black" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-text-primary leading-tight">
              SignalWatch
            </div>
            <div className="text-[10px] font-mono text-gold leading-tight">Radar v1.0</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-gold-soft text-gold border border-gold-border"
                    : "text-text-secondary border border-transparent hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <AccountControl
            loading={loading}
            userLabel={user?.name || user?.email || null}
            initials={initials}
            onSignIn={() => setSignInOpen(true)}
            onSignOut={signOut}
          />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center justify-between px-4 border-b border-border bg-surface/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg accent-gradient flex items-center justify-center">
            <Activity className="w-4 h-4 text-black" />
          </div>
          <span className="text-sm font-semibold text-text-primary">SignalWatch</span>
        </div>
        <button
          onClick={() => setMobileNavOpen((v) => !v)}
          className="p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary"
        >
          {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {mobileNavOpen && (
        <div className="lg:hidden fixed top-14 inset-x-0 z-40 border-b border-border bg-surface px-3 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-gold-soft text-gold border border-gold-border"
                    : "text-text-secondary border border-transparent hover:text-text-primary hover:bg-surface-hover"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 mt-2 border-t border-border-soft">
            <AccountControl
              loading={loading}
              userLabel={user?.name || user?.email || null}
              initials={initials}
              onSignIn={() => setSignInOpen(true)}
              onSignOut={signOut}
            />
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">{children}</main>

      <SignInModal isOpen={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}

function AccountControl({
  loading,
  userLabel,
  initials,
  onSignIn,
  onSignOut,
}: {
  loading: boolean;
  userLabel: string | null;
  initials: string;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  if (loading) {
    return <div className="h-10 rounded-lg bg-surface-hover animate-pulse" />;
  }

  if (!userLabel) {
    return (
      <button
        onClick={onSignIn}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg accent-gradient text-black text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        <LogIn className="w-4 h-4" />
        <span>Sign in</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 shrink-0 rounded-full bg-gold-soft border border-gold-border flex items-center justify-center text-xs font-semibold text-gold">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-text-primary truncate">{userLabel}</div>
      </div>
      <button
        onClick={onSignOut}
        title="Sign out"
        className="p-2 rounded-lg border border-border text-text-secondary hover:text-negative hover:border-negative/40 transition-colors"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}