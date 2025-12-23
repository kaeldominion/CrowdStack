"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

interface MapPreviewProps {
  url: string;
}

export function MapPreview({ url }: MapPreviewProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const resolveUrl = async () => {
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
        const placeMatch = url.match(/\/place\/([^/@?]+)/);
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
  }, [url]);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Map Preview</p>
      {isResolving ? (
        <div className="w-full h-64 border-2 border-border bg-surface flex items-center justify-center">
          <p className="text-foreground-muted text-sm">Resolving map URL...</p>
        </div>
      ) : embedUrl ? (
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
        <div className="w-full h-64 border-2 border-border bg-surface flex items-center justify-center">
          <div className="text-center space-y-2 px-4">
            <p className="text-foreground-muted text-sm font-medium">
              Map preview unavailable
            </p>
            <p className="text-foreground-muted text-xs">
              The URL will still work on your public page
            </p>
          </div>
        </div>
      )}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline text-sm inline-flex items-center gap-1 break-all"
      >
        <ExternalLink className="h-3 w-3 flex-shrink-0" />
        <span className="truncate">{url}</span>
      </a>
    </div>
  );
}

