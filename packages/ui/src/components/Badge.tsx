"use client";

import { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface BadgeProps {
  children: ReactNode;
  // New AI Studio API
  color?: "purple" | "blue" | "green" | "red" | "orange" | "amber" | "slate";
  variant?: "solid" | "outline" | "ghost" | "default" | "success" | "warning" | "error" | "danger" | "primary" | "secondary";
  // Legacy API (for backward compatibility)
  size?: "sm" | "md";
  className?: string;
  title?: string;
}

export function Badge({ 
  children, 
  color,
  variant = "outline",
  size,
  className,
  title,
}: BadgeProps) {
  // Legacy API mapping: if variant is one of the old values, map to new API
  const legacyVariantMap: Record<string, { color: "purple" | "blue" | "green" | "red" | "orange" | "amber" | "slate"; variant: "solid" | "outline" | "ghost" }> = {
    default: { color: "slate", variant: "outline" },
    success: { color: "green", variant: "outline" },
    warning: { color: "amber", variant: "outline" },
    error: { color: "red", variant: "outline" },
    danger: { color: "red", variant: "outline" },
    primary: { color: "purple", variant: "outline" },
    secondary: { color: "slate", variant: "outline" },
  };

  // New variant types
  const newVariants = ["solid", "outline", "ghost"];
  
  // Determine if using legacy API (variant is a legacy value and color is not provided)
  const isLegacyAPI = !color && variant && variant in legacyVariantMap;
  const isNewVariant = variant && newVariants.includes(variant);
  
  // Resolve effective color and variant
  let effectiveColor: "purple" | "blue" | "green" | "red" | "orange" | "amber" | "slate" = "purple";
  let effectiveVariant: "solid" | "outline" | "ghost" = "outline";
  
  if (color) {
    effectiveColor = color;
    effectiveVariant = isNewVariant ? (variant as "solid" | "outline" | "ghost") : "outline";
  } else if (isLegacyAPI && variant) {
    effectiveColor = legacyVariantMap[variant].color;
    effectiveVariant = legacyVariantMap[variant].variant;
  } else if (isNewVariant) {
    effectiveVariant = variant as "solid" | "outline" | "ghost";
  }

  const colorMap: Record<typeof effectiveColor, Record<typeof effectiveVariant, string>> = {
    purple: {
      outline: "bg-accent-primary/10 border-accent-primary/30 text-accent-primary",
      solid: "bg-accent-primary border-accent-primary text-white",
      ghost: "bg-accent-primary/5 border-transparent text-accent-primary",
    },
    blue: {
      outline: "bg-accent-secondary/10 border-accent-secondary/30 text-accent-secondary",
      solid: "bg-accent-secondary border-accent-secondary text-white",
      ghost: "bg-accent-secondary/5 border-transparent text-accent-secondary",
    },
    green: {
      outline: "bg-accent-success/10 border-accent-success/30 text-accent-success",
      solid: "bg-accent-success border-accent-success text-white",
      ghost: "bg-accent-success/5 border-transparent text-accent-success",
    },
    red: {
      outline: "bg-accent-error/10 border-accent-error/30 text-accent-error",
      solid: "bg-accent-error border-accent-error text-white",
      ghost: "bg-accent-error/5 border-transparent text-accent-error",
    },
    orange: {
      outline: "bg-accent-warning/10 border-accent-warning/30 text-accent-warning",
      solid: "bg-accent-warning border-accent-warning text-void",
      ghost: "bg-accent-warning/5 border-transparent text-accent-warning",
    },
    amber: {
      outline: "bg-accent-warning/10 border-accent-warning/30 text-accent-warning",
      solid: "bg-accent-warning border-accent-warning text-inverse",
      ghost: "bg-accent-warning/5 border-transparent text-accent-warning",
    },
    slate: {
      outline: "bg-muted/10 border-muted/30 text-muted",
      solid: "bg-muted border-muted text-white",
      ghost: "bg-muted/5 border-transparent text-muted",
    },
  };

  const selectedStyle = colorMap[effectiveColor][effectiveVariant];
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[9px]" : size === "md" ? "px-2.5 py-1 text-[9px]" : "px-2 py-1 text-[9px]";

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold tracking-wider uppercase border rounded",
        selectedStyle,
        sizeClass,
        className
      )}
      title={title}
    >
      {children}
    </span>
  );
}

