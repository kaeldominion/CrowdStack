"use client";

import { memo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useThemeSafe } from "@/hooks/useThemeSafe";

interface EarningsChartProps {
  data: Array<{ date: string; earnings: number }>;
  height?: number;
}

// Memoized to prevent re-renders when parent state changes but data hasn't
export const EarningsChart = memo(function EarningsChart({ data, height = 200 }: EarningsChartProps) {
  const theme = useThemeSafe();
  const isLight = theme === "light";
  
  // Theme-aware colors
  const tickColor = isLight ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.4)";
  const axisLineColor = isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)";
  const tooltipBg = isLight ? "#F9FAFB" : "#141821";
  const tooltipBorder = isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)";
  const tooltipText = isLight ? "#111827" : "#fff";
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fill: tickColor, fontSize: 12 }}
          axisLine={{ stroke: axisLineColor }}
        />
        <YAxis
          tick={{ fill: tickColor, fontSize: 12 }}
          axisLine={{ stroke: axisLineColor }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: "8px",
            color: tooltipText,
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, "Earnings"]}
        />
        <Line
          type="monotone"
          dataKey="earnings"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: "#f59e0b", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

