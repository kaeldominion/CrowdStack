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
 * Modern, fast-paced design with stacking bars animation
 * Conveys speed and responsiveness
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
    sm: { icon: 20, bar: { h: 2, gap: 2 }, orbit: 2 },
    md: { icon: 32, bar: { h: 3, gap: 3 }, orbit: 3 },
    lg: { icon: 48, bar: { h: 4, gap: 4 }, orbit: 4 },
    xl: { icon: 64, bar: { h: 5, gap: 5 }, orbit: 5 },
  };

  const config = sizeConfig[size];
  const iconSize = config.icon;

  // Minimal inline spinner for buttons and small contexts - ultra-fast rotating ring
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
          {/* Fast spinning ring with gradient */}
          <circle
            cx="8"
            cy="8"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            strokeOpacity="0.2"
            fill="none"
          />
          <motion.circle
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

  // Full branded spinner with stacking bars
  const spinner = (
    <motion.div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
    >
      {/* Animated stacking bars logo */}
      <div className="relative" style={{ width: iconSize, height: iconSize }}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: iconSize, height: iconSize }}
        >
          {/* Bar 4 - Bottom (widest) */}
          <motion.rect
            x="4"
            y="20"
            width="24"
            height="3"
            rx="1"
            fill="currentColor"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{
              scaleX: [0, 1, 1, 0],
              opacity: [0, 0.4, 0.4, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              times: [0, 0.2, 0.7, 1],
              ease: "easeOut",
            }}
            style={{ transformOrigin: "center" }}
          />

          {/* Bar 3 */}
          <motion.rect
            x="6"
            y="14"
            width="20"
            height="3"
            rx="1"
            fill="currentColor"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{
              scaleX: [0, 1, 1, 0],
              opacity: [0, 0.6, 0.6, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: 0.1,
              times: [0, 0.2, 0.7, 1],
              ease: "easeOut",
            }}
            style={{ transformOrigin: "center" }}
          />

          {/* Bar 2 */}
          <motion.rect
            x="8"
            y="8"
            width="16"
            height="3"
            rx="1"
            fill="currentColor"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{
              scaleX: [0, 1, 1, 0],
              opacity: [0, 0.8, 0.8, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: 0.2,
              times: [0, 0.2, 0.7, 1],
              ease: "easeOut",
            }}
            style={{ transformOrigin: "center" }}
          />

          {/* Bar 1 - Top (accent color) */}
          <motion.rect
            x="10"
            y="2"
            width="12"
            height="3"
            rx="1"
            fill="#3B82F6"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{
              scaleX: [0, 1, 1, 0],
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: 0.3,
              times: [0, 0.2, 0.7, 1],
              ease: "easeOut",
            }}
            style={{ transformOrigin: "center" }}
          />
        </svg>

        {/* Fast orbiting dot */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ width: iconSize, height: iconSize }}
        >
          <motion.div
            className="absolute rounded-full"
            style={{
              width: config.orbit,
              height: config.orbit,
              top: -config.orbit / 2,
              left: "50%",
              marginLeft: -config.orbit / 2,
              backgroundColor: "#3B82F6",
            }}
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
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
              "radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10">{spinner}</div>
      </motion.div>
    );
  }

  return spinner;
}
