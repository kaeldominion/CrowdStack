"use client";

import { ReactNode } from "react";
import { cn } from "../utils/cn";
import { Crown, Star, Sparkles, Zap } from "lucide-react";

export type VipLevel = "global" | "venue" | "organizer" | "event" | "none";
export type VipVariant = "badge" | "pill" | "icon" | "label";

export interface VipBadgeProps {
  level: VipLevel;
  variant?: VipVariant;
  /** For scoped VIP, optionally show the entity name */
  scopeName?: string;
  /** Custom tooltip/reason */
  reason?: string;
  /** Size */
  size?: "xs" | "sm" | "md" | "lg";
  /** Additional classes */
  className?: string;
  /** Show icon only (for tight spaces) */
  iconOnly?: boolean;
}

/**
 * VIP Badge Component
 * 
 * Displays VIP status with different visual treatments:
 * - Global VIP: Gold/amber with crown icon - "VIP" or "GLOBAL VIP"
 * - Venue VIP: Purple with star icon - "VENUE VIP" or venue name
 * - Organizer VIP: Blue with sparkles icon - "ORG VIP" or organizer name
 * 
 * Variants:
 * - badge: Standard badge format (uppercase, bordered)
 * - pill: Rounded pill format
 * - icon: Just the icon with subtle background
 * - label: Text with icon, no border
 */
export function VipBadge({
  level,
  variant = "badge",
  scopeName,
  reason,
  size = "sm",
  className,
  iconOnly = false,
}: VipBadgeProps) {
  if (level === "none") return null;

  const config = {
    global: {
      icon: Crown,
      label: "VIP",
      fullLabel: "GLOBAL VIP",
      colors: {
        badge: "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-400/50 text-amber-400",
        pill: "bg-gradient-to-r from-amber-500 to-yellow-500 text-void",
        icon: "bg-amber-500/20 text-amber-400",
        label: "text-amber-400",
      },
      glow: "shadow-[0_0_12px_rgba(251,191,36,0.3)]",
    },
    venue: {
      icon: Star,
      label: "VIP",
      fullLabel: scopeName ? `${scopeName} VIP` : "VENUE VIP",
      colors: {
        badge: "bg-accent-primary/20 border-accent-primary/50 text-accent-primary",
        pill: "bg-accent-primary text-white",
        icon: "bg-accent-primary/20 text-accent-primary",
        label: "text-accent-primary",
      },
      glow: "shadow-[0_0_12px_rgba(139,92,246,0.3)]",
    },
    organizer: {
      icon: Sparkles,
      label: "VIP",
      fullLabel: scopeName ? `${scopeName} VIP` : "ORG VIP",
      colors: {
        badge: "bg-accent-secondary/20 border-accent-secondary/50 text-accent-secondary",
        pill: "bg-accent-secondary text-white",
        icon: "bg-accent-secondary/20 text-accent-secondary",
        label: "text-accent-secondary",
      },
      glow: "shadow-[0_0_12px_rgba(59,130,246,0.3)]",
    },
    event: {
      icon: Zap,
      label: "VIP",
      fullLabel: scopeName ? `${scopeName} VIP` : "EVENT VIP",
      colors: {
        badge: "bg-emerald-500/20 border-emerald-400/50 text-emerald-400",
        pill: "bg-emerald-500 text-white",
        icon: "bg-emerald-500/20 text-emerald-400",
        label: "text-emerald-400",
      },
      glow: "shadow-[0_0_12px_rgba(52,211,153,0.3)]",
    },
  };

  const { icon: Icon, label, fullLabel, colors, glow } = config[level];

  const sizeConfig = {
    xs: { iconSize: "h-2.5 w-2.5", text: "text-[8px]", padding: "px-1 py-0.5", iconPadding: "p-0.5" },
    sm: { iconSize: "h-3 w-3", text: "text-[9px]", padding: "px-1.5 py-0.5", iconPadding: "p-1" },
    md: { iconSize: "h-3.5 w-3.5", text: "text-[10px]", padding: "px-2 py-1", iconPadding: "p-1.5" },
    lg: { iconSize: "h-4 w-4", text: "text-xs", padding: "px-2.5 py-1", iconPadding: "p-2" },
  };

  const { iconSize, text, padding, iconPadding } = sizeConfig[size];

  // Icon-only variant
  if (iconOnly || variant === "icon") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full",
          iconPadding,
          colors.icon,
          level === "global" && glow,
          className
        )}
        title={reason || fullLabel}
      >
        <Icon className={iconSize} />
      </span>
    );
  }

  // Label variant (no border)
  if (variant === "label") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-bold tracking-wider uppercase",
          text,
          colors.label,
          className
        )}
        title={reason || fullLabel}
      >
        <Icon className={iconSize} />
        <span>{label}</span>
      </span>
    );
  }

  // Pill variant (fully rounded, solid)
  if (variant === "pill") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-bold tracking-wider uppercase rounded-full",
          text,
          padding,
          colors.pill,
          level === "global" && glow,
          className
        )}
        title={reason || fullLabel}
      >
        <Icon className={iconSize} />
        <span>{label}</span>
      </span>
    );
  }

  // Badge variant (default)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-bold tracking-wider uppercase border rounded",
        text,
        padding,
        colors.badge,
        level === "global" && glow,
        className
      )}
      title={reason || fullLabel}
    >
      <Icon className={iconSize} />
      <span>{label}</span>
    </span>
  );
}

/**
 * VIP Status Indicator
 * 
 * Shows all applicable VIP statuses for an attendee
 * Useful when showing combined status (e.g., someone who is both global and venue VIP)
 */
export interface VipStatusProps {
  isGlobalVip?: boolean;
  isVenueVip?: boolean;
  isOrganizerVip?: boolean;
  isEventVip?: boolean;
  venueName?: string;
  organizerName?: string;
  eventName?: string;
  variant?: VipVariant;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  /** Show only the highest level (global > venue > organizer > event) */
  showHighestOnly?: boolean;
}

export function VipStatus({
  isGlobalVip = false,
  isVenueVip = false,
  isOrganizerVip = false,
  isEventVip = false,
  venueName,
  organizerName,
  eventName,
  variant = "badge",
  size = "sm",
  className,
  showHighestOnly = false,
}: VipStatusProps) {
  const hasAnyVip = isGlobalVip || isVenueVip || isOrganizerVip || isEventVip;

  if (!hasAnyVip) return null;

  if (showHighestOnly) {
    // Show only the highest level
    if (isGlobalVip) {
      return <VipBadge level="global" variant={variant} size={size} className={className} />;
    }
    if (isVenueVip) {
      return <VipBadge level="venue" variant={variant} size={size} scopeName={venueName} className={className} />;
    }
    if (isOrganizerVip) {
      return <VipBadge level="organizer" variant={variant} size={size} scopeName={organizerName} className={className} />;
    }
    if (isEventVip) {
      return <VipBadge level="event" variant={variant} size={size} scopeName={eventName} className={className} />;
    }
    return null;
  }

  // Show all applicable VIP statuses
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {isGlobalVip && <VipBadge level="global" variant={variant} size={size} />}
      {isVenueVip && <VipBadge level="venue" variant={variant} size={size} scopeName={venueName} />}
      {isOrganizerVip && <VipBadge level="organizer" variant={variant} size={size} scopeName={organizerName} />}
      {isEventVip && <VipBadge level="event" variant={variant} size={size} scopeName={eventName} />}
    </div>
  );
}

export default VipBadge;

