"use client";

import React, { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "../utils/cn";

export function MovingBorder({
  children,
  duration = 2000,
  rx,
  ry,
  className,
  ...otherProps
}: {
  children: ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg p-[1px]",
        className
      )}
      style={{
        borderRadius: rx || ry ? `${rx || ry}px` : "8px",
      }}
      {...otherProps}
    >
      {/* Animated gradient border */}
      <motion.div
        className="absolute inset-0 rounded-lg"
        style={{
          background: "conic-gradient(from 0deg, transparent, #6366F1, #A855F7, #EC4899, transparent)",
          backgroundSize: "200% 200%",
        }}
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: duration / 1000,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Inner content with background */}
      <div 
        className="relative z-10 h-full w-full rounded-lg bg-glass border border-border-subtle"
        style={{
          borderRadius: rx || ry ? `${rx || ry}px` : "8px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

