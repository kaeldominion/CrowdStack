"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Share2, Image as ImageIcon, Camera, Clock, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
import { Logo, LoadingSpinner, Button } from "@crowdstack/ui";
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
  cover_image_url?: string | null;
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
        // Only show photos if album is published
        if (photosData.album?.status === "published") {
          setPhotos(photosData.photos || []);
        }
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
        console.log("Share cancelled");
      }
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center">
        <LoadingSpinner text="Loading photos..." size="lg" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--bg-glass)] border border-[var(--border-subtle)] flex items-center justify-center">
            <ImageIcon className="h-10 w-10 text-[var(--text-muted)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Event Not Found</h1>
          <p className="text-[var(--text-secondary)] mb-6">
            The event you're looking for doesn't exist or may have been removed.
          </p>
          <Link href="/">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Photos coming soon state (no album or unpublished)
  if (!album || album.status !== "published") {
    return (
      <div className="min-h-screen bg-[var(--bg-void)]">
        {/* Header */}
        <div className="pt-24 pb-8 px-4">
          <div className="mx-auto max-w-2xl text-center">
            <Link
              href={`/e/${eventSlug}`}
              className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Event
            </Link>
          </div>
        </div>

        {/* Coming Soon Card */}
        <div className="px-4">
          <div className="mx-auto max-w-lg">
            <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--bg-glass)] border border-[var(--border-strong)]">
              {/* Event cover image or gradient background */}
              {event.cover_image_url ? (
                <div className="relative h-48">
                  <img
                    src={event.cover_image_url}
                    alt={event.name}
                    className="w-full h-full object-cover opacity-50"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-void)] to-transparent" />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-[var(--accent-secondary)]/20 to-[var(--accent-primary)]/20" />
              )}

              <div className="relative p-8 -mt-16">
                {/* Camera icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--bg-void)] border-4 border-[var(--border-strong)] flex items-center justify-center">
                  <Camera className="h-8 w-8 text-[var(--accent-secondary)]" />
                </div>

                <h1 className="text-2xl font-bold text-[var(--text-primary)] text-center mb-2">
                  Photos Coming Soon
                </h1>

                <p className="text-[var(--text-secondary)] text-center mb-6">
                  The photos from <span className="text-[var(--text-primary)] font-medium">{event.name}</span> are being prepared and will be available here soon.
                </p>

                {/* Event info */}
                <div className="flex items-center justify-center gap-4 text-sm text-[var(--text-muted)]">
                  {event.start_time && (
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      <span>{formatDate(event.start_time)}</span>
                    </div>
                  )}
                  {event.venue?.name && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{event.venue.name}</span>
                    </div>
                  )}
                </div>

                {/* Check back message */}
                <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-center gap-2 text-[var(--text-muted)] text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Check back in a few days</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-16 pb-8">
          <div className="flex flex-col items-center justify-center">
            <Logo variant="tricolor" size="sm" />
          </div>
        </div>
      </div>
    );
  }

  // Published but no photos yet
  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-void)] flex flex-col">
        {/* Header */}
        <div className="pt-24 px-4">
          <div className="mx-auto max-w-7xl">
            <Link
              href={`/e/${eventSlug}`}
              className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Event
            </Link>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--bg-glass)] border border-[var(--border-subtle)] flex items-center justify-center">
              <Camera className="h-10 w-10 text-[var(--text-muted)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">{event.name}</h1>
            <p className="text-[var(--text-secondary)] mb-2">
              The photo album is ready, but no photos have been uploaded yet.
            </p>
            <p className="text-[var(--text-muted)] text-sm">
              Check back soon for event photos!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="py-8">
          <div className="flex flex-col items-center justify-center">
            <Logo variant="tricolor" size="sm" />
          </div>
        </div>
      </div>
    );
  }

  // Full gallery view
  return (
    <div className="min-h-screen bg-[var(--bg-void)] pt-20">
      {/* Header - positioned below the global floating nav */}
      <div className="sticky top-20 z-10 bg-[var(--bg-void)]/80 backdrop-blur-md border-b border-[var(--border-subtle)]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/e/${eventSlug}`}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">{event.name}</h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  {event.venue?.name}
                  {event.venue?.city && ` • ${event.venue.city}`}
                  {event.start_time && ` • ${formatDate(event.start_time)}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-[var(--bg-glass)] border border-[var(--border-subtle)] hover:bg-[var(--bg-active)] transition-colors"
            >
              <Share2 className="h-5 w-5 text-[var(--text-primary)]" />
            </button>
          </div>
        </div>
      </div>

      {/* Photo Count */}
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <p className="text-[var(--text-secondary)] text-sm">
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
                <div className="relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-glass)] border border-[var(--border-subtle)]">
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
      <div className="border-t border-[var(--border-subtle)] py-8 mt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          <Logo variant="tricolor" size="sm" />
        </div>
      </div>
    </div>
  );
}
