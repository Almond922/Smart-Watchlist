"use client";

import React, { useState, useEffect } from "react";
import { Search, X, Plus, Check, AlertCircle } from "lucide-react";
import { SearchResult } from "@/providers/market-data";

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStockAdded: () => void;
  userId?: string;
}

export function AddStockModal({ isOpen, onClose, onStockAdded, userId = "demo-user-1" }: AddStockModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setError(null);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        // Continue
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  async function handleAdd(item: SearchResult) {
    setAddingSymbol(item.symbol);
    setError(null);

    try {
      // Find or get this user's default watchlist
      const wlRes = await fetch(`/api/watchlist?userId=${encodeURIComponent(userId)}`);
      const wlData = await wlRes.json();
      const watchlistId = wlData.watchlistId;

      const res = await fetch(`/api/watchlist/${watchlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: item.symbol,
          companyName: item.companyName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add stock");
        return;
      }

      onStockAdded();
    } catch (err: any) {
      setError(err.message || "Failed to add stock");
    } finally {
      setAddingSymbol(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-gold" />
            <h3 className="font-semibold text-sm text-text-primary">Add Stock to Radar</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Search by symbol or company (e.g., AAPL, Nvidia)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-surface-raised border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold"
            />
          </div>
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2 font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-2 divide-y divide-border/40">
          {loading && (
            <div className="py-8 text-center text-xs text-text-muted">
              Searching market database...
            </div>
          )}

          {!loading && results.length === 0 && query.trim().length > 0 && (
            <div className="py-8 text-center text-xs text-text-secondary">
              No matching stocks found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!loading && results.length === 0 && !query.trim() && (
            <div className="py-6 px-4 text-center">
              <p className="text-xs text-text-muted mb-3">Suggested Quick Add:</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { symbol: "AAPL", companyName: "Apple Inc.", exchange: "NASDAQ", type: "Stock" },
                  { symbol: "NVDA", companyName: "NVIDIA Corp.", exchange: "NASDAQ", type: "Stock" },
                  { symbol: "TSLA", companyName: "Tesla, Inc.", exchange: "NASDAQ", type: "Stock" },
                  { symbol: "MSFT", companyName: "Microsoft Corp.", exchange: "NASDAQ", type: "Stock" },
                ].map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => handleAdd(s)}
                    disabled={addingSymbol === s.symbol}
                    className="px-2.5 py-1 rounded border border-border bg-surface-raised hover:bg-surface-hover text-xs font-mono font-medium text-text-primary flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-gold" />
                    <span>{s.symbol}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.map((item) => (
            <div
              key={item.symbol}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-text-primary">
                    {item.symbol}
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-surface-raised border border-border text-text-muted">
                    {item.exchange}
                  </span>
                </div>
                <p className="text-xs text-text-secondary truncate max-w-xs mt-0.5">
                  {item.companyName}
                </p>
              </div>

              <button
                onClick={() => handleAdd(item)}
                disabled={addingSymbol === item.symbol}
                className="px-3 py-1.5 rounded-lg accent-gradient hover:opacity-90 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {addingSymbol === item.symbol ? (
                  <span>Adding...</span>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}