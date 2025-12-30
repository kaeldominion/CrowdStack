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
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Build display address
  const displayAddress = address || [city, state, country].filter(Boolean).join(", ");

  // Extract coordinates from Google Maps URL if not provided
  const extractCoordinatesFromUrl = (url: string): { lat: number; lng: number } | null => {
    if (!url) return null;
    
    // Try multiple URL patterns
    // Pattern 1: @lat,lng (most common in Google Maps URLs)
    let coordsMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    
    // Pattern 2: ?q=lat,lng
    coordsMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    
    // Pattern 3: ll=lat,lng
    coordsMatch = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
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
      console.log("[MapPreview] Extracted coordinates from URL:", { lat: finalLat, lng: finalLng });
    } else {
      console.warn("[MapPreview] Could not extract coordinates from URL:", mapsUrl);
    }
  }

  const hasCoordinates = finalLat != null && finalLng != null;
  
  // Generate static map image URL
  const getStaticMapUrl = () => {
    if (!hasCoordinates) {
      console.warn("[MapPreview] No coordinates available", { lat: finalLat, lng: finalLng, mapsUrl });
      return null;
    }
    
    const zoom = 15;
    const width = 600; // Higher resolution for better quality
    const height = 300;
    // Note: Client components can only access NEXT_PUBLIC_ prefixed env vars
    // For server-side components, use GOOGLE_MAPS_API_KEY
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!googleMapsApiKey) {
      console.warn("[MapPreview] NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not found, using OpenStreetMap fallback");
    }
    
    // Use Google Maps Static API if API key is available (better quality)
    if (googleMapsApiKey) {
      // Google Maps Static API with marker
      const marker = `${finalLat},${finalLng}`;
      const url = `https://maps.googleapis.com/maps/api/staticmap?center=${finalLat},${finalLng}&zoom=${zoom}&size=${width}x${height}&markers=color:red%7C${marker}&key=${googleMapsApiKey}`;
      console.log("[MapPreview] Generated Google Maps Static API URL:", url.substring(0, 100) + "...");
      return url;
    }
    
    // No static image available without API key
    console.warn("[MapPreview] No Google Maps API key configured - will use iframe embed instead");
    return null;
  };

  // Generate Google Maps embed URL (works without API key)
  const getEmbedUrl = (): string | null => {
    if (!hasCoordinates) return null;
    // Use output=embed format which works without API key
    return `https://www.google.com/maps?q=${finalLat},${finalLng}&hl=en&z=15&output=embed`;
  };

  const staticMapUrl = getStaticMapUrl();
  const embedUrl = getEmbedUrl();
  const showImage = staticMapUrl && !imageError;
  const showEmbed = !showImage && hasCoordinates;

  // Debug info (only in development)
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    console.log("[MapPreview] Debug info:", {
      hasCoordinates,
      finalLat,
      finalLng,
      mapsUrl,
      hasApiKey: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      apiKeyPrefix: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.substring(0, 10) + "...",
      staticMapUrl: staticMapUrl?.substring(0, 100),
      showImage,
      imageLoaded,
      imageError,
    });
  }

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <Card padding="none" hover className="overflow-hidden group">
        <div className="relative h-32 bg-raised">
          {/* Static Map Image (when API key available) */}
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
                onError={(e) => {
                  console.error("[MapPreview] Failed to load map image:", {
                    url: staticMapUrl?.substring(0, 100),
                    error: e,
                    hasApiKey: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
                    coordinates: { lat: finalLat, lng: finalLng },
                  });
                  setImageError(true);
                }}
                loading="lazy"
              />
              {/* Dark overlay for better text visibility */}
              <div className="absolute inset-0 bg-void/40 group-hover:bg-void/30 transition-colors" />
            </>
          )}

          {/* Google Maps Embed (fallback when no API key but we have coordinates) */}
          {showEmbed && embedUrl && (
            <>
              <iframe
                src={embedUrl}
                className={`absolute inset-0 w-full h-full border-0 transition-opacity duration-300 ${
                  iframeLoaded ? "opacity-100" : "opacity-0"
                }`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                onLoad={() => setIframeLoaded(true)}
                title={`Map location${displayAddress ? `: ${displayAddress}` : ""}`}
              />
              {/* Dark overlay for better text visibility */}
              <div className="absolute inset-0 bg-void/40 group-hover:bg-void/30 transition-colors pointer-events-none" />
            </>
          )}

          {/* Fallback placeholder (shown when no coords) */}
          {!hasCoordinates && (
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

          {/* Loading state for image/embed */}
          {((showImage && !imageLoaded) || (showEmbed && !iframeLoaded)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-raised">
              <div className="w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Center pin & button */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10 pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-accent-primary/90 flex items-center justify-center shadow-lg">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glass/80 backdrop-blur-sm border border-border-subtle text-xs font-medium text-primary group-hover:bg-active transition-colors pointer-events-auto">
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
