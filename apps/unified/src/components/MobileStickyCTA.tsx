"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Image as ImageIcon, FileText, Share2 } from "lucide-react";
import { useFlierToggle } from "./MobileFlierExperience";

interface MobileStickyCTAProps {
  href: string;
  label: string;
  eventName: string;
  shareUrl?: string;
  shareTitle?: string;
  shareText?: string;
}

export function MobileStickyCTA({ 
  href, 
  label, 
  eventName,
  shareUrl,
  shareTitle,
  shareText,
}: MobileStickyCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const flierState = useFlierToggle();

  // Check if we have a flier toggle (event has a flier)
  const hasFlierToggle = flierState.showFlier !== null && flierState.onToggle !== null;

  useEffect(() => {
    // Only show on mobile devices
    const checkMobile = () => {
      const isMobile = window.innerWidth < 1024; // lg breakpoint
      setIsVisible(isMobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleShare = async () => {
    if (!shareUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle || eventName,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled or error occurred
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareUrl);
      alert("Link copied to clipboard!");
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden">
      <div className="flex items-center gap-2">
        {/* Share Button */}
        {shareUrl && (
          <button
            onClick={handleShare}
            className="flex items-center justify-center h-12 w-12 rounded-full 
                       bg-black/70 backdrop-blur-md
                       text-white
                       shadow-lg shadow-black/30
                       border border-white/20
                       hover:bg-black/80 hover:scale-105 
                       active:scale-95
                       transition-all duration-200"
            aria-label="Share event"
            title="Share"
          >
            <Share2 className="h-5 w-5" />
          </button>
        )}

        {/* Flier Toggle Button - Only show when event has a flier */}
        {hasFlierToggle && (
          <button
            onClick={flierState.onToggle!}
            className="flex items-center justify-center h-12 w-12 rounded-full 
                       bg-black/70 backdrop-blur-md
                       text-white
                       shadow-lg shadow-black/30
                       border border-white/20
                       hover:bg-black/80 hover:scale-105 
                       active:scale-95
                       transition-all duration-200"
            aria-label={flierState.showFlier ? "View event details" : "View flier"}
            title={flierState.showFlier ? "View details" : "View flier"}
          >
            {flierState.showFlier ? (
              <FileText className="h-5 w-5" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )}
          </button>
        )}

        {/* Register Now Button */}
        <Link 
          href={href} 
          className="flex items-center gap-2 px-5 py-3 rounded-full 
                     bg-gradient-to-r from-indigo-600 to-purple-600 
                     text-white font-semibold text-base
                     shadow-lg shadow-indigo-500/40
                     border border-white/20
                     backdrop-blur-sm
                     hover:shadow-xl hover:shadow-indigo-500/50 
                     hover:scale-105 
                     active:scale-95
                     transition-all duration-200"
        >
          {label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
