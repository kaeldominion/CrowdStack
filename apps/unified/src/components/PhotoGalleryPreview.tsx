import Link from "next/link";
import Image from "next/image";
import { Card, Button } from "@crowdstack/ui";
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

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // In production on Vercel, always use the custom domain
  if (process.env.VERCEL_ENV === "production") {
    return "https://crowdstack.app";
  }
  // For preview deployments, use VERCEL_URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

async function getEventPhotos(eventId: string) {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(
      `${baseUrl}/api/events/${eventId}/photos`,
      { 
        cache: "no-store",
        // In production, we might need to pass headers for auth, but for public photos this should work
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Only show photos if album is published
    if (data.album?.status === "published" && data.photos && data.photos.length > 0) {
      return data.photos.slice(0, 6); // Show max 6 photos
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching photos:", error);
    return null;
  }
}

export async function PhotoGalleryPreview({
  eventSlug,
  eventId,
  eventName,
}: PhotoGalleryPreviewProps) {
  const photos = await getEventPhotos(eventId);

  // Don't render if no photos
  if (!photos || photos.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Event Photos</h2>
              <p className="text-sm text-foreground-muted mt-1">
                {photos.length} {photos.length === 1 ? "photo" : "photos"} available
              </p>
            </div>
          </div>
          <Link href={`/p/${eventSlug}`}>
            <Button variant="primary">
              View Gallery
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Photo Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                sizes="(max-width: 640px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              {index === 5 && photos.length > 6 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white font-semibold">
                  +{photos.length - 6} more
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}

