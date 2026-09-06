import type { SymbolChange } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${options?.method ?? "GET"} ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

export function wsUrl(userId: number): string {
  const wsBase = API_BASE.replace(/^http/, "ws");
  return `${wsBase}/ws/${userId}/changes`;
}

export const api = {
  createUser: (email: string) =>
    request<{ id: number; email: string }>("/users", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  listWatchlist: (userId: number) => request<string[]>(`/watchlist/${userId}`),

  getChanges: (userId: number) => request<SymbolChange[]>(`/watchlist/${userId}/changes`),

  addSymbol: (userId: number, symbol: string) =>
    request<{ symbol: string; already_added: boolean }>(`/watchlist/${userId}`, {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),

  removeSymbol: (userId: number, symbol: string) =>
    request<{ removed: string }>(`/watchlist/${userId}/${symbol}`, { method: "DELETE" }),

  ackSymbol: (userId: number, symbol: string) =>
    request<{ symbol: string; seen_at: string; version: number }>(
      `/watchlist/${userId}/${symbol}/ack`,
      { method: "POST" }
    ),

  seedHistory: (symbol: string, points = 20) =>
    request(`/admin/seed-history/${symbol}?points=${points}`, { method: "POST" }),

  injectFailure: (on: boolean) =>
    request<{ upstream_forced_failure: boolean }>(`/admin/inject-failure?on=${on}`, {
      method: "POST",
    }),
};
