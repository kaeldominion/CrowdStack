"use client";

import { motion } from "framer-motion";

interface PageLoaderProps {
  message?: string;
  showProgress?: boolean;
}

/**
 * Full-page loading component with CrowdStack branding
 * Uses the tricolor logo with 3D panel + chevrons
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
        {/* Animated tricolor logo - theme-aware using PNG images */}
        <div className="relative" style={{ width: 64, height: 64 }}>
          {/* Light mode: inverted tricolor icon */}
          <motion.div
            className="dark:hidden"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{ width: 64, height: 64 }}
          >
            <img 
              src="/logos/crowdstack-icon-tricolor-inverted-on-transparent.png" 
              alt="CrowdStack" 
              style={{ width: 64, height: 64 }}
              className="object-contain"
            />
          </motion.div>
          {/* Dark mode: SVG animated tricolor logo */}
          <div className="hidden dark:block" style={{ width: 64, height: 64 }}>
            <svg
              viewBox="0 0 24 24"
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
                stroke="url(#pageLoaderPurple)"
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
                stroke="url(#pageLoaderBlue)"
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
