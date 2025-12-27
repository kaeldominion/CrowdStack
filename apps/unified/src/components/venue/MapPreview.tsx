"use client";

import { useState } from "react";
import { MapPin, Map, ExternalLink } from "lucide-react";
import { Card } from "@crowdstack/ui";

interface MapPreviewProps {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  mapsUrl: string;
}

export function MapPreview({ lat, lng, address, city, state, country, mapsUrl }: MapPreviewProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Build display address
  const displayAddress = address || [city, state, country].filter(Boolean).join(", ");

  // Try to get a static map image
  // Using OpenStreetMap static tiles via stadiamaps (free, no API key for low usage)
  // Or we can use a simple tile approach
  const hasCoordinates = lat != null && lng != null;
  
  // OpenStreetMap tile URL (free, no API key needed)
  // Format: https://tile.openstreetmap.org/{z}/{x}/{y}.png
  // We'll use a simple approach with a centered tile
  const getStaticMapUrl = () => {
    if (!hasCoordinates) return null;
    
    // Use OSM static map service (free tier)
    // Alternative: use a simple tile from OSM
    const zoom = 15;
    const width = 400;
    const height = 200;
    
    // Use staticmap.openstreetmap.de (free OSM static map service)
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=osmarenderer&markers=${lat},${lng},red-pushpin`;
  };

  const staticMapUrl = getStaticMapUrl();
  const showImage = staticMapUrl && !imageError;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <Card padding="none" hover className="overflow-hidden group">
        <div className="relative h-32 bg-raised">
          {/* Static Map Image */}
          {showImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={staticMapUrl}
                alt="Map"
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
              {/* Dark overlay for better text visibility */}
              <div className="absolute inset-0 bg-void/40 group-hover:bg-void/30 transition-colors" />
            </>
          )}

          {/* Fallback placeholder (shown when no coords or image fails) */}
          {(!showImage || !imageLoaded) && (
            <div className="absolute inset-0">
              {/* Grid pattern to simulate map */}
              <div className="absolute inset-0 opacity-20">
                <div 
                  className="absolute inset-0" 
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                  }} 
                />
              </div>
            </div>
          )}

          {/* Center pin & button */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <div className="w-10 h-10 rounded-full bg-accent-primary/90 flex items-center justify-center shadow-lg">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glass/80 backdrop-blur-sm border border-border-subtle text-xs font-medium text-primary group-hover:bg-active transition-colors">
              <Map className="h-3.5 w-3.5" />
              Open in Maps
              <ExternalLink className="h-3 w-3 opacity-50" />
            </div>
          </div>
        </div>

        {/* Address bar */}
        {displayAddress && (
          <div className="px-3 py-2 bg-glass/50 border-t border-border-subtle">
            <p className="text-xs text-secondary truncate">
              {displayAddress}
            </p>
          </div>
        )}
      </Card>
    </a>
  );
}
