"use client";

import { useEffect, useRef, useState } from "react";
import { api, wsUrl } from "./api";
import type { SymbolChange, ConnectionState } from "./types";

const RECONNECT_DELAY_MS = 3000;

export function useLiveChanges(userId: number | null) {
  const [changes, setChanges] = useState<SymbolChange[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasConnectedOnceRef = useRef(false);

  useEffect(() => {
    if (userId === null) return;
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      setConnection(hasConnectedOnceRef.current ? "reconnecting" : "connecting");
      const ws = new WebSocket(wsUrl(userId as number));
      socketRef.current = ws;

      ws.onopen = () => {
        hasConnectedOnceRef.current = true;
        setConnection("live");
      };

      ws.onmessage = (event) => {
        try {
          const data: SymbolChange[] = JSON.parse(event.data);
          setChanges(data);
        } catch {
          // malformed push — ignore this tick rather than crash the UI,
          // next scheduled push will self-correct
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnection("offline");
        // the backend outage-simulation and normal network hiccups both
        // land here — the frontend's job is to keep trying, not give up
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, [userId]);

  // for use right after a mutation (add/remove/ack) — don't make the user
  // wait up to PUSH_INTERVAL_SECONDS for the next scheduled push to see
  // their own action reflected
  async function refreshNow() {
    if (userId === null) return;
    try {
      const data = await api.getChanges(userId);
      setChanges(data);
    } catch {
      // the next WS push (or reconnect) will catch it up; not fatal here
    }
  }

  return { changes, connection, refreshNow };
}
