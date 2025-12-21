"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, Badge, EmptyState, LoadingSpinner, InlineSpinner } from "@crowdstack/ui";
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Trash2,
  Star,
  Eye,
  EyeOff,
  Grid3x3,
  List,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { PhotoUploader } from "@/components/PhotoUploader";

interface Photo {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  caption: string | null;
  display_order: number;
  url: string;
  thumbnail_url: string;
  created_at: string;
}

interface Album {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published";
  cover_photo_id: string | null;
  published_at: string | null;
}

interface Event {
  id: string;
  slug: string;
  name: string;
}

export default function OrganizerPhotosPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const shareInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch event to get slug
      const eventResponse = await fetch(`/api/events/${eventId}`);
      const eventData = await eventResponse.json();
      if (eventResponse.ok && eventData.event) {
        setEvent({
          id: eventData.event.id,
          slug: eventData.event.slug,
          name: eventData.event.name,
        });
      }

      // Fetch photos
      const photosResponse = await fetch(`/api/events/${eventId}/photos`);
      const photosData = await photosResponse.json();

      if (photosResponse.ok) {
        setAlbum(photosData.album);
        setPhotos(photosData.photos || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    loadData();
  };

  const handleDelete = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    try {
      setDeleting(photoId);
      const response = await fetch(
        `/api/events/${eventId}/photos/${photoId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (album?.cover_photo_id === photoId) {
          setAlbum((prev) => (prev ? { ...prev, cover_photo_id: null } : null));
        }
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      alert("Failed to delete photo");
    } finally {
      setDeleting(null);
    }
  };

  const handleSetCover = async (photoId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}/photos/cover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });

      if (response.ok) {
        setAlbum((prev) =>
          prev ? { ...prev, cover_photo_id: photoId } : null
        );
      }
    } catch (error) {
      console.error("Error setting cover photo:", error);
      alert("Failed to set cover photo");
    }
  };

  const handleReorder = async (photoId: string, direction: "up" | "down") => {
    const currentIndex = photos.findIndex((p) => p.id === photoId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= photos.length) return;

    // Swap photos in array
    const newPhotos = [...photos];
    [newPhotos[currentIndex], newPhotos[newIndex]] = [
      newPhotos[newIndex],
      newPhotos[currentIndex],
    ];

    // Update display order
    const photoIds = newPhotos.map((p) => p.id);

    try {
      const response = await fetch(`/api/events/${eventId}/photos/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds }),
      });

      if (response.ok) {
        setPhotos(newPhotos);
      } else {
        alert("Failed to reorder photos");
      }
    } catch (error) {
      console.error("Error reordering photos:", error);
      alert("Failed to reorder photos");
    }
  };

  const handlePublish = async () => {
    try {
      setPublishing(true);
      const response = await fetch(
        `/api/events/${eventId}/photos/publish`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (response.ok) {
        setAlbum((prev) =>
          prev
            ? {
                ...prev,
                status: "published" as const,
                published_at: new Date().toISOString(),
              }
            : null
        );
        alert(
          `Photos published! ${data.emails_sent || 0} attendees notified.`
        );
      } else {
        alert(data.error || "Failed to publish photos");
      }
    } catch (error) {
      console.error("Error publishing photos:", error);
      alert("Failed to publish photos");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner text="Loading photos..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/app/organizer/events/${eventId}`}
            className="inline-flex items-center gap-2 text-foreground-muted hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Event
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Photo Album</h1>
              <p className="mt-2 text-foreground-muted">
                {photos.length} {photos.length === 1 ? "photo" : "photos"}
                {album?.status === "published" && (
                  <Badge variant="success" className="ml-2">
                    Published
                  </Badge>
                )}
              </p>
            </div>

            {photos.length > 0 && album?.status !== "published" && (
              <Button
                variant="primary"
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? (
                  <>
                    <InlineSpinner size="sm" className="mr-2" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Publish Album
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <PhotoUploader
            eventId={eventId}
            onUploadComplete={handleUploadComplete}
          />
        </Card>

        {/* Photos Grid */}
        {photos.length === 0 ? (
          <EmptyState
            icon={<ImageIcon />}
            title="No photos yet"
            description="Upload photos to create your event album"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group aspect-square rounded-lg overflow-hidden bg-surface border border-border"
              >
                <img
                  src={photo.thumbnail_url}
                  alt={photo.caption || "Event photo"}
                  className="w-full h-full object-cover"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReorder(photo.id, "up");
                      }}
                      className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                      title="Move up"
                      disabled={photos.findIndex((p) => p.id === photo.id) === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReorder(photo.id, "down");
                      }}
                      className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                      title="Move down"
                      disabled={
                        photos.findIndex((p) => p.id === photo.id) ===
                        photos.length - 1
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetCover(photo.id);
                      }}
                      className={`p-2 rounded-full ${
                        album?.cover_photo_id === photo.id
                          ? "bg-primary text-white"
                          : "bg-white/20 text-white hover:bg-white/30"
                      }`}
                      title="Set as cover"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(photo.id);
                      }}
                      className="p-2 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                      disabled={deleting === photo.id}
                      title="Delete"
                    >
                      {deleting === photo.id ? (
                        <InlineSpinner size="sm" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Cover badge */}
                {album?.cover_photo_id === photo.id && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="primary" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Cover
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Album Info */}
        {album && (
          <Card className="mt-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Album Status
                </h3>
                <div className="flex items-center gap-4">
                  <Badge
                    variant={album.status === "published" ? "success" : "default"}
                  >
                    {album.status === "published" ? (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Published
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Draft
                      </>
                    )}
                  </Badge>
                  {album.published_at && (
                    <span className="text-sm text-foreground-muted">
                      Published {new Date(album.published_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {album.status === "published" && event && (
                <div>
                  <p className="text-sm text-foreground-muted mb-2">
                    Share this album with attendees:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      ref={shareInputRef}
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/p/${event.slug}`}
                      className="flex-1 px-3 py-2 bg-surface border border-border rounded-md text-sm text-foreground"
                      onClick={(e) => {
                        (e.target as HTMLInputElement).select();
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        try {
                          const url = `${window.location.origin}/p/${event.slug}`;
                          
                          // Try clipboard API first
                          if (navigator.clipboard && navigator.clipboard.writeText) {
                            await navigator.clipboard.writeText(url);
                            alert("Link copied to clipboard!");
                          } else if (shareInputRef.current) {
                            // Fallback: select the input and copy
                            shareInputRef.current.select();
                            shareInputRef.current.setSelectionRange(0, 99999); // For mobile devices
                            document.execCommand('copy');
                            alert("Link copied to clipboard!");
                          } else {
                            // Last resort: show prompt
                            prompt("Copy this link:", url);
                          }
                        } catch (err) {
                          console.error("Failed to copy:", err);
                          // Fallback: show the URL in a prompt
                          const url = `${window.location.origin}/p/${event.slug}`;
                          prompt("Copy this link:", url);
                        }
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
