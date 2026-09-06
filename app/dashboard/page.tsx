"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { GreetingBanner } from "@/components/dashboard/GreetingBanner";
import { SinceYouLastChecked } from "@/components/dashboard/SinceYouLastChecked";
import { MarketSnapshotCards } from "@/components/dashboard/MarketSnapshotCards";
import { WatchlistWithChangesResponse } from "@/lib/snapshots/snapshotService";
import { useScopedUserId } from "@/lib/AuthContext";
import { AlertTriangle } from "lucide-react";

export default function LiveDashboardPage() {
  const userId = useScopedUserId();
  const [data, setData] = useState<WatchlistWithChangesResponse | null>(null);
  const [snapshotData, setSnapshotData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSymbols, setPendingSymbols] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [outageWarning, setOutageWarning] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
    loadSnapshotData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }

  async function loadDashboardData() {
    try {
      const res = await fetch(`/api/watchlist?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Failed to load watchlist");
      const json: WatchlistWithChangesResponse = await res.json();
      setData(json);
      setLastUpdated(new Date());

      const hasStale = json.items?.some((i: any) => i.isStale);
      setOutageWarning(
        hasStale ? "Upstream market data temporarily unavailable — serving verified baseline snapshots." : null
      );
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to update quotes", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadSnapshotData() {
    try {
      const res = await fetch("/api/market/snapshot");
      if (res.ok) {
        const json = await res.json();
        setSnapshotData(json);
      }
    } catch {
      // Continue
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await Promise.all([loadDashboardData(), loadSnapshotData()]);
    setIsRefreshing(false);
    showToast("Market data refreshed successfully", "success");
  }

  async function handleMarkReviewed(symbol: string, detectionId?: string) {
    if (pendingSymbols.has(symbol)) return;
    setPendingSymbols((prev) => new Set(prev).add(symbol));

    try {
      const res = await fetch(`/api/changes/${symbol}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, userId }),
      });
      if (!res.ok) throw new Error("Failed to mark reviewed");

      showToast(`Acknowledged changes for ${symbol}`, "success");
      await loadDashboardData();
    } catch (err: any) {
      showToast(err.message || "Failed to mark reviewed", "error");
    } finally {
      setPendingSymbols((prev) => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
    }
  }

  async function handleMarkAllReviewed() {
    if (!data || data.sinceLastCheckedChanges.length === 0) return;
    setIsRefreshing(true);

    try {
      const res = await fetch(`/api/watchlist/${data.watchlistId}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to mark all reviewed");

      showToast("All market changes marked as reviewed", "success");
      await loadDashboardData();
    } catch (err: any) {
      showToast(err.message || "Failed to mark all reviewed", "error");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleTriggerSimulation(action: string) {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/demo/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId }),
      });
      const json = await res.json();
      showToast(json.message || "Simulation applied", "info");
      await loadDashboardData();
      await loadSnapshotData();
    } catch (err: any) {
      showToast(err.message || "Simulation failed", "error");
    } finally {
      setIsRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-text-muted">Loading SignalWatch radar...</span>
        </div>
      </div>
    );
  }

  const sinceLastChanges = data?.sinceLastCheckedChanges || [];

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-2.5 rounded-lg border text-xs font-mono shadow-xl flex items-center gap-2 ${
              notification.type === "success"
                ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
                : notification.type === "error"
                ? "bg-rose-950 border-rose-500/40 text-rose-300"
                : "bg-surface-raised border-border text-text-primary"
            }`}
          >
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {outageWarning && (
        <div className="bg-amber-950/80 border-b border-amber-500/30 px-4 py-2 text-center text-xs font-mono text-amber-300 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{outageWarning}</span>
        </div>
      )}

      <Header
        title="Live Dashboard"
        subtitle="What Changed Since You Last Checked"
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        marketOpen={snapshotData?.marketStatus?.isOpen ?? true}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <GreetingBanner
          unreviewedChanges={sinceLastChanges}
          onMarkAllReviewed={handleMarkAllReviewed}
          onTriggerSimulation={handleTriggerSimulation}
          isProcessing={isRefreshing}
        />

        <SinceYouLastChecked
          changes={sinceLastChanges}
          onMarkReviewed={handleMarkReviewed}
          pendingSymbols={pendingSymbols}
        />

        <MarketSnapshotCards data={snapshotData} />
      </main>
    </div>
  );
}