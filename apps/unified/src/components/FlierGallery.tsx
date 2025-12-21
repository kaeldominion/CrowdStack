"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@crowdstack/ui";
import { ChevronLeft, ChevronRight, X, Download } from "lucide-react";

interface FlierGalleryProps {
  flierUrl: string | null;
  coverImageUrl: string | null;
  eventName: string;
}

export function FlierGallery({ flierUrl, coverImageUrl, eventName }: FlierGalleryProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Collect all available images
  const images = [
    flierUrl && { url: flierUrl, type: "Flier" },
    coverImageUrl && { url: coverImageUrl, type: "Cover" },
  ].filter(Boolean) as Array<{ url: string; type: string }>;

  // Don't render if no images
  if (images.length === 0) {
    return null;
  }

  const currentImage = images[currentImageIndex];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const downloadImage = () => {
    const link = document.createElement("a");
    link.href = currentImage.url;
    link.download = `${eventName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${currentImage.type.toLowerCase()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Thumbnail Gallery */}
      <div className="grid grid-cols-2 gap-3">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => {
              setCurrentImageIndex(index);
              setIsLightboxOpen(true);
            }}
            className={`group relative overflow-hidden rounded-lg bg-surface border-2 border-border hover:border-primary transition-colors ${
              image.type === "Flier" ? "aspect-[9/16]" : "aspect-[4/3]"
            }`}
          >
            <Image
              src={image.url}
              alt={`${image.type} for ${eventName}`}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
              <p className="text-white text-xs font-medium">{image.type}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh]">
            {/* Close Button */}
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Image */}
            <div className={`relative w-full max-h-[90vh] bg-black rounded-lg overflow-hidden flex items-center justify-center ${
              currentImage.type === "Flier" ? "aspect-[9/16] max-w-sm" : "aspect-[4/3]"
            }`}>
              <Image
                src={currentImage.url}
                alt={`${currentImage.type} for ${eventName}`}
                fill
                className="object-contain"
                sizes="90vw"
              />
            </div>

            {/* Controls */}
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image Info & Download */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black/50 backdrop-blur-sm rounded-lg p-3">
              <p className="text-white font-medium">{currentImage.type}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage();
                }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-sm bg-surface text-foreground border border-border hover:bg-surface/80 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>

            {/* Image Counter */}
            {images.length > 1 && (
              <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
                <p className="text-white text-sm">
                  {currentImageIndex + 1} / {images.length}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

