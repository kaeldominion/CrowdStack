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

  // Extract coordinates from Google Maps URL if not provided
  const extractCoordinatesFromUrl = (url: string): { lat: number; lng: number } | null => {
    // Try to extract coordinates from URL patterns like: @lat,lng (most common)
    const coordsMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return null;
  };

  // Get coordinates (from props or extract from URL)
  let finalLat = lat;
  let finalLng = lng;
  
  if ((finalLat == null || finalLng == null) && mapsUrl) {
    const extracted = extractCoordinatesFromUrl(mapsUrl);
    if (extracted) {
      finalLat = extracted.lat;
      finalLng = extracted.lng;
    }
  }

  const hasCoordinates = finalLat != null && finalLng != null;
  
  // Generate static map image URL
  const getStaticMapUrl = () => {
    if (!hasCoordinates) return null;
    
    const zoom = 15;
    const width = 600; // Higher resolution for better quality
    const height = 300;
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    // Use Google Maps Static API if API key is available (better quality)
    if (googleMapsApiKey) {
      // Google Maps Static API with marker
      const marker = `${finalLat},${finalLng}`;
      return `https://maps.googleapis.com/maps/api/staticmap?center=${finalLat},${finalLng}&zoom=${zoom}&size=${width}x${height}&markers=color:red%7C${marker}&key=${googleMapsApiKey}`;
    }
    
    // Fallback to OpenStreetMap static map service (free, no API key needed)
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${finalLat},${finalLng}&zoom=${zoom}&size=${width}x${height}&maptype=osmarenderer&markers=${finalLat},${finalLng},red-pushpin`;
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
                src={staticMapUrl || undefined}
                alt={`Map location${displayAddress ? `: ${displayAddress}` : ""}`}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  console.error("Failed to load map image:", staticMapUrl);
                  setImageError(true);
                }}
                loading="lazy"
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
