"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate blur based on scroll - more gradual
  const blurAmount = Math.min(scrollProgress * 15, 12); // Max 12px blur
  const flierOpacity = Math.max(1 - scrollProgress * 0.4, 0.6); // Fade to 60% opacity - keep visible

  // Scroll handler
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
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
  }, [hasScrolled]);

  // Register scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

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
        scrollBehavior: "smooth",
        // CSS scroll snap for card-by-card scrolling
        scrollSnapType: "y proximity",
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
        {/* Spacer for initial flier view - full viewport height with snap point */}
        <div 
          className="h-screen flex flex-col items-center justify-end pb-24"
          style={{ scrollSnapAlign: "start" }}
        >
          {/* Scroll hint */}
          {!hasScrolled && (
            <div className="flex flex-col items-center animate-bounce-subtle">
              <div className="px-4 py-2 bg-black/50 backdrop-blur-md text-white text-sm rounded-full flex items-center gap-2 border border-white/10">
                <span>👇 Scroll to see details</span>
              </div>
              <ChevronDown className="h-5 w-5 text-white/50 mt-1" />
            </div>
          )}
        </div>

        {/* Floating Cards Container - no solid background, cards float over flier */}
        <div className="relative px-4 pb-32 space-y-4">
          {/* Pass children through with transparent wrapper */}
          <div 
            className="scroll-snap-cards"
            style={{
              // Ensure content has no solid background
              background: "transparent",
            }}
          >
            {children}
          </div>
        </div>
      </div>

      {/* Global styles for scroll snap on child cards */}
      <style jsx global>{`
        .scroll-snap-cards > * > * > * > div {
          scroll-snap-align: start;
          scroll-margin-top: 1rem;
        }
        
        /* Make Section component transparent in scroll mode */
        .scroll-snap-cards section {
          background: transparent !important;
        }
        
        /* Target the container divs to be transparent */
        .scroll-snap-cards > * {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}

// Re-export the hook from MobileFlierExperience for consistency
export { useFlierToggle } from "./MobileFlierExperience";
