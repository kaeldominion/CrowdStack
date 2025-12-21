"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Download, Share2, Instagram } from "lucide-react";
import { InlineSpinner } from "@crowdstack/ui";

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string;
  caption: string | null;
  width: number | null;
  height: number | null;
}

interface PhotoLightboxProps {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  eventName: string;
  eventSlug: string;
}

export function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
  eventName,
  eventSlug,
}: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentPhoto = photos[currentIndex];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setImageLoaded(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setImageLoaded(false);
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentPhoto.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `photo-${currentPhoto.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading photo:", error);
      alert("Failed to download photo");
    }
  };

  const handleShareToInstagram = async () => {
    try {
      // Create a canvas with the photo and branding
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Load the image
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = currentPhoto.url;
      });

      // Set canvas size (Instagram Stories: 1080x1920)
      const targetWidth = 1080;
      const targetHeight = 1920;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Calculate image dimensions to fit canvas while maintaining aspect ratio
      const imgAspect = img.width / img.height;
      const canvasAspect = targetWidth / targetHeight;

      let drawWidth = targetWidth;
      let drawHeight = targetHeight;
      let drawX = 0;
      let drawY = 0;

      if (imgAspect > canvasAspect) {
        // Image is wider - fit to height
        drawHeight = targetHeight;
        drawWidth = drawHeight * imgAspect;
        drawX = (targetWidth - drawWidth) / 2;
      } else {
        // Image is taller - fit to width
        drawWidth = targetWidth;
        drawHeight = drawWidth / imgAspect;
        drawY = (targetHeight - drawHeight) / 2;
      }

      // Fill background with black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Draw image
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // Add branding overlay at bottom
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, targetHeight - 200, targetWidth, 200);

      // Add event name
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 48px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(eventName, targetWidth / 2, targetHeight - 120);

      // Add "View More" text
      ctx.font = "32px Inter, sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("View more photos", targetWidth / 2, targetHeight - 60);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) return;

        // Create shareable file
        const file = new File([blob], `photo-${currentPhoto.id}.png`, {
          type: "image/png",
        });

        // Use Web Share API if available
        if (navigator.share && navigator.canShare({ files: [file] })) {
          navigator.share({
            files: [file],
            title: `${eventName} - Photos`,
            text: `Check out photos from ${eventName}!`,
          }).catch((err) => {
            console.log("Share cancelled or failed:", err);
            // Fallback to download
            handleDownload();
          });
        } else {
          // Fallback: download the image
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `photo-${currentPhoto.id}-instagram.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } catch (error) {
      console.error("Error creating Instagram share:", error);
      // Fallback to regular share
      handleShare();
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/p/${eventSlug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${eventName} - Photos`,
          text: `Check out photos from ${eventName}!`,
          url,
        });
      } catch (err) {
        // User cancelled
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation buttons */}
      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrevious();
            }}
            className="absolute left-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Photo container */}
      <div
        className="relative max-w-full max-h-full flex items-center justify-center px-4"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <InlineSpinner size="lg" className="text-white" />
          </div>
        )}
        <img
          ref={imageRef}
          src={currentPhoto.url}
          alt={currentPhoto.caption || `Photo ${currentIndex + 1}`}
          className="max-w-full max-h-[90vh] object-contain"
          onLoad={() => setImageLoaded(true)}
          style={{ display: imageLoaded ? "block" : "none" }}
        />
      </div>

      {/* Photo counter */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-black/50 text-white text-sm">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          title="Download"
        >
          <Download className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleShareToInstagram();
          }}
          className="p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-colors"
          title="Share to Instagram Stories"
        >
          <Instagram className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          className="p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          title="Share"
        >
          <Share2 className="h-5 w-5" />
        </button>
      </div>

      {/* Caption */}
      {currentPhoto.caption && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10 max-w-md px-4 py-2 rounded-lg bg-black/50 text-white text-sm text-center">
          {currentPhoto.caption}
        </div>
      )}
    </div>
  );
}

