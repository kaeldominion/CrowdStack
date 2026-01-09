"use client";

import { memo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface RegistrationChartProps {
  data: Array<{ date: string; registrations: number; checkins: number }>;
  height?: number;
}

// Memoized to prevent re-renders when parent state changes but data hasn't
export const RegistrationChart = memo(function RegistrationChart({ data, height = 200 }: RegistrationChartProps) {
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
          tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 12 }}
          axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
        />
        <YAxis
          tick={{ fill: "rgba(255, 255, 255, 0.4)", fontSize: 12 }}
          axisLine={{ stroke: "rgba(255, 255, 255, 0.1)" }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#141821",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            color: "#fff",
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

