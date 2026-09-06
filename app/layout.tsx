import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { AppShell } from "@/components/nav/AppShell";

export const metadata: Metadata = {
  title: "SignalWatch | Intelligent Market Radar",
  description: "A smart market watchlist answering: What happened in my watchlist since I last checked, and what should I care about?",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full bg-bg text-text-primary">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}