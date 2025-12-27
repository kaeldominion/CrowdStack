"use client";

import { motion } from "framer-motion";

interface InlineSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

/**
 * CrowdStack branded inline spinner
 * Fast, modern spinning ring for inline use (buttons, inputs, etc.)
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
    <motion.div
      className={`relative ${sizeClasses[size]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
    >
      <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
        {/* Background ring */}
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="currentColor"
          strokeWidth="2"
          strokeOpacity="0.2"
          fill="none"
        />
        {/* Fast spinning accent arc */}
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="#3B82F6"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="28 10"
        />
      </svg>
    </motion.div>
  );
}
