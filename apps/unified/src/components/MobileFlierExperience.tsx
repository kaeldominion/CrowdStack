"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@crowdstack/ui";
import { FlipHorizontal, X } from "lucide-react";

interface MobileFlierExperienceProps {
  flierUrl: string;
  eventName: string;
  children: React.ReactNode; // The event page content
}

export function MobileFlierExperience({
  flierUrl,
  eventName,
  children,
}: MobileFlierExperienceProps) {
  const [showFlier, setShowFlier] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Auto-flip after 3 seconds if user hasn't interacted
  useEffect(() => {
    if (!hasInteracted && showFlier) {
      const timer = setTimeout(() => {
        handleFlip();
        setHasInteracted(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasInteracted, showFlier]);

  const handleFlip = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setShowFlier(!showFlier);
      setIsAnimating(false);
    }, 300); // Half of animation duration
  };

  return (
    <div className="lg:hidden relative min-h-screen">
      {/* Flip Container */}
      <div className="relative w-full h-screen perspective-1000">
        <div
          className={`relative w-full h-full transition-transform duration-600 preserve-3d ${
            showFlier ? "" : "rotate-y-180"
          }`}
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Flier Side - Front */}
          <div
            className="absolute inset-0 w-full h-full backface-hidden"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
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

              {/* Flip Button - Sticky at bottom */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center z-10 px-4">
                <button
                  onClick={handleFlip}
                  className="flex items-center gap-2 px-6 py-3 bg-black/70 backdrop-blur-md text-white rounded-full font-medium hover:bg-black/80 transition-all shadow-lg"
                >
                  <FlipHorizontal className="h-5 w-5" />
                  View Details
                </button>
              </div>

              {/* Swipe hint on first view */}
              {!hasInteracted && (
                <div className="absolute top-6 left-0 right-0 flex justify-center z-10 animate-fade-in">
                  <div className="px-4 py-2 bg-black/50 backdrop-blur-sm text-white text-sm rounded-full">
                    👆 Tap to see event details
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Event Details Side - Back */}
          <div
            className="absolute inset-0 w-full h-full backface-hidden rotate-y-180"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            <div className="w-full h-full overflow-y-auto bg-background">
              {children}

              {/* Flip Back Button - Sticky */}
              <div className="sticky bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent border-t border-border z-50">
                <button
                  onClick={handleFlip}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-all shadow-lg"
                >
                  <FlipHorizontal className="h-5 w-5" />
                  View Flier
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

