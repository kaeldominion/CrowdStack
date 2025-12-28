"use client";

interface ProgressMetricProps {
  label: string;
  value: number; // 0-100
  color?: "primary" | "secondary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  showPercentage?: boolean;
}

export function ProgressMetric({
  label,
  value,
  color = "primary",
  size = "md",
  showPercentage = true,
}: ProgressMetricProps) {
  const colorClasses = {
    primary: "bg-accent-primary",
    secondary: "bg-accent-secondary",
    success: "bg-accent-success",
    warning: "bg-accent-warning",
    error: "bg-accent-error",
  };

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  };

  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
          {label}
        </span>
        {showPercentage && (
          <span className="text-xs font-mono text-muted">{Math.round(clampedValue)}%</span>
        )}
      </div>
      <div className={`w-full bg-raised rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorClasses[color]}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

