"use client";

import { Button } from "@crowdstack/ui";
import { MapPin } from "lucide-react";

interface GoogleMapsButtonProps {
  mapsUrl: string;
  className?: string;
}

export function GoogleMapsButton({ mapsUrl, className = "" }: GoogleMapsButtonProps) {
  const handleClick = () => {
    window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button
      variant="secondary"
      size="lg"
      onClick={handleClick}
      aria-label="Open in Google Maps"
      className={`px-3 ${className}`}
    >
      <MapPin className="h-4 w-4" />
    </Button>
  );
}

