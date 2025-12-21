"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@crowdstack/ui";

interface MobileStickyCTAProps {
  href: string;
  label: string;
  eventName: string;
}

export function MobileStickyCTA({ href, label, eventName }: MobileStickyCTAProps) {
  const [isVisible, setIsVisible] = useState(false);

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

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background border-t border-border p-4 shadow-lg">
      <Link href={href} className="block">
        <Button variant="primary" size="lg" className="w-full">
          {label}
        </Button>
      </Link>
    </div>
  );
}

