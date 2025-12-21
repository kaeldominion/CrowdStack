"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronUp } from "lucide-react";

interface MobileScrollExperienceProps {
  flierUrl: string;
  eventName: string;
  children: React.ReactNode; // The event page content
}

// Global state for cross-component communication (shared with flip version)
let globalFlierState: {
  showFlier: boolean;
  onToggle: (() => void) | null;
} = { showFlier: true, onToggle: null };

let listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export function MobileScrollExperience({
  flierUrl,
  eventName,
  children,
}: MobileScrollExperienceProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [cardAnimations, setCardAnimations] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  // Show hint after 2 second delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasScrolled) {
        setShowHint(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [hasScrolled]);

  // Calculate blur based on scroll - more gradual
  const blurAmount = Math.min(scrollProgress * 15, 12); // Max 12px blur
  const flierOpacity = Math.max(1 - scrollProgress * 0.4, 0.6); // Fade to 60% opacity - keep visible

  // Scroll handler with staggered card animations
  const handleScroll = useCallback(() => {
    if (!containerRef.current || !cardsContainerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const viewportHeight = window.innerHeight;
    
    // Progress from 0 to 1 over the first viewport height of scroll
    const progress = Math.min(scrollTop / (viewportHeight * 0.8), 1);
    setScrollProgress(progress);
    
    if (scrollTop > 50 && !hasScrolled) {
      setHasScrolled(true);
    }

    // Update global state for the sticky CTA button
    const showingFlier = progress < 0.2;
    if (globalFlierState.showFlier !== showingFlier) {
      globalFlierState.showFlier = showingFlier;
      notifyListeners();
    }

    // Calculate individual card animations based on scroll position
    const cards = cardsContainerRef.current.querySelectorAll('[data-scroll-card]');
    const newAnimations: number[] = [];
    const totalCards = cards.length;
    
    cards.forEach((card, index) => {
      const cardElement = card as HTMLElement;
      const cardRect = cardElement.getBoundingClientRect();
      const containerRect = containerRef.current!.getBoundingClientRect();
      
      // Calculate how far into the viewport the card is
      const cardTop = cardRect.top - containerRect.top;
      const triggerPoint = viewportHeight * 0.9; // Start animating when card is 90% down the viewport
      
      // Apply stagger delay: each card starts animating slightly later, but completes at same rate
      // Reduce stagger effect for later cards so they can complete
      const staggerDelay = index * 40; // 40px stagger per card
      const adjustedCardTop = cardTop + staggerDelay;
      
      // Faster completion for later cards (they have less scroll distance available)
      const completionSpeed = 1 + (index / totalCards) * 0.5; // Later cards complete faster
      
      const cardProgress = Math.min(
        Math.max((triggerPoint - adjustedCardTop) / (viewportHeight * 0.35 / completionSpeed), 0),
        1
      );
      
      // Apply easing for smooth acceleration
      const easedProgress = cardProgress < 0.5
        ? 2 * cardProgress * cardProgress
        : 1 - Math.pow(-2 * cardProgress + 2, 2) / 2;
      
      newAnimations[index] = easedProgress;
    });
    
    setCardAnimations(newAnimations);
  }, [hasScrolled]);

  // Mark cards for animation on mount and when content changes
  useEffect(() => {
    if (!cardsContainerRef.current) return;
    
    // Find all card-like elements (those with rounded corners and glassmorphism styles)
    const cards = cardsContainerRef.current.querySelectorAll(
      '.bg-black\\/40, .bg-emerald-500\\/20, [class*="backdrop-blur"]'
    );
    
    cards.forEach((card, index) => {
      (card as HTMLElement).setAttribute('data-scroll-card', '');
      (card as HTMLElement).setAttribute('data-card-index', index.toString());
    });
    
    // Trigger initial scroll calculation
    handleScroll();
  }, [children, handleScroll]);

  // Register scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Apply animations to cards
  useEffect(() => {
    if (!cardsContainerRef.current) return;
    
    const cards = cardsContainerRef.current.querySelectorAll('[data-scroll-card]');
    cards.forEach((card, index) => {
      const cardElement = card as HTMLElement;
      const progress = cardAnimations[index] ?? 0;
      
      // Animate from below with scale
      const translateY = (1 - progress) * 80; // Start 80px below
      const scale = 0.92 + progress * 0.08; // Scale from 0.92 to 1
      const opacity = progress;
      
      cardElement.style.transform = `translateY(${translateY}px) scale(${scale})`;
      cardElement.style.opacity = opacity.toString();
      cardElement.style.transition = 'transform 0.1s ease-out, opacity 0.1s ease-out';
    });
  }, [cardAnimations]);

  // Scroll to content function for the toggle button
  const scrollToContent = useCallback(() => {
    if (!containerRef.current) return;
    const viewportHeight = window.innerHeight;
    containerRef.current.scrollTo({
      top: viewportHeight * 0.85,
      behavior: "smooth"
    });
  }, []);

  // Scroll to top (flier) function
  const scrollToFlier = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, []);

  // Register the toggle function globally on mount
  useEffect(() => {
    const toggleFn = () => {
      if (scrollProgress < 0.2) {
        scrollToContent();
      } else {
        scrollToFlier();
      }
    };
    globalFlierState = { showFlier: scrollProgress < 0.2, onToggle: toggleFn };
    notifyListeners();
    
    return () => {
      globalFlierState = { showFlier: true, onToggle: null };
      notifyListeners();
    };
  }, [scrollProgress, scrollToContent, scrollToFlier]);

  return (
    <div 
      ref={containerRef}
      className="lg:hidden fixed inset-0 z-10 overflow-y-auto overflow-x-hidden"
      style={{ 
        top: 0,
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      {/* Hide scrollbar for webkit */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Fixed Flier Background - dims and blurs on scroll but stays visible */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          filter: `blur(${blurAmount}px)`,
          opacity: flierOpacity,
          transform: `scale(${1 + scrollProgress * 0.15})`, // Parallax zoom on scroll
          transition: "filter 0.15s ease-out, opacity 0.15s ease-out, transform 0.15s ease-out"
        }}
      >
        <Image
          src={flierUrl}
          alt={`${eventName} flier`}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Subtle gradient overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60"
          style={{
            opacity: 0.5 + scrollProgress * 0.3
          }}
        />
      </div>

      {/* Scroll Content Container */}
      <div className="relative z-10">
        {/* Spacer for initial flier view - slightly less than full height so cards peek */}
        <div className="h-[75vh] flex flex-col items-center justify-end pb-12">
          {/* Scroll hint - minimal animated chevrons, appears after delay */}
          {!hasScrolled && showHint && (
            <div 
              className="flex flex-col items-center animate-fade-in"
              style={{
                animation: "fadeIn 0.5s ease-out"
              }}
            >
              {/* Animated chevrons floating upward */}
              <div className="relative flex flex-col items-center">
                {/* Glow effect behind */}
                <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full scale-[3]" />
                
                {/* Stacked chevrons with staggered animation */}
                <div className="relative flex flex-col items-center -space-y-3">
                  <ChevronUp 
                    className="h-6 w-6 text-white/40 animate-pulse" 
                    style={{ animationDelay: "0.4s", animationDuration: "1.5s" }}
                  />
                  <ChevronUp 
                    className="h-7 w-7 text-white/60 animate-pulse" 
                    style={{ animationDelay: "0.2s", animationDuration: "1.5s" }}
                  />
                  <ChevronUp 
                    className="h-8 w-8 text-white/90 animate-pulse drop-shadow-lg" 
                    style={{ animationDelay: "0s", animationDuration: "1.5s" }}
                  />
                </div>
              </div>
              
              {/* Small line indicator */}
              <div className="mt-6 w-8 h-0.5 bg-white/30 rounded-full" />
            </div>
          )}
        </div>

        {/* Floating Cards Container with staggered reveal */}
        <div 
          ref={cardsContainerRef}
          className="relative px-4 pb-48"
        >
          <div 
            className="scroll-cards-wrapper space-y-4"
            style={{ background: "transparent" }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* Global styles for transparent backgrounds and animations */}
      <style jsx global>{`
        /* Fade in animation for hint */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Floating animation for chevrons */
        @keyframes floatUp {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        
        .animate-float-up {
          animation: floatUp 2s ease-in-out infinite;
        }
        
        /* Make Section component transparent in scroll mode */
        .scroll-cards-wrapper section {
          background: transparent !important;
        }
        
        /* Target the container divs to be transparent */
        .scroll-cards-wrapper > * {
          background: transparent !important;
        }
        
        /* Initial state for cards before JS takes over */
        .scroll-cards-wrapper [data-scroll-card] {
          will-change: transform, opacity;
        }
      `}</style>
    </div>
  );
}

// Re-export the hook from MobileFlierExperience for consistency
export { useFlierToggle } from "./MobileFlierExperience";
