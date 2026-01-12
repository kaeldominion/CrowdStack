"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { LoadingLogo } from "./LoadingLogo";

interface MobileScrollExperienceProps {
  flierUrl: string;
  videoUrl?: string;
  eventName: string;
  venueName?: string;
  venueCity?: string;
  startDate?: Date;
  children: React.ReactNode;
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

// Detect problematic in-app browsers
function isProblematicBrowser(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || "";
  return /Instagram|FBAN|FBAV|FB_IAB|TikTok|Snapchat|Twitter/i.test(ua);
}

export function MobileScrollExperience({
  flierUrl,
  videoUrl,
  eventName,
  venueName,
  venueCity,
  startDate,
  children,
}: MobileScrollExperienceProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    setIsInAppBrowser(isProblematicBrowser());
  }, []);
  
  const hasVideo = !!videoUrl && !videoFailed && !isInAppBrowser;

  // Fallback timeouts
  useEffect(() => {
    if (hasVideo && videoUrl && !videoFailed) {
      const videoTimeout = setTimeout(() => {
        if (!mediaLoaded) {
          console.warn("Video load timeout - falling back to image");
          setVideoFailed(true);
        }
      }, 2000);
      return () => clearTimeout(videoTimeout);
    }
    
    const timeout = setTimeout(() => {
      if (!mediaLoaded) {
        setMediaLoaded(true);
      }
    }, 3000);
    return () => clearTimeout(timeout);
  }, [mediaLoaded, hasVideo, videoUrl, videoFailed]);

  // iOS Safari video autoplay fix
  useEffect(() => {
    if (hasVideo && mediaLoaded && videoRef.current) {
      const playVideo = async () => {
        try {
          videoRef.current!.muted = true;
          videoRef.current!.playsInline = true;
          await videoRef.current!.play();
        } catch (err) {
          console.warn("Video autoplay failed:", err);
          setVideoFailed(true);
        }
      };
      playVideo();
    }
  }, [hasVideo, mediaLoaded]);

  // Calculate blur and opacity based on scroll
  const blurAmount = Math.min(scrollProgress * 20, 15);
  const flierOpacity = Math.max(1 - scrollProgress * 0.5, 0.5);
  const textOpacity = Math.max(1 - scrollProgress * 2, 0);

  // Scroll handler - just tracks progress for flier blur/fade
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const viewportHeight = window.innerHeight;
    
    const progress = Math.min(scrollTop / (viewportHeight * 0.7), 1);
    setScrollProgress(progress);
    
    if (scrollTop > 50 && !hasScrolled) {
      setHasScrolled(true);
    }

    const showingFlier = progress < 0.2;
    if (globalFlierState.showFlier !== showingFlier) {
      globalFlierState.showFlier = showingFlier;
      notifyListeners();
    }
  }, [hasScrolled]);

  // Scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToContent = useCallback(() => {
    if (!containerRef.current) return;
    const viewportHeight = window.innerHeight;
    containerRef.current.scrollTo({
      top: viewportHeight * 0.82,
      behavior: "smooth"
    });
  }, []);

  const scrollToFlier = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, []);

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
      className="lg:hidden fixed inset-0 z-10 overflow-y-auto overflow-x-hidden bg-void"
      style={{ 
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Loading state */}
      {!mediaLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void">
          <LoadingLogo message="Loading event..." size="lg" />
        </div>
      )}

      {/* Fixed Flier Background */}
      <div 
        className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-500 ${mediaLoaded ? "opacity-100" : "opacity-0"}`}
        style={{
          filter: `blur(${blurAmount}px)`,
          opacity: mediaLoaded ? flierOpacity : 0,
          transform: `scale(${1 + scrollProgress * 0.1})`,
          transition: "filter 0.15s ease-out, opacity 0.15s ease-out, transform 0.15s ease-out"
        }}
      >
        {hasVideo ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => setMediaLoaded(true)}
            onCanPlay={() => setMediaLoaded(true)}
            onError={() => setVideoFailed(true)}
            onStalled={() => {
              setTimeout(() => {
                if (!mediaLoaded) setVideoFailed(true);
              }, 1000);
            }}
          />
        ) : (
          <Image
            src={flierUrl}
            alt={`${eventName} flier`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
            onLoad={() => setMediaLoaded(true)}
            onError={() => setMediaLoaded(true)}
          />
        )}
        {/* Gradient overlay - darkens as you scroll */}
        <div 
          className="absolute inset-0 bg-gradient-to-b from-void/30 via-transparent to-void"
          style={{
            opacity: 0.6 + scrollProgress * 0.4
          }}
        />
      </div>

      {/* Scroll Content */}
      <div className="relative z-10">
        {/* Spacer with Event Info Overlay - taller to hide more content initially */}
        <div className="h-[85vh] flex flex-col justify-end pb-6 px-4">
          {/* Event Name Overlay - fades out on scroll */}
          <div 
            style={{
              opacity: textOpacity,
              transform: `translateY(${scrollProgress * -30}px)`,
              transition: "opacity 0.15s ease-out, transform 0.15s ease-out"
            }}
          >
            {/* Date Badge */}
            {startDate && (
              <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-accent-primary backdrop-blur-sm mb-4">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-void">
                  {startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}
                </span>
              </div>
            )}
            
            {/* Event Name - right padding forces wrap to two lines, feels left-aligned */}
            <h1 className="font-sans font-black uppercase tracking-tighter leading-[0.9] text-5xl sm:text-6xl text-primary drop-shadow-lg mb-3 pr-16 sm:pr-24">
              {eventName}
            </h1>
            
            {/* Venue */}
            {(venueName || venueCity) && (
              <div className="flex items-center gap-2 text-secondary">
                <MapPin className="h-4 w-4" />
                <span className="font-mono text-xs tracking-wide">
                  {venueName}{venueCity && `, ${venueCity}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content Container */}
        <div className="relative">
          {/* Dark overlay for pull-up content - 5% transparent (95% opaque) */}
          <div 
            className="absolute inset-0 bg-void pointer-events-none"
            style={{
              opacity: 0.95
            }}
          />
          <div className="relative z-10">
            {children}
          </div>
          {/* Bottom padding - just enough to ensure content card clears safe area */}
          <div className="h-24 sm:h-32" />
        </div>
      </div>
    </div>
  );
}

export { useFlierToggle } from "./MobileFlierExperience";
