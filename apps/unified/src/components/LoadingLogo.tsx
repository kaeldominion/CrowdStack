"use client";

import { LoadingSpinner } from "@crowdstack/ui";

interface LoadingLogoProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Loading component for the unified app
 * Wraps the shared LoadingSpinner for backwards compatibility
 */
export function LoadingLogo({ message = "Loading...", size = "md" }: LoadingLogoProps) {
  // Map to the new sizes
  const sizeMap: Record<string, "sm" | "md" | "lg" | "xl"> = {
    sm: "md",
    md: "lg",
    lg: "xl",
  };
  
  return (
    <LoadingSpinner 
      size={sizeMap[size] || "lg"} 
      text={message}
    />
  );
}
