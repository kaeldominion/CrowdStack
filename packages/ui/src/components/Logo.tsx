"use client";

import { motion } from "framer-motion";

interface LogoProps {
  variant?: "full" | "icon" | "wordmark" | "tricolor";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  animated?: boolean;
  loading?: boolean;
  /** Show only the icon (for tricolor variant) */
  iconOnly?: boolean;
}

export function Logo({ 
  variant = "full", 
  size = "md", 
  className = "", 
  animated = true,
  loading = false,
  iconOnly = false,
}: LogoProps) {
  const sizeClasses = {
    xs: "h-4",
    sm: "h-6",
    md: "h-8",
    lg: "h-12",
    xl: "h-16",
  };

  const iconSize = sizeClasses[size];
  
  // Numerical sizes for calculations
  const numericSizes = {
    xs: 16,
    sm: 24,
    md: 32,
    lg: 48,
    xl: 64,
  };
  const numSize = numericSizes[size];

  // 3-chevron logo icon (matches favicon/brand)
  const ChevronIcon = () => {
    // Animation variants for each chevron layer
    const layerVariants = {
      hidden: {
        opacity: 0,
        pathLength: 0,
      },
      visible: {
        opacity: 1,
        pathLength: 1,
        transition: {
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1]
        }
      }
    };

    // Loading animation
    const loadingVariants = {
      initial: { opacity: 0.3 },
      animate: {
        opacity: [0.3, 1, 0.3],
        transition: {
          duration: 1.5,
          ease: "easeInOut",
          repeat: Infinity,
        }
      }
    };

    const svgContent = (
      <svg
        viewBox="0 0 24 24"
        className={iconSize}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
        </defs>
        {/* Top layer (white/current color) */}
        {loading ? (
          <motion.path
            d="M12 2L2 7L12 12L22 7L12 2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial="initial"
            animate="animate"
            variants={loadingVariants}
          />
        ) : animated ? (
          <motion.path
            d="M12 2L2 7L12 12L22 7L12 2Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial="hidden"
            animate="visible"
            variants={layerVariants}
          />
        ) : (
          <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* Middle layer (purple) */}
        {loading ? (
          <motion.path
            d="M2 12L12 17L22 12"
            stroke="url(#purpleGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial="initial"
            animate="animate"
            variants={{ ...loadingVariants, animate: { ...loadingVariants.animate, transition: { ...loadingVariants.animate.transition, delay: 0.15 } } }}
          />
        ) : animated ? (
          <motion.path
            d="M2 12L12 17L22 12"
            stroke="url(#purpleGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial="hidden"
            animate="visible"
            variants={{ ...layerVariants, visible: { ...layerVariants.visible, transition: { ...layerVariants.visible.transition, delay: 0.15 } } }}
          />
        ) : (
          <path d="M2 12L12 17L22 12" stroke="url(#purpleGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        )}
        {/* Bottom layer (blue) */}
        {loading ? (
          <motion.path
            d="M2 17L12 22L22 17"
            stroke="url(#blueGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial="initial"
            animate="animate"
            variants={{ ...loadingVariants, animate: { ...loadingVariants.animate, transition: { ...loadingVariants.animate.transition, delay: 0.3 } } }}
          />
        ) : animated ? (
          <motion.path
            d="M2 17L12 22L22 17"
            stroke="url(#blueGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial="hidden"
            animate="visible"
            variants={{ ...layerVariants, visible: { ...layerVariants.visible, transition: { ...layerVariants.visible.transition, delay: 0.3 } } }}
          />
        ) : (
          <path d="M2 17L12 22L22 17" stroke="url(#blueGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        )}
      </svg>
    );

    if (animated || loading) {
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

  // Tricolor logo variant - uses PNG image, theme-aware
  if (variant === "tricolor") {
    const tricolorSizes = {
      xs: { icon: "h-5 w-5", text: "text-[10px]" },
      sm: { icon: "h-6 w-6", text: "text-xs" },
      md: { icon: "h-7 w-7", text: "text-xs" },
      lg: { icon: "h-10 w-10", text: "text-sm" },
      xl: { icon: "h-14 w-14", text: "text-base" },
    };
    const triSize = tricolorSizes[size];
    
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {/* Light mode: inverted tricolor icon, Dark mode: tricolor icon */}
        <img 
          src="/logos/crowdstack-icon-tricolor-inverted-on-transparent.png" 
          alt="CrowdStack" 
          className={`${triSize.icon} object-contain dark:hidden`}
        />
        <img 
          src="/crowdstack-logo-tricolor-on-transparent.png" 
          alt="CrowdStack" 
          className={`${triSize.icon} object-contain hidden dark:block`}
        />
        {!iconOnly && (
          <span className={`font-black tracking-tighter ${triSize.text} text-primary`}>
            CROWDSTACK<span className="text-accent-primary">.</span>
          </span>
        )}
      </div>
    );
  }

  if (variant === "icon") {
    return <div className={`inline-flex items-center ${className}`}>{ChevronIcon()}</div>;
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
      <ChevronIcon />
      <Wordmark />
    </div>
  );
}
