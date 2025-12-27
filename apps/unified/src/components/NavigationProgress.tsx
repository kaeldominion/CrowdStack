"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Global navigation progress indicator
 * Shows a thin animated bar at the top of the screen during route changes
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Reset on route change complete
    setIsNavigating(false);
    setProgress(0);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Listen for navigation start (link clicks)
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      
      if (link && link.href && !link.target && !link.download) {
        const url = new URL(link.href);
        // Only show progress for internal navigation
        if (url.origin === window.location.origin && url.pathname !== pathname) {
          setIsNavigating(true);
          setProgress(0);
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  // Animate progress when navigating
  useEffect(() => {
    if (!isNavigating) return;

    // Quick initial progress
    const timer1 = setTimeout(() => setProgress(30), 50);
    const timer2 = setTimeout(() => setProgress(60), 200);
    const timer3 = setTimeout(() => setProgress(80), 500);
    const timer4 = setTimeout(() => setProgress(90), 1000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [isNavigating]);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-void/50">
      <div
        className="h-full bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

