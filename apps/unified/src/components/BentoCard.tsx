"use client";

import { ReactNode, memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@crowdstack/ui";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  span?: 1 | 2 | 3 | 4;
  onClick?: () => void;
}

// Memoized to prevent unnecessary re-renders in dashboard grids
export const BentoCard = memo(function BentoCard({ children, className = "", span = 1, onClick }: BentoCardProps) {
  return (
    <motion.div
      className={cn(
        "group relative rounded-lg border border-border-subtle bg-glass",
        "overflow-hidden transition-all duration-300",
        span === 2 && "md:col-span-2",
        span === 3 && "md:col-span-3",
        span === 4 && "md:col-span-4",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Noise texture background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "100px 100px",
          imageRendering: "pixelated",
        }}
      />

      {/* Animated gradient border on hover */}
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{
            background: "linear-gradient(90deg, transparent, var(--accent-secondary), var(--accent-primary), transparent)",
            backgroundSize: "200% 100%",
            opacity: 0.5,
          }}
          animate={{
            backgroundPosition: ["200% 0", "-200% 0"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <div className="absolute inset-[1px] rounded-lg bg-glass" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6">
        {children}
      </div>
    </motion.div>
  );
});

BentoCard.displayName = "BentoCard";

