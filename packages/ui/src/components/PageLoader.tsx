"use client";

import { motion } from "framer-motion";
import { Logo } from "./Logo";

interface PageLoaderProps {
  message?: string;
  showProgress?: boolean;
}

/**
 * Full-page loading component with CrowdStack branding
 * Uses animated stacking logo with orbital elements
 */
export function PageLoader({ message, showProgress = true }: PageLoaderProps) {
  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0D10]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        {/* Animated Logo with stacking bars and orbital elements */}
        <Logo variant="icon" size="xl" loading={true} />
        
        {/* Brand name with subtle animation */}
        <motion.div
          className="text-2xl font-semibold tracking-tight"
          style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
          animate={{
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="text-[#3B82F6]">Crowd</span>
          <span className="text-white">Stack</span>
        </motion.div>
        
        {/* Progress bar */}
        {showProgress && (
          <motion.div
            className="h-1 w-40 overflow-hidden rounded-full bg-[#141821]"
            initial={{ opacity: 0, scaleX: 0.8 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #3B82F6 0%, #60A5FA 50%, #3B82F6 100%)',
                backgroundSize: '200% 100%',
              }}
              animate={{ 
                x: ["-100%", "100%"],
                backgroundPosition: ['0% 0%', '100% 0%'],
              }}
              transition={{ 
                x: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" },
              }}
            />
          </motion.div>
        )}
        
        {/* Loading message */}
        {message && (
          <motion.p
            className="text-sm text-white/60"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {message}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
