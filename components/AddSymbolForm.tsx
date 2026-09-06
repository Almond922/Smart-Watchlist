"use client";

import { useState } from "react";

export function AddSymbolForm({
  onAdd,
  label = "Add",
  placeholder = "Add symbol (e.g. AAPL)",
}: {
  onAdd: (symbol: string) => void;
  label?: string;
  placeholder?: string;
}) {
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
        placeholder={placeholder}
        className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm font-mono text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-from w-44"
      />
      <button
        type="submit"
        className="accent-gradient text-sm font-medium px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity"
      >
        + {label}
      </button>
    </form>
  );
}