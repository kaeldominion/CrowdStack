"use client";

import { Card, Button } from "@crowdstack/ui";
import { MapPin, ExternalLink } from "lucide-react";
import type { Venue } from "@crowdstack/shared/types";

interface VenueMapCardProps {
  venue: Venue;
}

export function VenueMapCard({ venue }: VenueMapCardProps) {
  if (!venue.google_maps_url) {
    return null;
  }

  // Extract place ID or coordinates from Google Maps URL for embedding
  const getEmbedUrl = () => {
    const url = venue.google_maps_url;
    
    if (!url) return null;

    // Try to extract coordinates from URL patterns like: @lat,lng (most common and reliable)
    const coordsMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coordsMatch) {
      const lat = coordsMatch[1];
      const lng = coordsMatch[2];
      
      // Try API key approach first (better quality)
      const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (googleMapsApiKey) {
        return `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${lat},${lng}&zoom=15`;
      }
      
      // Fallback: Use Google Maps embed without API key (may have limitations)
      // Convert coordinates to embed format
      return `https://www.google.com/maps?q=${lat},${lng}&hl=en&z=15&output=embed`;
    }

    // Try API key approach for place names
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (googleMapsApiKey) {
      // Try to extract place name from URL patterns like: /place/PlaceName/@...
      const placeMatch = url.match(/\/place\/([^/@]+)/);
      if (placeMatch) {
        const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
        return `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(placeName)}&zoom=15`;
      }

      // Try to extract query parameter from ?q= or &q=
      const queryMatch = url.match(/[?&]q=([^&]+)/);
      if (queryMatch) {
        const query = decodeURIComponent(queryMatch[1]);
        return `https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${encodeURIComponent(query)}&zoom=15`;
      }
    }

    return null;
  };

  const embedUrl = getEmbedUrl();

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-secondary" />
          <h2 className="text-2xl font-semibold text-primary">Location</h2>
        </div>

        {/* Google Maps Embed */}
        {embedUrl ? (
          <div className="w-full h-64 border-2 border-border overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={embedUrl}
            />
          </div>
        ) : (
          <div className="w-full h-64 border-2 border-border bg-glass flex items-center justify-center">
            <p className="text-secondary text-sm text-center px-4">
              Map preview unavailable. Click below to open in Google Maps.
            </p>
          </div>
        )}

        {/* Open in Google Maps Button */}
        <a
          href={venue.google_maps_url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-4 py-2 text-sm bg-glass text-primary border border-border hover:bg-glass/80 focus:ring-primary w-full"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in Google Maps
        </a>
      </div>
    </Card>
  );
}

