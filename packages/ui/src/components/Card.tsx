"use client";

import { ReactNode } from "react";
import { cn } from "../utils/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** 
   * Padding size: 
   * - "default" = p-4 (16px) - standard cards
   * - "compact" = p-3 (12px) - list items, stats
   * - "none" = no padding wrapper - full custom control
   */
  padding?: "default" | "compact" | "none";
  /** @deprecated Use padding="none" instead */
  noPadding?: boolean;
  hover?: boolean;
  onClick?: () => void;
  header?: ReactNode;
  footer?: ReactNode;
}

export function Card({ 
  children, 
  className, 
  padding = "default",
  noPadding = false,
  hover = false, 
  onClick,
  header,
  footer,
}: CardProps) {
  const baseClasses = "relative rounded-xl bg-glass/70 border border-border-subtle backdrop-blur-xl ring-1 ring-white/5 shadow-soft";
  const hoverClasses = hover || onClick ? "cursor-pointer transition-all hover:border-accent-primary/40 hover:shadow-lg hover:ring-accent-primary/20" : "";

  // Determine effective padding
  const effectivePadding = noPadding ? "none" : padding;
  
  const paddingClasses = {
    default: "p-4",
    compact: "p-3",
    none: "",
  };

  const content = (
    <div className={cn(baseClasses, hoverClasses, className)} onClick={onClick}>
      {header && (
        <div className="px-4 py-3 border-b border-border-subtle">
          {header}
        </div>
      )}
      {effectivePadding === "none" ? (
        children
      ) : (
        <div className={cn(paddingClasses[effectivePadding], header && "pt-4", footer && "pb-4")}>
          {children}
        </div>
      )}
      {footer && (
        <div className="px-4 py-3 border-t border-border-subtle">
          {footer}
        </div>
      )}
    </div>
  );

  return content;
}

