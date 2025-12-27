"use client";

import { motion } from "framer-motion";

interface PageLoaderProps {
  message?: string;
  showProgress?: boolean;
}

/**
 * Full-page loading component with CrowdStack branding
 * Modern, fast-paced design that conveys speed and responsiveness
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
      {/* Subtle ambient glow - faster pulse */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 60%)",
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
        {/* Animated stacking bars logo */}
        <div className="relative" style={{ width: 56, height: 56 }}>
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: 56, height: 56 }}
          >
            {/* Bar 4 - Bottom (widest) */}
            <motion.rect
              x="4"
              y="20"
              width="24"
              height="3"
              rx="1"
              fill="white"
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
              fill="white"
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
              fill="white"
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
            style={{ width: 56, height: 56 }}
          >
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 4,
                height: 4,
                top: -2,
                left: "50%",
                marginLeft: -2,
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

        {/* Brand name with fast fade */}
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
          <span className="text-[#3B82F6]">.</span>
        </motion.div>

        {/* Progress bar - faster animation */}
        {showProgress && (
          <motion.div
            className="h-0.5 w-32 overflow-hidden rounded-full bg-white/10"
            initial={{ opacity: 0, scaleX: 0.8 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.1, duration: 0.2 }}
          >
            <motion.div
              className="h-full rounded-full bg-[#3B82F6]"
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
