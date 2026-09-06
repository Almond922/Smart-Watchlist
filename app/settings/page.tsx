"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/dashboard/Header";
import { SettingsPanel } from "@/components/SettingsPanel";
import { loadSensitivity, saveSensitivity, type Sensitivity } from "@/lib/sensitivity";
import { useAuth, useScopedUserId } from "@/lib/AuthContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const userId = useScopedUserId();
  const [sensitivity, setSensitivity] = useState<Sensitivity>("medium");
  const [outageOn, setOutageOn] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setSensitivity(loadSensitivity());
    fetch("/api/demo/simulate")
      .then((res) => res.json())
      .then((json) => setOutageOn(!!json.outageActive))
      .catch(() => {});
  }, []);

  function showToast(message: string) {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  }

  function handleChangeSensitivity(value: Sensitivity) {
    setSensitivity(value);
    saveSensitivity(value);
    showToast(`Attention sensitivity set to ${value}`);
  }

  async function handleToggleOutage() {
    try {
      const res = await fetch("/api/demo/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-outage", userId }),
      });
      const json = await res.json();
      setOutageOn(!!json.outageActive);
      showToast(json.message || "Outage state updated");
    } catch {
      showToast("Failed to toggle outage simulation");
    }
  }

  async function handleResetDemo() {
    try {
      const res = await fetch("/api/demo/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-reviews", userId }),
      });
      const json = await res.json();
      showToast(json.message || "Demo watchlist reset");
    } catch {
      showToast("Failed to reset demo watchlist");
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="px-4 py-2.5 rounded-lg border border-border bg-surface-raised text-xs font-mono shadow-xl text-text-primary">
            {notification}
          </div>
        </div>
      )}

      <Header title="Settings" subtitle="Configure detection sensitivity and demo tools" />

      <main className="max-w-7xl mx-auto">
        {user && (
          <div className="px-6 pt-8 max-w-2xl">
            <div className="border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-text-primary">Signed in as</div>
                <div className="text-xs text-text-secondary mt-0.5">{user.name || user.email}</div>
              </div>
              <span className="text-[11px] font-mono px-2 py-1 rounded bg-gold-soft text-gold border border-gold-border">
                {user.email}
              </span>
            </div>
          </div>
        )}

        <SettingsPanel
          sensitivity={sensitivity}
          onChangeSensitivity={handleChangeSensitivity}
          outageOn={outageOn}
          onToggleOutage={handleToggleOutage}
          onResetDemo={handleResetDemo}
        />
      </main>
    </div>
  );
}