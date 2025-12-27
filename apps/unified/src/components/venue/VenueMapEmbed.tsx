"use client";

import { useEffect, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import type { Venue } from "@crowdstack/shared/types";

interface VenueMapEmbedProps {
  venue: Venue;
  mapsUrl: string | null;
}

export function VenueMapEmbed({ venue, mapsUrl }: VenueMapEmbedProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const resolveUrl = async () => {
      const url = venue.google_maps_url || mapsUrl;
      
      if (!url) {
        setEmbedUrl(null);
        return;
      }

      // Check if it's a short URL (maps.app.goo.gl or goo.gl/maps)
      const isShortUrl = /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)/.test(url);

      if (isShortUrl) {
        setIsResolving(true);
        try {
          // Resolve short URL server-side
          const response = await fetch(`/api/maps/resolve?url=${encodeURIComponent(url)}`);
          const data = await response.json();
          
          if (data.coordinates) {
            const { lat, lng } = data.coordinates;
            const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (googleMapsApiKey) {
              setEmbedUrl(`https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${lat},${lng}&zoom=15`);
            } else {
              setEmbedUrl(`https://www.google.com/maps?q=${lat},${lng}&hl=en&z=15&output=embed`);
            }
          } else {
            // Couldn't extract coordinates, but we can still use the resolved URL
            setEmbedUrl(null);
          }
        } catch (error) {
          console.error("Failed to resolve short URL:", error);
          setEmbedUrl(null);
        } finally {
          setIsResolving(false);
        }
        return;
      }

      // For regular URLs, extract coordinates directly
      const coordsMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (coordsMatch) {
        const lat = coordsMatch[1];
        const lng = coordsMatch[2];
        
        const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (googleMapsApiKey) {
          setEmbedUrl(`https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${lat},${lng}&zoom=15`);
        } else {
          setEmbedUrl(`https://www.google.com/maps?q=${lat},${lng}&hl=en&z=15&output=embed`);
        }
        return;
      }

      // Try API key approach for place names
      const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (googleMapsApiKey) {
        const placeMatch = url.match(/\/place\/([^/@]+)/);
        if (placeMatch) {
          const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
          setEmbedUrl(`https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(placeName)}&zoom=15`);
          return;
        }

        const queryMatch = url.match(/[?&]q=([^&]+)/);
        if (queryMatch) {
          const query = decodeURIComponent(queryMatch[1]);
          setEmbedUrl(`https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(query)}&zoom=15`);
          return;
        }
      }

      setEmbedUrl(null);
    };

    resolveUrl();
  }, [venue.google_maps_url, mapsUrl]);

  if (!mapsUrl && !venue.google_maps_url) {
    return null;
  }

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-6 pb-4">
        <div className="p-2 rounded-lg bg-accent-secondary/10">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-white">Location</h2>
      </div>
      
      {/* Address Text - Only show if we have Google Maps URL (addresses are extracted from Google Maps, not legacy manual entries) */}
      {/* Don't show legacy address fields if we have a Google Maps URL */}

      {/* Google Maps Embed */}
      {isResolving ? (
        <div className="w-full h-64 md:h-80 border-t border-white/10 bg-black/20 flex items-center justify-center">
          <p className="text-white/50 text-sm text-center px-4">
            Loading map...
          </p>
        </div>
      ) : embedUrl ? (
        <div className="w-full h-64 md:h-80 border-t border-white/10">
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={embedUrl}
            className="opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>
      ) : (
        <div className="w-full h-64 md:h-80 border-t border-white/10 bg-black/20 flex items-center justify-center">
          <p className="text-white/50 text-sm text-center px-4">
            Map preview unavailable
            <br />
            <span className="text-xs text-white/40 mt-1 block">Click below to open in Google Maps</span>
          </p>
        </div>
      )}

      {/* Open in Google Maps Button */}
      {mapsUrl && (
        <div className="p-6 pt-4 border-t border-white/10">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm font-medium group"
          >
            Open in Google Maps
            <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      )}
    </div>
  );
}

