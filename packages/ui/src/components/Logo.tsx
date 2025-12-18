"use client";

import { motion } from "framer-motion";

interface LogoProps {
  variant?: "full" | "icon" | "wordmark";
  size?: "sm" | "md" | "lg";
  className?: string;
  animated?: boolean;
}

export function Logo({ variant = "full", size = "md", className = "", animated = true }: LogoProps) {
  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12",
  };

  const iconSize = sizeClasses[size];

  const StackIcon = () => {
    const svgContent = (
      <svg
        viewBox="0 0 32 32"
        className={iconSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Abstract stack - layers representing data/events */}
        <rect x="4" y="20" width="24" height="3" rx="1" fill="currentColor" opacity="0.4" />
        <rect x="6" y="14" width="20" height="3" rx="1" fill="currentColor" opacity="0.6" />
        <rect x="8" y="8" width="16" height="3" rx="1" fill="currentColor" opacity="0.8" />
        {/* Signal indicator - top layer with accent color */}
        <rect x="10" y="2" width="12" height="3" rx="1" fill="#3B82F6" />
        {/* Grid lines - data structure */}
        <line x1="16" y1="2" x2="16" y2="23" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
        <line x1="8" y1="11" x2="24" y2="11" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
        <line x1="8" y1="17" x2="24" y2="17" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
      </svg>
    );

    if (animated) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {svgContent}
        </motion.div>
      );
    }

    return svgContent;
  };

  const Wordmark = () => (
    <span className="font-semibold tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>
      CrowdStack
    </span>
  );

  if (variant === "icon") {
    return <div className={`inline-flex items-center ${className}`}>{StackIcon()}</div>;
  }

  if (variant === "wordmark") {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Wordmark />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <StackIcon />
      <Wordmark />
    </div>
  );
}
