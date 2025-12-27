"use client";

import { motion } from "framer-motion";
import { Logo } from "./Logo";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  text?: string;
  fullScreen?: boolean;
  /** Use a minimal inline spinner instead of full logo */
  minimal?: boolean;
}

/**
 * CrowdStack branded loading spinner
 * Uses the animated logo with stacking bars and orbital elements
 */
export function LoadingSpinner({
  size = "md",
  className = "",
  text,
  fullScreen = false,
  minimal = false,
}: LoadingSpinnerProps) {
  // Minimal inline spinner for buttons and small contexts
  if (minimal) {
    const minimalSizes = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5",
      xl: "h-6 w-6",
    };
    
    return (
      <motion.div
        className={`relative ${minimalSizes[size]} ${className}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        {/* Rotating bars */}
        <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
          <motion.rect
            x="5" y="1" width="6" height="2" rx="0.5"
            fill="#3B82F6"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0 }}
          />
          <motion.rect
            x="4" y="5" width="8" height="2" rx="0.5"
            fill="currentColor"
            animate={{ opacity: [0.8, 0.3, 0.8] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.15 }}
          />
          <motion.rect
            x="3" y="9" width="10" height="2" rx="0.5"
            fill="currentColor"
            animate={{ opacity: [0.6, 0.3, 0.6] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
          />
          <motion.rect
            x="2" y="13" width="12" height="2" rx="0.5"
            fill="currentColor"
            animate={{ opacity: [0.4, 0.2, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.45 }}
          />
        </svg>
      </motion.div>
    );
  }

  const spinner = (
    <motion.div 
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Animated logo with loading state */}
      <Logo variant="icon" size={size} loading={true} />
      
      {text && (
        <motion.p
          className="text-sm text-secondary"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );

  if (fullScreen) {
    return (
      <motion.div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0D10]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Subtle background pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.03) 0%, transparent 50%)`,
            }}
          />
        </div>
        
        <div className="relative z-10">
          {spinner}
        </div>
      </motion.div>
    );
  }

  return spinner;
}
