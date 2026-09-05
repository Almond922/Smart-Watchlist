export interface Signal {
  kind: string;
  score: number;
  reason: string;
}

export interface SymbolChange {
  symbol: string;
  current_price: number;
  current_volume: number | null;
  is_stale: boolean;
  confidence: number;
  attention_score: number;
  is_first_view: boolean;
  signals: Signal[];
}

export type ConnectionState = "connecting" | "live" | "reconnecting" | "offline";
