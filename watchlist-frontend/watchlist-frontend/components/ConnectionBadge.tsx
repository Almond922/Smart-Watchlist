import type { ConnectionState } from "@/lib/types";

const CONFIG: Record<ConnectionState, { label: string; dotClass: string }> = {
  connecting: { label: "Connecting", dotClass: "bg-text-muted" },
  live: { label: "Live", dotClass: "bg-positive" },
  reconnecting: { label: "Reconnecting", dotClass: "bg-attention animate-pulse" },
  offline: { label: "Offline — retrying", dotClass: "bg-negative animate-pulse" },
};

export function ConnectionBadge({ state }: { state: ConnectionState }) {
  const cfg = CONFIG[state];
  return (
    <div className="flex items-center gap-2 text-sm text-text-secondary font-mono">
      <span className={`inline-block w-2 h-2 rounded-full ${cfg.dotClass}`} />
      {cfg.label}
    </div>
  );
}
