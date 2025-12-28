"use client";

import { Card } from "@crowdstack/ui";
import { TrendingUp } from "lucide-react";

interface VelocityChartProps {
  data?: { time: string; value: number }[];
  title?: string;
}

export function VelocityChart({ data = [], title = "Check-in Velocity" }: VelocityChartProps) {
  // Simple bar chart visualization
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-header">{title}</h2>
          <TrendingUp className="h-4 w-4 text-accent-success" />
        </div>
        
        {data.length > 0 ? (
          <div className="flex items-end gap-1 h-32">
            {data.map((point, index) => (
              <div
                key={index}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className="w-full bg-gradient-to-t from-accent-primary to-accent-secondary rounded-t"
                  style={{ height: `${(point.value / maxValue) * 100}%`, minHeight: point.value > 0 ? "4px" : "0" }}
                />
                <span className="text-[8px] text-muted font-mono">{point.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center">
            <p className="text-sm text-muted">No velocity data available</p>
          </div>
        )}
      </div>
    </Card>
  );
}

