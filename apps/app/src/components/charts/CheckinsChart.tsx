"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface CheckinsChartProps {
  data: Array<{ time: string; checkins: number }>;
  height?: number;
}

export function CheckinsChart({ data, height = 200 }: CheckinsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCheckins" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
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
          dataKey="checkins"
          stroke="#6366f1"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCheckins)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

