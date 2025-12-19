"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface EarningsChartProps {
  data: Array<{ date: string; earnings: number }>;
  height?: number;
}

export function EarningsChart({ data, height = 200 }: EarningsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
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
}

