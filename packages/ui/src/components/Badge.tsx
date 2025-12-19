"use client";

import { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "danger" | "primary" | "secondary";
  size?: "sm" | "md";
  className?: string;
  title?: string;
}

export function Badge({ 
  children, 
  variant = "default", 
  size = "md",
  className,
  title,
}: BadgeProps) {
  const variantClasses = {
    default: "bg-surface border-border text-foreground",
    success: "bg-success/10 border-success/20 text-success",
    warning: "bg-warning/10 border-warning/20 text-warning",
    error: "bg-error/10 border-error/20 text-error",
    danger: "bg-error/10 border-error/20 text-error",
    primary: "bg-primary/10 border-primary/20 text-primary",
    secondary: "bg-foreground-muted/10 border-foreground-muted/20 text-foreground-muted",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-md border",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      title={title}
    >
      {children}
    </span>
  );
}

