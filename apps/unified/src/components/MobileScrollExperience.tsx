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
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate blur and opacity based on scroll
  const blurAmount = Math.min(scrollProgress * 20, 20); // Max 20px blur
  const flierOpacity = Math.max(1 - scrollProgress * 0.7, 0.3); // Fade to 30% opacity
  const contentOpacity = Math.min(scrollProgress * 2, 1); // Content fades in

  // Scroll handler
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const viewportHeight = window.innerHeight;
    
    // Progress from 0 to 1 over the first viewport height of scroll
    const progress = Math.min(scrollTop / (viewportHeight * 0.5), 1);
    setScrollProgress(progress);
    
    if (scrollTop > 50 && !hasScrolled) {
      setHasScrolled(true);
    }

    // Update global state for the sticky CTA button
    const showingFlier = progress < 0.3;
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
      top: viewportHeight * 0.7,
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
      if (scrollProgress < 0.3) {
        scrollToContent();
      } else {
        scrollToFlier();
      }
    };
    globalFlierState = { showFlier: scrollProgress < 0.3, onToggle: toggleFn };
    notifyListeners();
    
    return () => {
      globalFlierState = { showFlier: true, onToggle: null };
      notifyListeners();
    };
  }, [scrollProgress, scrollToContent, scrollToFlier]);

  return (
    <div 
      ref={containerRef}
      className="lg:hidden fixed inset-0 z-10 overflow-y-auto overflow-x-hidden scroll-smooth"
      style={{ 
        top: 0,
        scrollbarWidth: "none",
        msOverflowStyle: "none"
      }}
    >
      {/* Hide scrollbar for webkit */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Fixed Flier Background - dims and blurs on scroll */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          filter: `blur(${blurAmount}px)`,
          opacity: flierOpacity,
          transform: `scale(${1 + scrollProgress * 0.1})`, // Subtle zoom on scroll
          transition: "filter 0.1s ease-out, opacity 0.1s ease-out, transform 0.1s ease-out"
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
        {/* Gradient overlay that intensifies on scroll */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black"
          style={{
            opacity: 0.3 + scrollProgress * 0.5
          }}
        />
      </div>

      {/* Scroll Content Container */}
      <div className="relative z-10">
        {/* Spacer for initial flier view - full viewport height */}
        <div className="h-screen flex flex-col items-center justify-end pb-32">
          {/* Scroll hint */}
          {!hasScrolled && (
            <div className="flex flex-col items-center animate-bounce-subtle">
              <div className="px-4 py-2 bg-black/60 backdrop-blur-sm text-white text-sm rounded-full flex items-center gap-2">
                <span>👇 Scroll to see details</span>
              </div>
              <ChevronDown className="h-5 w-5 text-white/60 mt-1" />
            </div>
          )}
        </div>

        {/* Event Content - fades in as user scrolls */}
        <div 
          ref={contentRef}
          className="relative min-h-screen"
          style={{
            opacity: contentOpacity,
            transform: `translateY(${(1 - contentOpacity) * 20}px)`,
            transition: "opacity 0.1s ease-out, transform 0.1s ease-out"
          }}
        >
          {/* Content background with stronger blur */}
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xl -z-10" />
          
          {/* Actual content */}
          <div className="pt-4 pb-32">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export the hook from MobileFlierExperience for consistency
export { useFlierToggle } from "./MobileFlierExperience";

