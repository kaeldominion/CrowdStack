"use client";

import { Card } from "@crowdstack/ui";
import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accent?: "primary" | "secondary" | "success" | "warning" | "error";
}

export function StatCard({ label, value, icon, accent }: StatCardProps) {
  const accentColors = {
    primary: "text-accent-primary",
    secondary: "text-accent-secondary",
    success: "text-accent-success",
    warning: "text-accent-warning",
    error: "text-accent-error",
  };

  const accentBgColors = {
    primary: "bg-accent-primary/10 border-accent-primary/30",
    secondary: "bg-accent-secondary/10 border-accent-secondary/30",
    success: "bg-accent-success/10 border-accent-success/30",
    warning: "bg-accent-warning/10 border-accent-warning/30",
    error: "bg-accent-error/10 border-accent-error/30",
  };

  return (
    <Card padding="compact">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary mb-1">
            {label}
          </p>
          <p className={`text-2xl font-mono font-bold tracking-tight ${accent ? accentColors[accent] : "text-primary"}`}>
            {value}
          </p>
        </div>
        {icon && (
          <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${accent ? accentBgColors[accent] : "bg-raised border-border-subtle"}`}>
            <span className={accent ? accentColors[accent] : "text-secondary"}>
              {icon}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

