"use client";

import { Card } from "@crowdstack/ui";
import { cn } from "@crowdstack/ui";

export interface XpProgressData {
  total_xp: number;
  level: number;
  xp_in_level: number;
  xp_for_next_level: number;
  progress_pct: number;
}

interface XpProgressBarProps {
  data: XpProgressData;
  className?: string;
  showLevelLabel?: boolean;
  compact?: boolean;
}

export function XpProgressBar({
  data,
  className,
  showLevelLabel = true,
  compact = false,
}: XpProgressBarProps) {
  const { total_xp, level, xp_in_level, xp_for_next_level, progress_pct } = data;
  const isMaxLevel = level >= 10;
  
  // Calculate progress percentage - use provided value or calculate from xp_in_level and xp_for_next_level
  let progressPercentage = Math.min(100, Math.max(0, progress_pct));
  
  // If progress_pct is 0 or invalid, calculate it from xp_in_level and xp_for_next_level
  if (progress_pct === 0 && xp_for_next_level > 0 && !isMaxLevel) {
    // Progress = xp_in_level / (xp_in_level + xp_for_next_level) * 100
    const totalForNextLevel = xp_in_level + xp_for_next_level;
    if (totalForNextLevel > 0) {
      progressPercentage = (xp_in_level / totalForNextLevel) * 100;
    }
  }

  if (compact) {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
            Level {level} of 10
          </span>
          <span className="font-mono text-sm font-bold text-accent-primary">
            {total_xp.toLocaleString()} XP
          </span>
        </div>
        <div className="h-2 bg-raised rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {!isMaxLevel && (
          <p className="text-xs text-secondary text-right">
            {xp_for_next_level.toLocaleString()} XP to Level {level + 1}
          </p>
        )}
      </div>
    );
  }

  return (
    <Card padding="none" className={className}>
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
              Experience Points
            </span>
            {showLevelLabel && (
              <p className="text-sm font-medium text-primary">
                Level {level} of 10
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="font-mono text-xl font-bold text-accent-primary">
              {total_xp.toLocaleString()} XP
            </p>
            {!isMaxLevel && (
              <p className="text-xs text-secondary mt-0.5">
                {xp_for_next_level.toLocaleString()} to next level
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="h-3 bg-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {!isMaxLevel && (
            <div className="flex items-center justify-between text-xs text-secondary">
              <span>
                {xp_in_level.toLocaleString()} / {(total_xp + xp_for_next_level).toLocaleString()} XP
              </span>
              <span>{progressPercentage.toFixed(1)}%</span>
            </div>
          )}
          {isMaxLevel && (
            <p className="text-xs text-secondary text-center">
              Maximum level reached! 🎉
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

