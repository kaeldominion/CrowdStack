"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@crowdstack/ui";
import { ImageIcon, ArrowRight } from "lucide-react";

interface Photo {
  id: string;
  thumbnail_url: string;
  url: string;
  caption: string | null;
}

interface PhotoGalleryPreviewProps {
  eventSlug: string;
  eventId: string;
  eventName: string;
}

export function PhotoGalleryPreview({
  eventSlug,
  eventId,
  eventName,
}: PhotoGalleryPreviewProps) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const response = await fetch(`/api/events/${eventId}/photos`, {
          cache: "no-store",
        });

        if (!response.ok) {
          setPhotos(null);
          return;
        }

        const data = await response.json();
        
        // Only show photos if album is published
        if (data.album?.status === "published" && data.photos && data.photos.length > 0) {
          setPhotos(data.photos.slice(0, 6)); // Show max 6 photos
        } else {
          setPhotos(null);
        }
      } catch (error) {
        console.error("Error fetching photos:", error);
        setPhotos(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
  }, [eventId]);

  // Don't render if loading, no photos, or error
  if (loading) {
    return null; // Or return a loading skeleton if desired
  }

  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <div className="p-3 lg:p-4 rounded-xl bg-white/5 backdrop-blur-md border border-white/10">
      <div className="space-y-3 lg:space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 rounded-lg bg-primary/10">
              <ImageIcon className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg lg:text-xl font-semibold text-foreground">Event Photos</h2>
              <p className="text-xs lg:text-sm text-foreground-muted mt-0.5">
                {photos.length} {photos.length === 1 ? "photo" : "photos"} available
              </p>
            </div>
          </div>
          <Link href={`/p/${eventSlug}`}>
            <Button variant="primary" size="sm" className="text-xs lg:text-sm">
              View Gallery
              <ArrowRight className="h-3 w-3 lg:h-4 lg:w-4 ml-1.5 lg:ml-2" />
            </Button>
          </Link>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          {photos.map((photo: Photo, index: number) => (
            <Link
              key={photo.id}
              href={`/p/${eventSlug}`}
              className="group relative aspect-square overflow-hidden rounded-lg bg-surface"
            >
              <Image
                src={photo.thumbnail_url}
                alt={photo.caption || `Photo ${index + 1} from ${eventName}`}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 640px) 33vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              {index === 5 && photos.length > 6 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs lg:text-sm font-semibold">
                  +{photos.length - 6} more
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

