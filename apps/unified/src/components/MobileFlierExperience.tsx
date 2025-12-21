"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

interface MobileFlierExperienceProps {
  flierUrl: string;
  eventName: string;
  children: React.ReactNode; // The event page content
}

// Global state for cross-component communication
let globalFlierState: {
  showFlier: boolean;
  onToggle: (() => void) | null;
} = { showFlier: true, onToggle: null };

let listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach(listener => listener());
}

export function MobileFlierExperience({
  flierUrl,
  eventName,
  children,
}: MobileFlierExperienceProps) {
  const [showFlier, setShowFlier] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [flipDirection, setFlipDirection] = useState<"left" | "right">("right");
  const [isFlipping, setIsFlipping] = useState(false);
  
  // Touch tracking for swipe
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle flip with direction
  const handleFlip = useCallback((direction: "left" | "right" = "right") => {
    if (isFlipping) return;
    
    setFlipDirection(direction);
    setIsFlipping(true);
    setHasInteracted(true);
    
    // Start the flip animation, change state at midpoint
    setTimeout(() => {
      setShowFlier(prev => {
        const newValue = !prev;
        globalFlierState.showFlier = newValue;
        notifyListeners();
        return newValue;
      });
    }, 150); // Change at midpoint of animation
    
    setTimeout(() => {
      setIsFlipping(false);
    }, 300); // Total animation duration
  }, [isFlipping]);

  // Register the toggle function globally on mount
  useEffect(() => {
    const toggleFn = () => handleFlip("right");
    globalFlierState = { showFlier, onToggle: toggleFn };
    notifyListeners();
    
    return () => {
      globalFlierState = { showFlier: true, onToggle: null };
      notifyListeners();
    };
  }, [handleFlip, showFlier]);

  // Auto-flip after 3 seconds if user hasn't interacted
  useEffect(() => {
    if (!hasInteracted && showFlier) {
      const timer = setTimeout(() => {
        handleFlip("right");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasInteracted, showFlier, handleFlip]);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    
    // Only trigger swipe if horizontal movement is greater than vertical
    // and exceeds threshold
    const swipeThreshold = 50;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
      if (deltaX > 0) {
        // Swipe right
        handleFlip("right");
      } else {
        // Swipe left
        handleFlip("left");
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  }, [handleFlip]);

  // Get flip animation class
  const getFlipClass = () => {
    if (!isFlipping) return "";
    return flipDirection === "right" ? "animate-flip-right" : "animate-flip-left";
  };

  return (
    // Use fixed positioning for true full-screen - background is now at page level
    <div 
      ref={containerRef}
      className="lg:hidden fixed inset-0 z-10" 
      style={{ top: 0, perspective: "1000px" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Flip Container - full viewport height with 3D transform */}
      <div 
        className={`relative w-full h-full transition-transform duration-300 ease-out ${getFlipClass()}`}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Flier View - Front of card */}
        <div
          className={`absolute inset-0 w-full h-full ${
            showFlier ? "z-10" : "z-0 pointer-events-none"
          }`}
          style={{ 
            backfaceVisibility: "hidden",
            opacity: showFlier ? 1 : 0,
            transition: "opacity 0.15s ease-out"
          }}
        >
          <div className="relative w-full h-full bg-black/90 flex items-center justify-center overflow-hidden">
            {/* Zoom-in animation on first load */}
            <div
              className={`relative w-full h-full flex items-center justify-center ${
                !hasInteracted ? "animate-zoom-in" : ""
              }`}
            >
              <Image
                src={flierUrl}
                alt={`${eventName} flier`}
                fill
                className="object-contain"
                priority
                sizes="100vw"
              />
            </div>

            {/* Hint pointing to bottom flip button */}
            {!hasInteracted && (
              <div className="absolute bottom-28 left-0 right-0 flex flex-col items-center z-10 animate-bounce-subtle">
                <div className="px-4 py-2 bg-black/60 backdrop-blur-sm text-white text-sm rounded-full flex items-center gap-2">
                  <span>👇 Swipe or tap below to see details</span>
                </div>
                <ChevronDown className="h-5 w-5 text-white/60 mt-1" />
              </div>
            )}

            {/* Tap anywhere to flip */}
            <button
              onClick={() => handleFlip("right")}
              className="absolute inset-0 w-full h-full z-20 cursor-pointer"
              aria-label="View event details"
            />
          </div>
        </div>

        {/* Event Details View - Back of card */}
        <div
          className={`absolute inset-0 w-full h-full ${
            !showFlier ? "z-10" : "z-0 pointer-events-none"
          }`}
          style={{ 
            backfaceVisibility: "hidden",
            opacity: !showFlier ? 1 : 0,
            transition: "opacity 0.15s ease-out"
          }}
        >
          <div className="w-full h-full overflow-y-auto bg-background/80 backdrop-blur-md pt-20">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for nav bar to listen to flier state
export function useFlierToggle() {
  const [flierState, setFlierState] = useState<{
    showFlier: boolean | null;
    onToggle: (() => void) | null;
  }>(() => ({
    showFlier: globalFlierState.onToggle ? globalFlierState.showFlier : null,
    onToggle: globalFlierState.onToggle
  }));

  useEffect(() => {
    const updateState = () => {
      setFlierState({
        showFlier: globalFlierState.onToggle ? globalFlierState.showFlier : null,
        onToggle: globalFlierState.onToggle
      });
    };

    listeners.add(updateState);
    // Initial sync
    updateState();

    return () => {
      listeners.delete(updateState);
    };
  }, []);

  return flierState;
}
