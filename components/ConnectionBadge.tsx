import type { ConnectionState } from "@/lib/types";

const CONFIG: Record<ConnectionState, { label: string; dotClass: string }> = {
  connecting: { label: "Connecting", dotClass: "bg-text-muted" },
  live: { label: "Live Market Data", dotClass: "bg-positive" },
  reconnecting: { label: "Reconnecting", dotClass: "bg-attention animate-pulse" },
  offline: { label: "Offline — retrying", dotClass: "bg-negative animate-pulse" },
};

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  const cfg = CONFIG[state];
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-text-secondary bg-surface border border-border rounded-full pl-3 pr-3 py-1.5">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
      {cfg.label}
    </div>
  );
}