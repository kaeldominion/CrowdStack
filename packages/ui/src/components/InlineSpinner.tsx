"use client";

import { motion } from "framer-motion";

interface InlineSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

/**
 * CrowdStack branded inline spinner
 * Cascading stacked bars animation for inline use (buttons, inputs, etc.)
 * Drop-in replacement for Lucide's Loader2
 */
export function InlineSpinner({ size = "md", className = "" }: InlineSpinnerProps) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  // Bar animation - cascading pulse effect
  const barVariants = {
    animate: (i: number) => ({
      scaleX: [0.3, 1, 0.3],
      opacity: [0.3, 1, 0.3],
      transition: {
        duration: 1.2,
        ease: "easeInOut",
        repeat: Infinity,
        delay: i * 0.15,
      },
    }),
  };

  return (
    <motion.svg 
      viewBox="0 0 16 16" 
      fill="none" 
      className={`${sizeClasses[size]} ${className}`}
    >
      {/* Stacked bars - CrowdStack identity with cascading animation */}
      <motion.rect 
        x="5" y="1" width="6" height="2" rx="0.5" 
        fill="currentColor" 
        variants={barVariants}
        animate="animate"
        custom={0}
        style={{ originX: 0.5 }}
      />
      <motion.rect 
        x="4" y="5" width="8" height="2" rx="0.5" 
        fill="currentColor" 
        variants={barVariants}
        animate="animate"
        custom={1}
        style={{ originX: 0.5 }}
      />
      <motion.rect 
        x="3" y="9" width="10" height="2" rx="0.5" 
        fill="currentColor" 
        variants={barVariants}
        animate="animate"
        custom={2}
        style={{ originX: 0.5 }}
      />
      <motion.rect 
        x="2" y="13" width="12" height="2" rx="0.5" 
        fill="currentColor" 
        variants={barVariants}
        animate="animate"
        custom={3}
        style={{ originX: 0.5 }}
      />
    </motion.svg>
  );
}

