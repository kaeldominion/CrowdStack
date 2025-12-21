"use client";

interface InlineSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

/**
 * CrowdStack branded inline spinner
 * A minimal spinning stack bars animation for inline use (buttons, inputs, etc.)
 * Drop-in replacement for Lucide's Loader2
 */
export function InlineSpinner({ size = "md", className = "" }: InlineSpinnerProps) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <svg 
      viewBox="0 0 16 16" 
      fill="none" 
      className={`animate-spin ${sizeClasses[size]} ${className}`}
      style={{ animationDuration: '1s' }}
    >
      {/* Stacked bars - CrowdStack identity */}
      <rect x="5" y="1" width="6" height="2" rx="0.5" fill="currentColor" opacity="1" />
      <rect x="4" y="5" width="8" height="2" rx="0.5" fill="currentColor" opacity="0.7" />
      <rect x="3" y="9" width="10" height="2" rx="0.5" fill="currentColor" opacity="0.5" />
      <rect x="2" y="13" width="12" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

