"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "@crowdstack/ui";
import { X } from "lucide-react";
import type { VenueGallery as VenueGalleryType } from "@crowdstack/shared/types";

interface VenueGalleryProps {
  gallery: VenueGalleryType[];
  venueId: string;
}

export function VenueGallery({ gallery, venueId }: VenueGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<VenueGalleryType | null>(null);

  if (!gallery || gallery.length === 0) {
    return null;
  }

  const heroImage = gallery.find((img) => img.is_hero) || gallery[0];
  const otherImages = gallery.filter((img) => img.id !== heroImage.id);

  const getImageUrl = (image: VenueGalleryType) => {
    if (image.storage_path.startsWith("http")) {
      return image.storage_path;
    }
    // Construct public URL from Supabase storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseProjectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
    if (supabaseProjectRef) {
      return `https://${supabaseProjectRef}.supabase.co/storage/v1/object/public/venue-images/${image.storage_path}`;
    }
    return image.storage_path;
  };

  return (
    <>
      <Card>
        <h2 className="text-2xl font-semibold text-primary mb-6">Gallery</h2>

        {/* Hero Image */}
        {heroImage && (
          <div className="mb-6">
            <div
              className="relative h-96 w-full overflow-hidden border-2 border-border cursor-pointer"
              onClick={() => setSelectedImage(heroImage)}
            >
              <Image
                src={getImageUrl(heroImage)}
                alt={heroImage.caption || "Venue hero image"}
                fill
                className="object-cover"
              />
            </div>
            {heroImage.caption && (
              <p className="text-sm text-secondary mt-2">{heroImage.caption}</p>
            )}
          </div>
        )}

        {/* Gallery Grid */}
        {otherImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {otherImages.map((image) => (
              <div
                key={image.id}
                className="relative aspect-square overflow-hidden border-2 border-border cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedImage(image)}
              >
                <Image
                  src={getImageUrl(image)}
                  alt={image.caption || "Venue gallery image"}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-white/80 p-2"
            onClick={() => setSelectedImage(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={getImageUrl(selectedImage)}
              alt={selectedImage.caption || "Venue image"}
              width={1920}
              height={1080}
              className="max-w-full max-h-[90vh] object-contain"
            />
            {selectedImage.caption && (
              <p className="text-white text-center mt-4">{selectedImage.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

