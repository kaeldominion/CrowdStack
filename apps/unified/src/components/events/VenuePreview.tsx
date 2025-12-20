"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import type { Venue } from "@crowdstack/shared/types";

interface VenuePreviewProps {
  venue: Venue | null;
  size?: "sm" | "md";
  showCoverThumbnail?: boolean;
  className?: string;
}

export function VenuePreview({
  venue,
  size = "md",
  showCoverThumbnail = false,
  className = "",
}: VenuePreviewProps) {
  if (!venue) {
    return (
      <div className={`flex items-center gap-2 text-foreground-muted ${className}`}>
        <MapPin className="h-4 w-4" />
        <span className="text-sm">No venue</span>
      </div>
    );
  }

  const logoSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const location = [venue.city, venue.state].filter(Boolean).join(", ");

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {venue.logo_url ? (
        <div className={`relative ${logoSize} flex-shrink-0 border-2 border-border`}>
          <Image
            src={venue.logo_url}
            alt={venue.name}
            fill
            className="object-contain"
          />
        </div>
      ) : (
        <div className={`${logoSize} flex-shrink-0 border-2 border-border bg-surface flex items-center justify-center`}>
          <MapPin className="h-4 w-4 text-foreground-muted" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate text-sm">{venue.name}</p>
        {location && (
          <p className="text-xs text-foreground-muted truncate">{location}</p>
        )}
      </div>

      {showCoverThumbnail && venue.cover_image_url && (
        <div className="relative h-12 w-12 flex-shrink-0 border-2 border-border overflow-hidden">
          <Image
            src={venue.cover_image_url}
            alt={`${venue.name} cover`}
            fill
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}

