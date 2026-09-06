"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { HistoricalDataPoint } from "@/providers/market-data";

interface StockChartProps {
  data: HistoricalDataPoint[];
  symbol: string;
  isPositive?: boolean;
}

export function StockChart({ data, symbol, isPositive = true }: StockChartProps) {
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "90D">("30D");

  // Filter data based on timeframe
  const daysCount = timeframe === "7D" ? 7 : timeframe === "30D" ? 30 : 90;
  const slicedData = data.slice(-daysCount);

  // Price bounds
  const prices = slicedData.map((d) => d.close);
  const minPrice = Math.floor(Math.min(...prices) * 0.98);
  const maxPrice = Math.ceil(Math.max(...prices) * 1.02);

  const strokeColor = isPositive ? "#34d399" : "#f87171"; // emerald or rose
  const gradientId = `colorPrice-${symbol}`;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      {/* Header & Timeframe Selector */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
            Price & Volume History
          </span>
          <div className="font-mono text-sm font-semibold text-text-primary">
            Daily Candles ({timeframe})
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-surface-raised rounded-lg border border-border">
          {(["7D", "30D", "90D"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                timeframe === tf
                  ? "bg-blue-600 text-white font-semibold"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Main Area Chart */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={slicedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.slice(5)} // MM-DD
            />
            <YAxis
              domain={[minPrice, maxPrice]}
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `$${val}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload as HistoricalDataPoint;
                  return (
                    <div className="bg-[#181a20] border border-border rounded-lg p-3 shadow-xl font-mono text-xs">
                      <div className="text-text-muted mb-1">{d.date}</div>
                      <div className="text-text-primary font-bold text-sm">
                        Close: ${d.close.toFixed(2)}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-[11px] text-text-secondary">
                        <span>Open: ${d.open.toFixed(2)}</span>
                        <span>High: ${d.high.toFixed(2)}</span>
                        <span>Low: ${d.low.toFixed(2)}</span>
                        <span>Vol: {(d.volume / 1000000).toFixed(1)}M</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke={strokeColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Mini Volume Bar Chart Below */}
      <div className="h-16 w-full mt-2 pt-2 border-t border-border/40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={slicedData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
            <Bar
              dataKey="volume"
              fill="#3b82f6"
              opacity={0.5}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

