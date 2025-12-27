"use client";

import { ReactNode } from "react";
import { cn } from "../utils/cn";
import { InlineSpinner } from "./InlineSpinner";

export interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  href?: string;
  title?: string;
}

/**
 * CrowdStack Button with branded loading spinner
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  className,
  href,
  title,
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-void disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-accent-primary to-accent-secondary text-white font-bold tracking-widest uppercase text-xs hover:from-accent-primary/90 hover:to-accent-secondary/90 focus:ring-accent-primary shadow-lg shadow-accent-primary/20",
    secondary: "bg-active text-secondary border border-border-strong font-mono text-xs hover:bg-active/80 hover:border-accent-primary/30 focus:ring-accent-primary",
    ghost: "bg-transparent text-muted hover:text-primary font-bold text-[10px] uppercase tracking-widest transition-colors focus:ring-accent-primary",
    destructive: "bg-accent-error text-white hover:bg-accent-error/90 focus:ring-accent-error",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs rounded-lg h-8",
    md: "px-4 py-2 text-xs rounded-xl h-10",
    lg: "px-6 py-3 text-xs rounded-xl h-12",
  };

  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className);

  const buttonContent = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
      title={title}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <InlineSpinner size="sm" className="text-current" />
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );

  if (href) {
    return (
      <a
        href={href}
        className={classes}
      >
        {children}
      </a>
    );
  }

  return buttonContent;
}
