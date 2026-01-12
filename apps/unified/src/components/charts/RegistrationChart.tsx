"use client";

import { memo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useThemeSafe } from "@/hooks/useThemeSafe";

interface RegistrationChartProps {
  data: Array<{ date: string; registrations: number; checkins: number }>;
  height?: number;
}

// Memoized to prevent re-renders when parent state changes but data hasn't
export const RegistrationChart = memo(function RegistrationChart({ data, height = 200 }: RegistrationChartProps) {
  const { theme } = useThemeSafe();
  const isLight = theme === "light";
  
  // Theme-aware colors
  const tickColor = isLight ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.4)";
  const axisLineColor = isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)";
  const tooltipBg = isLight ? "#F9FAFB" : "#141821";
  const tooltipBorder = isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(255, 255, 255, 0.1)";
  const tooltipText = isLight ? "#111827" : "#fff";
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRegistrations" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorCheckins" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
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
        />
        <Area
          type="monotone"
          dataKey="registrations"
          stroke="#10b981"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorRegistrations)"
          name="Registrations"
        />
        <Area
          type="monotone"
          dataKey="checkins"
          stroke="#6366f1"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCheckins)"
          name="Check-ins"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});

