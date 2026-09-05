"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLiveChanges } from "@/lib/useLiveChanges";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { AddSymbolForm } from "@/components/AddSymbolForm";
import { WatchlistRow } from "@/components/WatchlistRow";

const STORAGE_KEY = "smart-watchlist-user";

export default function Home() {
  const [userId, setUserId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [outageOn, setOutageOn] = useState(false);
  const [showDemoControls, setShowDemoControls] = useState(false);
  const [pendingSymbols, setPendingSymbols] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { changes, connection, refreshNow } = useLiveChanges(userId);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUserId(Number(stored));
    }
    setLoading(false);
  }, []);

  function showError(message: string) {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(null), 4000);
  }

  // wraps a per-symbol action so: (a) a second click while one is already
  // in flight is ignored instead of firing a duplicate request, and (b)
  // any failure is caught and surfaced quietly instead of crashing the
  // page — the whole app's thesis is "fail gracefully," so the frontend
  // needs to actually do that too, not just the backend.
  async function runSymbolAction(symbol: string, action: () => Promise<unknown>) {
    if (pendingSymbols.has(symbol)) return;
    setPendingSymbols((prev) => new Set(prev).add(symbol));
    try {
      await action();
      await refreshNow();
    } catch (err) {
      showError(err instanceof Error ? err.message : `Action on ${symbol} failed.`);
    } finally {
      setPendingSymbols((prev) => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      const user = await api.createUser(email.trim());
      localStorage.setItem(STORAGE_KEY, String(user.id));
      setUserId(user.id);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Couldn't log in — check the backend is running.");
    }
  }

  async function handleAdd(symbol: string) {
    if (userId === null) return;
    await runSymbolAction(symbol, async () => {
      const result = await api.addSymbol(userId, symbol);
      if (!result.already_added) {
        await api.seedHistory(symbol, 20);
      }
    });
  }

  async function handleAck(symbol: string) {
    if (userId === null) return;
    await runSymbolAction(symbol, () => api.ackSymbol(userId, symbol));
  }

  async function handleRemove(symbol: string) {
    if (userId === null) return;
    await runSymbolAction(symbol, () => api.removeSymbol(userId, symbol));
  }

  async function toggleOutage() {
    const next = !outageOn;
    try {
      await api.injectFailure(next);
      setOutageOn(next);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Couldn't toggle outage mode.");
    }
  }

  if (loading) return null;

  if (userId === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm">
          <h1 className="font-mono text-lg text-text-primary mb-1">Smart Watchlist</h1>
          <p className="text-sm text-text-secondary mb-6">
            Enter an email to load your watchlist — same email, any device.
          </p>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            className="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-attention mb-3"
          />
          <button
            type="submit"
            className="w-full py-2 rounded bg-attention-dim text-attention border border-attention/40 hover:bg-attention/20 transition-colors text-sm"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

  const sorted = [...changes].sort((a, b) => b.attention_score - a.attention_score);
  const nothingNotable = sorted.length > 0 && sorted.every((c) => c.attention_score === 0);

  return (
    <div className="min-h-screen">
      {errorMessage && (
        <div className="px-6 py-2 bg-negative/10 border-b border-negative/40 text-negative text-xs font-mono">
          {errorMessage}
        </div>
      )}

      <header className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div>
          <h1 className="font-mono text-base text-text-primary">Smart Watchlist</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Ranked by what actually changed — not just what moved.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionBadge state={connection} />
          <button
            onClick={() => setShowDemoControls((v) => !v)}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            {showDemoControls ? "Hide" : "Demo"} controls
          </button>
        </div>
      </header>

      {showDemoControls && (
        <div className="px-6 py-3 border-b border-border bg-surface flex items-center gap-3">
          <span className="text-xs text-text-secondary">Simulate an upstream outage:</span>
          <button
            onClick={toggleOutage}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              outageOn
                ? "border-negative text-negative bg-negative/10"
                : "border-border text-text-secondary hover:border-text-secondary"
            }`}
          >
            {outageOn ? "Outage ON — click to restore" : "Trigger outage"}
          </button>
        </div>
      )}

      <div className="px-6 py-4 flex items-center justify-between">
        <span className="text-xs text-text-muted font-mono">
          {sorted.length} symbol{sorted.length !== 1 ? "s" : ""}
        </span>
        <AddSymbolForm onAdd={handleAdd} />
      </div>

      <main className="px-2">
        {sorted.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-text-secondary text-sm">Your watchlist is empty.</p>
            <p className="text-text-muted text-xs mt-1">Add a symbol above to start tracking it.</p>
          </div>
        ) : (
          <>
            {nothingNotable && (
              <p className="px-4 py-2 text-xs text-text-muted">
                Nothing unusual right now — everything's within normal range.
              </p>
            )}
            <div className="border border-border rounded-lg overflow-hidden">
              {sorted.map((change) => (
                <WatchlistRow
                  key={change.symbol}
                  change={change}
                  onAck={handleAck}
                  onRemove={handleRemove}
                  disabled={pendingSymbols.has(change.symbol)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
