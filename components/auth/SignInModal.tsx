"use client";

import React, { useState } from "react";
import { X, LogIn } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export function SignInModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await signIn(email, name);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error || "Failed to sign in");
      return;
    }
    setEmail("");
    setName("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-surface border border-gold-border rounded-xl shadow-2xl shadow-black/60 p-6">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
            <LogIn className="w-4 h-4 text-black" />
          </div>
          <h2 className="text-base font-semibold text-text-primary">Sign in</h2>
        </div>
        <p className="text-xs text-text-secondary mb-5">
          Sign in with your email to get your own watchlist, saved across visits.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wide text-text-muted mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wide text-text-muted mb-1.5">
              Name <span className="text-text-muted normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Investor"
              className="w-full px-3 py-2 rounded-lg bg-bg border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold transition-colors"
            />
          </div>

          {error && <p className="text-xs text-negative">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg accent-gradient text-black text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 mt-1"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}