"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Share2, Image as ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { Logo } from "@crowdstack/ui";
import { PhotoLightbox } from "@/components/PhotoLightbox";

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

interface Album {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  published_at: string | null;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  venue?: {
    name: string;
    city: string | null;
  } | null;
}

export default function PhotosPage() {
  const params = useParams();
  const eventSlug = params.eventSlug as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [eventSlug]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch event
      const eventResponse = await fetch(`/api/events/by-slug/${eventSlug}`);
      const eventData = await eventResponse.json();

      if (!eventResponse.ok) {
        throw new Error(eventData.error || "Event not found");
      }

      setEvent(eventData.event);

      // Fetch photos
      const photosResponse = await fetch(`/api/events/${eventData.event.id}/photos`);
      const photosData = await photosResponse.json();

      if (photosResponse.ok) {
        setAlbum(photosData.album);
        console.log("Album data:", photosData.album);
        console.log("Photos data:", photosData.photos);
        // Only show photos if album is published
        if (photosData.album?.status === "published") {
          setPhotos(photosData.photos || []);
        } else {
          console.log("Album status is not published:", photosData.album?.status);
        }
      } else {
        console.error("Failed to fetch photos:", photosData);
      }
    } catch (error) {
      console.error("Error loading photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = (index: number) => {
    setSelectedPhotoIndex(index);
  };

  const handleCloseLightbox = () => {
    setSelectedPhotoIndex(null);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${event?.name} - Photos`,
          text: `Check out photos from ${event?.name}!`,
          url,
        });
      } catch (err) {
        // User cancelled or error
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-white/20" />
          <h1 className="text-2xl font-bold text-white mb-2">Event Not Found</h1>
          <p className="text-white/60">
            The event you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-white/20" />
          <h1 className="text-2xl font-bold text-white mb-2">No Photo Album</h1>
          <p className="text-white/60">
            This event doesn't have a photo album yet.
          </p>
        </div>
      </div>
    );
  }

  if (album.status !== "published") {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-white/20" />
          <h1 className="text-2xl font-bold text-white mb-2">Photos Not Available</h1>
          <p className="text-white/60">
            This photo album hasn't been published yet. The organizer needs to publish it first.
          </p>
          <p className="text-white/40 text-sm mt-2">
            Album status: {album.status}
          </p>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-[#0B0D10] flex items-center justify-center px-4">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-white/20" />
          <h1 className="text-2xl font-bold text-white mb-2">No Photos Yet</h1>
          <p className="text-white/60">
            Photos will appear here once they're uploaded.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#0B0D10]">
      {/* Header - positioned below the global floating nav */}
      <div className="sticky top-20 z-10 bg-[#0B0D10]/80 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/e/${eventSlug}`}
                className="text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">{event.name}</h1>
                <p className="text-sm text-white/60">
                  {event.venue?.name}
                  {event.venue?.city && ` • ${event.venue.city}`}
                  {event.start_time && ` • ${formatDate(event.start_time)}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Share2 className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Photo Count */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-white/60 text-sm">
          {photos.length} {photos.length === 1 ? "photo" : "photos"}
        </p>
      </div>

      {/* Masonry Grid */}
      <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-4">
          {photos.map((photo, index) => {
            // Calculate aspect ratio for better layout
            const aspectRatio = photo.width && photo.height 
              ? photo.height / photo.width 
              : 1;
            const height = aspectRatio * 300; // Base width of ~300px per column

            return (
              <div
                key={photo.id}
                className="mb-4 break-inside-avoid cursor-pointer group"
                onClick={() => handlePhotoClick(index)}
              >
                <div className="relative overflow-hidden rounded-lg bg-white/5">
                  <img
                    src={photo.thumbnail_url}
                    alt={photo.caption || `Photo ${index + 1}`}
                    className="w-full h-auto object-cover transition-transform group-hover:scale-105"
                    style={{ height: `${height}px` }}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {selectedPhotoIndex !== null && (
        <PhotoLightbox
          photos={photos}
          initialIndex={selectedPhotoIndex}
          onClose={handleCloseLightbox}
          eventName={event.name}
          eventSlug={eventSlug}
        />
      )}

      {/* Footer */}
      <div className="border-t border-white/10 py-8 mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <Logo size="sm" />
          <p className="mt-4 text-white/40 text-sm">
            Powered by CrowdStack
          </p>
        </div>
      </div>
    </div>
  );
}
