"use client";

import { Building2, ChevronDown, Loader2 } from "lucide-react";
import { useVenue } from "@/contexts/VenueContext";
import { cn } from "@crowdstack/ui";

interface VenueSwitcherProps {
  className?: string;
  /** Show even if user has only one venue */
  alwaysShow?: boolean;
  /** Compact mode for tight spaces */
  compact?: boolean;
}

export function VenueSwitcher({ className, alwaysShow = false, compact = false }: VenueSwitcherProps) {
  const { venues, selectedVenueId, selectedVenue, isLoading, switchVenue } = useVenue();

  // Don't show if user only has one venue (unless alwaysShow is true)
  if (!alwaysShow && venues.length <= 1) {
    return null;
  }

  const handleVenueChange = async (venueId: string) => {
    try {
      await switchVenue(venueId);
    } catch (error) {
      // Error is already handled in context with toast
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Building2 className={cn("text-secondary", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        <Loader2 className={cn("animate-spin text-secondary", compact ? "h-3 w-3" : "h-4 w-4")} />
      </div>
    );
  }

  // Show venue indicator even with one venue if alwaysShow is true
  if (venues.length <= 1 && alwaysShow && selectedVenue) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Building2 className={cn("text-accent-primary", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        <span className={cn("text-primary font-medium truncate", compact ? "text-xs" : "text-sm")}>
          {selectedVenue.name}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Building2 className={cn("text-accent-primary flex-shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
      <div className="relative flex-1 min-w-0">
        <select
          value={selectedVenueId || ""}
          onChange={(e) => handleVenueChange(e.target.value)}
          className={cn(
            "w-full appearance-none cursor-pointer",
            "pr-7 rounded-lg bg-glass border border-border-subtle",
            "text-primary font-medium",
            "focus:outline-none focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20",
            "hover:border-accent-primary/30 transition-colors",
            compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
          )}
        >
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
        <ChevronDown className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 text-secondary pointer-events-none",
          compact ? "h-3 w-3" : "h-4 w-4"
        )} />
      </div>
    </div>
  );
}
