"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { WatchlistTable } from "@/components/watchlist/WatchlistTable";
import { AddStockModal } from "@/components/watchlist/AddStockModal";
import { WatchlistWithChangesResponse } from "@/lib/snapshots/snapshotService";
import { useScopedUserId } from "@/lib/AuthContext";
import { Plus } from "lucide-react";

export default function WatchlistPage() {
  const userId = useScopedUserId();
  const [data, setData] = useState<WatchlistWithChangesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSymbols, setPendingSymbols] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  useEffect(() => {
    loadWatchlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function showToast(message: string, type: "success" | "error" | "info" = "info") {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }

  async function loadWatchlist() {
    try {
      const res = await fetch(`/api/watchlist?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) throw new Error("Failed to load watchlist");
      const json: WatchlistWithChangesResponse = await res.json();
      setData(json);
    } catch (err: any) {
      showToast(err.message || "Failed to load watchlist", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadWatchlist();
    setIsRefreshing(false);
    showToast("Watchlist refreshed", "success");
  }

  async function handleMarkReviewed(symbol: string) {
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
      await loadWatchlist();
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

  async function handleRemoveStock(symbol: string) {
    if (!data) return;
    setPendingSymbols((prev) => new Set(prev).add(symbol));

    try {
      const res = await fetch(`/api/watchlist/${data.watchlistId}/items/${symbol}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove stock");
      showToast(`Removed ${symbol} from watchlist`, "info");
      await loadWatchlist();
    } catch (err: any) {
      showToast(err.message || "Failed to remove stock", "error");
    } finally {
      setPendingSymbols((prev) => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
    }
  }

  async function handleQuickAdd(symbol: string) {
    if (!data) return;
    setPendingSymbols((prev) => new Set(prev).add(symbol));

    try {
      const res = await fetch(`/api/watchlist/${data.watchlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add stock");
      showToast(`Added ${symbol} to watchlist`, "success");
      await loadWatchlist();
    } catch (err: any) {
      showToast(err.message || "Failed to add stock", "error");
    } finally {
      setPendingSymbols((prev) => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-text-muted">Loading watchlist...</span>
        </div>
      </div>
    );
  }

  const items = data?.items || [];

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

      <Header
        title="Watchlist"
        subtitle="Every symbol you're tracking, in one place"
        watchlistCount={items.length}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-text-secondary">
            Your Watchlist
          </h2>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg accent-gradient text-black text-xs font-semibold hover:opacity-90 shadow-sm transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Stock</span>
          </button>
        </div>

        <WatchlistTable
          items={items}
          onRemove={handleRemoveStock}
          onMarkReviewed={handleMarkReviewed}
          onQuickAdd={handleQuickAdd}
          pendingSymbols={pendingSymbols}
        />
      </main>

      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        userId={userId}
        onStockAdded={() => {
          setIsAddModalOpen(false);
          loadWatchlist();
        }}
      />
    </div>
  );
}