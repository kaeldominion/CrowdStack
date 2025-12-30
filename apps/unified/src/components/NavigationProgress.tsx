"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Global navigation progress indicator
 * Shows a thin animated bar at the top of the screen during route changes
 * 
 * Triggers on:
 * - Link clicks (anchor tags)
 * - Programmatic navigation (router.push via history API)
 * - Browser back/forward
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const lastPathnameRef = useRef(pathname);
  const navigationStartTimeRef = useRef<number>(0);
  const minDisplayTime = 300; // Minimum time to show progress bar

  // Start navigation progress
  const startNavigation = useCallback(() => {
    setIsNavigating(true);
    setIsComplete(false);
    setProgress(0);
    navigationStartTimeRef.current = Date.now();
  }, []);

  // Complete navigation with smooth finish
  const completeNavigation = useCallback(() => {
    const elapsed = Date.now() - navigationStartTimeRef.current;
    const remainingTime = Math.max(0, minDisplayTime - elapsed);
    
    // First jump to 100%
    setProgress(100);
    setIsComplete(true);
    
    // Then hide after animation completes
    setTimeout(() => {
      setIsNavigating(false);
      setProgress(0);
      setIsComplete(false);
    }, remainingTime + 200); // 200ms for the completion animation
  }, []);

  // Detect route change completion
  useEffect(() => {
    const currentPath = `${pathname}?${searchParams?.toString() || ""}`;
    const lastPath = `${lastPathnameRef.current}`;
    
    if (pathname !== lastPathnameRef.current && isNavigating) {
      completeNavigation();
    }
    
    lastPathnameRef.current = pathname;
  }, [pathname, searchParams, isNavigating, completeNavigation]);

  // Complete progress when page finishes loading (fallback for same-page navigation)
  useEffect(() => {
    if (!isNavigating || isComplete) return;

    const handleLoad = () => {
      if (isNavigating && !isComplete) {
        completeNavigation();
      }
    };

    const handleDOMContentLoaded = () => {
      // Complete after DOM is ready
      setTimeout(() => {
        if (isNavigating && !isComplete) {
          completeNavigation();
        }
      }, 200);
    };

    // Check if page is already loaded
    if (document.readyState === 'complete') {
      // Page already loaded, complete after a short delay
      const timer = setTimeout(() => {
        if (isNavigating && !isComplete) {
          completeNavigation();
        }
      }, 100);
      return () => clearTimeout(timer);
    } else if (document.readyState === 'interactive') {
      // DOM is ready but resources might still be loading
      handleDOMContentLoaded();
      window.addEventListener('load', handleLoad);
      return () => {
        window.removeEventListener('load', handleLoad);
      };
    } else {
      // Wait for DOM to be ready, then for load
      document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
      window.addEventListener('load', handleLoad);
      return () => {
        document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
        window.removeEventListener('load', handleLoad);
      };
    }
  }, [isNavigating, isComplete, completeNavigation]);

  // Listen for navigation events
  useEffect(() => {
    // Handle link clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      
      if (link && link.href && !link.target && !link.download && !e.defaultPrevented) {
        try {
          const url = new URL(link.href);
          // Only show progress for internal navigation to different page
          if (url.origin === window.location.origin && url.pathname !== pathname) {
            startNavigation();
          }
        } catch {
          // Invalid URL, ignore
        }
      }
    };

    // Handle programmatic navigation (router.push, router.replace)
    // Only intercept if it's actually a different path
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    
    history.pushState = function(...args) {
      const url = args[2];
      if (url && typeof url === "string") {
        try {
          const newPath = new URL(url, window.location.origin).pathname;
          // Only start navigation if path actually changes (ignore hash changes, query params only)
          if (newPath !== pathname && newPath !== window.location.pathname) {
            startNavigation();
          }
        } catch {
          // If URL parsing fails, check if it's a different path
          if (url !== window.location.pathname + window.location.search + window.location.hash) {
            startNavigation();
          }
        }
      }
      return originalPushState(...args);
    };
    
    history.replaceState = function(...args) {
      const url = args[2];
      if (url && typeof url === "string") {
        try {
          const newPath = new URL(url, window.location.origin).pathname;
          // Only start navigation if path actually changes
          if (newPath !== pathname && newPath !== window.location.pathname) {
            startNavigation();
          }
        } catch {
          // If URL parsing fails, check if it's a different path
          if (url !== window.location.pathname + window.location.search + window.location.hash) {
            startNavigation();
          }
        }
      }
      return originalReplaceState(...args);
    };

    // Handle browser back/forward
    const handlePopState = () => {
      startNavigation();
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [pathname, startNavigation]);

  // Animate progress when navigating
  useEffect(() => {
    if (!isNavigating || isComplete) return;

    // Eased progress animation
    const timer1 = setTimeout(() => setProgress(15), 0);
    const timer2 = setTimeout(() => setProgress(35), 100);
    const timer3 = setTimeout(() => setProgress(55), 300);
    const timer4 = setTimeout(() => setProgress(70), 600);
    const timer5 = setTimeout(() => setProgress(85), 1200);
    const timer6 = setTimeout(() => setProgress(92), 2500);
    
    // Fallback: Complete after 5 seconds if no route change detected
    const fallbackTimer = setTimeout(() => {
      if (isNavigating && !isComplete) {
        completeNavigation();
      }
    }, 5000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
      clearTimeout(timer6);
      clearTimeout(fallbackTimer);
    };
  }, [isNavigating, isComplete, completeNavigation]);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 pointer-events-none">
      <div
        className={`h-full bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary shadow-[0_0_10px_rgba(139,92,246,0.5)] ${
          isComplete ? "transition-all duration-200 ease-out" : "transition-all duration-300 ease-out"
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

