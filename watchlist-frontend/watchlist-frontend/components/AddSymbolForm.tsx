"use client";

import { useState } from "react";

export function AddSymbolForm({ onAdd }: { onAdd: (symbol: string) => void }) {
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const symbol = value.trim().toUpperCase();
    if (!symbol) return;
    onAdd(symbol);
    setValue("");
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add symbol (e.g. AAPL)"
        className="bg-surface border border-border rounded px-3 py-1.5 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-attention w-44"
      />
      <button
        type="submit"
        className="text-sm px-3 py-1.5 rounded bg-attention-dim text-attention border border-attention/40 hover:bg-attention/20 transition-colors"
      >
        Add
      </button>
    </form>
  );
}
