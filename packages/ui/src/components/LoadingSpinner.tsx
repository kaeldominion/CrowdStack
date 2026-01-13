"use client";

import { motion } from "framer-motion";

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
 * Uses the tricolor logo with 3D panel + chevrons
 */
export function LoadingSpinner({
  size = "md",
  className = "",
  text,
  fullScreen = false,
  minimal = false,
}: LoadingSpinnerProps) {
  // Size configurations
  const sizeConfig = {
    sm: 24,
    md: 40,
    lg: 56,
    xl: 72,
  };

  const iconSize = sizeConfig[size];

  // Minimal inline spinner - fast spinning ring
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
        transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.2"
            fill="none"
          />
          <defs>
            <linearGradient id="minimalSpinnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7"/>
              <stop offset="100%" stopColor="#3B82F6"/>
            </linearGradient>
          </defs>
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="url(#minimalSpinnerGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            strokeDasharray="28 10"
          />
        </svg>
      </motion.div>
    );
  }

  // Full branded spinner with 3D panel + chevrons (matching PNG logo)
  const spinner = (
    <motion.div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Animated tricolor logo - SVG with pulsing chevrons */}
      <div className="relative" style={{ width: iconSize, height: iconSize }}>
        {/* Light mode: SVG with black top chevron */}
        <div className="dark:hidden" style={{ width: iconSize, height: iconSize }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: iconSize, height: iconSize }}
          >
            <defs>
              <linearGradient id="loadingPurpleGradientLight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A855F7"/>
                <stop offset="100%" stopColor="#C084FC"/>
              </linearGradient>
              <linearGradient id="loadingBlueGradientLight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6"/>
                <stop offset="100%" stopColor="#60A5FA"/>
              </linearGradient>
            </defs>
            
            {/* Top layer (black) - pulsing */}
            <motion.path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              fill="none"
              stroke="#000000"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0,
              }}
            />
            
            {/* Middle layer (purple) - pulsing */}
            <motion.path
              d="M2 12L12 17L22 12"
              stroke="url(#loadingPurpleGradientLight)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.15,
              }}
            />
            
            {/* Bottom layer (blue) - pulsing with delay */}
            <motion.path
              d="M2 17L12 22L22 17"
              stroke="url(#loadingBlueGradientLight)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
            />
          </svg>
        </div>
        {/* Dark mode: SVG animated tricolor logo */}
        <div className="hidden dark:block" style={{ width: iconSize, height: iconSize }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: iconSize, height: iconSize }}
          >
            <defs>
              <linearGradient id="loadingPurpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A855F7"/>
                <stop offset="100%" stopColor="#C084FC"/>
              </linearGradient>
              <linearGradient id="loadingBlueGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6"/>
                <stop offset="100%" stopColor="#60A5FA"/>
              </linearGradient>
            </defs>
            
            {/* Top layer (white) - pulsing */}
            <motion.path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0,
              }}
            />
            
            {/* Middle layer (purple) - pulsing */}
            <motion.path
              d="M2 12L12 17L22 12"
              stroke="url(#loadingPurpleGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.15,
              }}
            />
            
            {/* Bottom layer (blue) - pulsing with delay */}
            <motion.path
              d="M2 17L12 22L22 17"
              stroke="url(#loadingBlueGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3,
              }}
            />
          </svg>
        </div>
      </div>

      {text && (
        <motion.p
          className="text-sm text-secondary font-mono text-[10px] uppercase tracking-widest"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );

  if (fullScreen) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-void"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        {/* Subtle radial gradient */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10">{spinner}</div>
      </motion.div>
    );
  }

  return spinner;
}
