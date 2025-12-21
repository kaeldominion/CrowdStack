"use client";

import { ReactNode } from "react";
import { cn } from "../utils/cn";

export interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
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
  const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-primary text-white hover:bg-primary-hover active:bg-primary-active focus:ring-primary",
    secondary: "bg-surface text-foreground border border-border hover:bg-surface/80 focus:ring-primary",
    ghost: "bg-transparent text-foreground hover:bg-surface focus:ring-primary",
    destructive: "bg-error text-white hover:bg-error/90 focus:ring-error",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm rounded-sm",
    md: "px-4 py-2 text-sm rounded-md",
    lg: "px-6 py-3 text-base rounded-md",
  };

  // Branded CrowdStack spinner - mini stacking bars
  const BrandedSpinner = () => (
    <svg 
      viewBox="0 0 16 16" 
      fill="none" 
      className="h-4 w-4 animate-spin"
      style={{ animationDuration: '1s' }}
    >
      {/* Top bar (accent) */}
      <rect x="5" y="1" width="6" height="2" rx="0.5" fill="currentColor" opacity="1" />
      {/* Second bar */}
      <rect x="4" y="5" width="8" height="2" rx="0.5" fill="currentColor" opacity="0.7" />
      {/* Third bar */}
      <rect x="3" y="9" width="10" height="2" rx="0.5" fill="currentColor" opacity="0.5" />
      {/* Bottom bar */}
      <rect x="2" y="13" width="12" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
    </svg>
  );

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
          <BrandedSpinner />
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
