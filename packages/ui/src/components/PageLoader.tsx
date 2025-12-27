"use client";

import { motion } from "framer-motion";

interface PageLoaderProps {
  message?: string;
  showProgress?: boolean;
}

/**
 * Full-page loading component with CrowdStack branding
 * Uses the tricolor chevron logo with white top bar
 */
export function PageLoader({ message, showProgress = true }: PageLoaderProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 60%)",
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 flex flex-col items-center gap-5"
      >
        {/* Animated tricolor chevron logo with white top bar */}
        <div className="relative" style={{ width: 64, height: 64 }}>
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: 64, height: 64 }}
          >
            <defs>
              <linearGradient id="pageLoaderPurple" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#A855F7"/>
                <stop offset="100%" stopColor="#C084FC"/>
              </linearGradient>
              <linearGradient id="pageLoaderBlue" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6"/>
                <stop offset="100%" stopColor="#60A5FA"/>
              </linearGradient>
            </defs>
            
            {/* White top bar */}
            <motion.rect
              x="8"
              y="2"
              width="16"
              height="3"
              rx="1.5"
              fill="white"
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            {/* Top chevron (purple) - pulsing */}
            <motion.path
              d="M4 12L16 22L28 12"
              stroke="url(#pageLoaderPurple)"
              strokeWidth="3.5"
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
                delay: 0.1,
              }}
            />
            
            {/* Bottom chevron (blue) - pulsing with delay */}
            <motion.path
              d="M4 20L16 30L28 20"
              stroke="url(#pageLoaderBlue)"
              strokeWidth="3.5"
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
                delay: 0.2,
              }}
            />
          </svg>
        </div>

        {/* Brand name */}
        <motion.div
          className="text-xl font-black tracking-tighter uppercase"
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="text-white">CROWDSTACK</span>
          <span className="text-[#A855F7]">.</span>
        </motion.div>

        {/* Progress bar */}
        {showProgress && (
          <motion.div
            className="h-0.5 w-32 overflow-hidden rounded-full bg-white/10"
            initial={{ opacity: 0, scaleX: 0.8 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #A855F7 0%, #3B82F6 100%)",
              }}
              animate={{
                x: ["-100%", "200%"],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: [0.4, 0, 0.6, 1],
              }}
            />
          </motion.div>
        )}

        {/* Loading message */}
        {message && (
          <motion.p
            className="text-xs text-secondary font-mono uppercase tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {message}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
