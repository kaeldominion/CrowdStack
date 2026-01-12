"use client";

import { useThemeSafe } from "@/hooks/useThemeSafe";
import { Switch } from "@crowdstack/ui";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ showLabel = true, className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeSafe();
  const isLight = theme === "light";

  return (
    <div className={`flex items-center gap-3 ${className || ""}`}>
      <div className="flex items-center gap-2">
        <Moon className="h-4 w-4 text-muted" />
        <Switch
          checked={isLight}
          onChange={toggleTheme}
          aria-label="Toggle theme"
        />
        <Sun className="h-4 w-4 text-muted" />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-primary">
          {isLight ? "Light" : "Dark"} Mode
        </span>
      )}
    </div>
  );
}
