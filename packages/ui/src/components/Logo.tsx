"use client";

import { motion } from "framer-motion";

interface LogoProps {
  variant?: "full" | "icon" | "wordmark";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  animated?: boolean;
  loading?: boolean;
}

export function Logo({ 
  variant = "full", 
  size = "md", 
  className = "", 
  animated = true,
  loading = false 
}: LogoProps) {
  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12",
    xl: "h-16",
  };

  const iconSize = sizeClasses[size];
  
  // Numerical sizes for calculations
  const numericSizes = {
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64,
  };
  const numSize = numericSizes[size];

  const StackIcon = () => {
    // Animation variants for each stack line - appears from bottom to top
    const lineVariants = {
      hidden: { 
        opacity: 0, 
        scaleX: 0,
        transformOrigin: "center"
      },
      visible: { 
        opacity: 1, 
        scaleX: 1,
        transition: {
          duration: 0.4,
          ease: [0.4, 0, 0.2, 1]
        }
      }
    };

    // Loading animation - continuous stacking effect
    const loadingLineVariants = {
      initial: { 
        opacity: 0.3, 
        scaleX: 0.8,
        transformOrigin: "center"
      },
      animate: { 
        opacity: [0.3, 1, 0.3],
        scaleX: [0.8, 1, 0.8],
        transition: {
          duration: 1.5,
          ease: "easeInOut",
          repeat: Infinity,
        }
      }
    };

    // Orbital element animation
    const orbitVariants = {
      initial: { rotate: 0 },
      animate: { 
        rotate: 360,
        transition: {
          duration: 3,
          ease: "linear",
          repeat: Infinity,
        }
      }
    };

    const svgContent = (
      <svg
        viewBox="0 0 32 32"
        className={iconSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stack layers - bottom to top (4 bars) */}
        {/* Bottom layer (widest) */}
        {loading ? (
          <motion.rect
            x="4"
            y="20"
            width="24"
            height="3"
            rx="1"
            fill="currentColor"
            initial="initial"
            animate="animate"
            variants={{
              ...loadingLineVariants,
              animate: {
                ...loadingLineVariants.animate,
                transition: {
                  ...loadingLineVariants.animate.transition,
                  delay: 0,
                }
              }
            }}
            style={{ opacity: 0.4 }}
          />
        ) : animated ? (
          <motion.rect
            x="4"
            y="20"
            width="24"
            height="3"
            rx="1"
            fill="currentColor"
            initial="hidden"
            animate="visible"
            variants={lineVariants}
            style={{ opacity: 0.4 }}
          />
        ) : (
          <rect x="4" y="20" width="24" height="3" rx="1" fill="currentColor" opacity="0.4" />
        )}
        
        {/* Third layer */}
        {loading ? (
          <motion.rect
            x="6"
            y="14"
            width="20"
            height="3"
            rx="1"
            fill="currentColor"
            initial="initial"
            animate="animate"
            variants={{
              ...loadingLineVariants,
              animate: {
                ...loadingLineVariants.animate,
                transition: {
                  ...loadingLineVariants.animate.transition,
                  delay: 0.15,
                }
              }
            }}
            style={{ opacity: 0.6 }}
          />
        ) : animated ? (
          <motion.rect
            x="6"
            y="14"
            width="20"
            height="3"
            rx="1"
            fill="currentColor"
            initial="hidden"
            animate="visible"
            variants={{
              ...lineVariants,
              visible: {
                ...lineVariants.visible,
                transition: {
                  ...lineVariants.visible.transition,
                  delay: 0.15
                }
              }
            }}
            style={{ opacity: 0.6 }}
          />
        ) : (
          <rect x="6" y="14" width="20" height="3" rx="1" fill="currentColor" opacity="0.6" />
        )}
        
        {/* Second layer */}
        {loading ? (
          <motion.rect
            x="8"
            y="8"
            width="16"
            height="3"
            rx="1"
            fill="currentColor"
            initial="initial"
            animate="animate"
            variants={{
              ...loadingLineVariants,
              animate: {
                ...loadingLineVariants.animate,
                transition: {
                  ...loadingLineVariants.animate.transition,
                  delay: 0.3,
                }
              }
            }}
            style={{ opacity: 0.8 }}
          />
        ) : animated ? (
          <motion.rect
            x="8"
            y="8"
            width="16"
            height="3"
            rx="1"
            fill="currentColor"
            initial="hidden"
            animate="visible"
            variants={{
              ...lineVariants,
              visible: {
                ...lineVariants.visible,
                transition: {
                  ...lineVariants.visible.transition,
                  delay: 0.3
                }
              }
            }}
            style={{ opacity: 0.8 }}
          />
        ) : (
          <rect x="8" y="8" width="16" height="3" rx="1" fill="currentColor" opacity="0.8" />
        )}
        
        {/* Top layer - primary accent color */}
        {loading ? (
          <motion.rect
            x="10"
            y="2"
            width="12"
            height="3"
            rx="1"
            fill="#3B82F6"
            initial="initial"
            animate="animate"
            variants={{
              ...loadingLineVariants,
              animate: {
                ...loadingLineVariants.animate,
                transition: {
                  ...loadingLineVariants.animate.transition,
                  delay: 0.45,
                }
              }
            }}
          />
        ) : animated ? (
          <motion.rect
            x="10"
            y="2"
            width="12"
            height="3"
            rx="1"
            fill="#3B82F6"
            initial="hidden"
            animate="visible"
            variants={{
              ...lineVariants,
              visible: {
                ...lineVariants.visible,
                transition: {
                  ...lineVariants.visible.transition,
                  delay: 0.45
                }
              }
            }}
          />
        ) : (
          <rect x="10" y="2" width="12" height="3" rx="1" fill="#3B82F6" />
        )}
      </svg>
    );

    // Wrap with orbital element for loading state
    if (loading) {
      return (
        <div className="relative">
          {/* Main logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {svgContent}
          </motion.div>
          
          {/* Orbital square */}
          <motion.div
            className="absolute inset-0"
            initial="initial"
            animate="animate"
            variants={orbitVariants}
            style={{ 
              width: numSize, 
              height: numSize,
            }}
          >
            <motion.div
              className="absolute"
              style={{
                width: 4,
                height: 4,
                top: -2,
                left: '50%',
                marginLeft: -2,
                backgroundColor: '#3B82F6',
                borderRadius: 1,
              }}
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          
          {/* Secondary orbital */}
          <motion.div
            className="absolute inset-0"
            initial="initial"
            animate="animate"
            variants={{
              ...orbitVariants,
              animate: {
                rotate: -360,
                transition: {
                  duration: 4,
                  ease: "linear",
                  repeat: Infinity,
                }
              }
            }}
            style={{ 
              width: numSize, 
              height: numSize,
            }}
          >
            <motion.div
              className="absolute"
              style={{
                width: 3,
                height: 3,
                bottom: -2,
                left: '50%',
                marginLeft: -1.5,
                backgroundColor: '#3B82F6',
                borderRadius: '50%',
                opacity: 0.5,
              }}
            />
          </motion.div>
        </div>
      );
    }

    if (animated) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {svgContent}
        </motion.div>
      );
    }

    return svgContent;
  };

  const Wordmark = () => {
    if (loading) {
      return (
        <motion.span 
          className="font-semibold tracking-tight"
          style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <span className="text-[#3B82F6]">Crowd</span>
          <span>Stack</span>
        </motion.span>
      );
    }
    
    return (
      <span className="font-semibold tracking-tight" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
        <span className="text-[#3B82F6]">Crowd</span>
        <span>Stack</span>
      </span>
    );
  };

  if (variant === "icon") {
    return <div className={`inline-flex items-center ${className}`}>{StackIcon()}</div>;
  }

  if (variant === "wordmark") {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <Wordmark />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <StackIcon />
      <Wordmark />
    </div>
  );
}
