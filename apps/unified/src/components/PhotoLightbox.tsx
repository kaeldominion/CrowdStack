"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Download, Share2, Instagram, Heart, MessageCircle } from "lucide-react";
import { InlineSpinner } from "@crowdstack/ui";
import { PhotoComments } from "./PhotoComments";

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
  const [showComments, setShowComments] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [likeLoading, setLikeLoading] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const viewTrackedRef = useRef<Set<string>>(new Set());

  const currentPhoto = photos[currentIndex];

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Load likes when photo changes
  useEffect(() => {
    loadLikes();
    trackView();
  }, [currentIndex]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/status");
      const data = await response.json();
      setIsLoggedIn(data.isAuthenticated);
      setUserId(data.userId);
    } catch (error) {
      // Assume not logged in if check fails
      setIsLoggedIn(false);
    }
  };

  const loadLikes = async () => {
    try {
      const response = await fetch(`/api/photos/${currentPhoto.id}/likes`);
      const data = await response.json();
      if (response.ok) {
        setLikeCount(data.count || 0);
        setIsLiked(data.isLiked || false);
      }
    } catch (error) {
      console.error("Error loading likes:", error);
    }
  };

  const trackView = async () => {
    // Only track once per session per photo
    if (viewTrackedRef.current.has(currentPhoto.id)) return;
    viewTrackedRef.current.add(currentPhoto.id);

    try {
      await fetch(`/api/photos/${currentPhoto.id}/view`, { method: "POST" });
    } catch (error) {
      // Silent fail for view tracking
    }
  };

  const handleLike = async () => {
    if (!isLoggedIn || likeLoading) return;

    try {
      setLikeLoading(true);
      const response = await fetch(`/api/photos/${currentPhoto.id}/likes`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        setIsLiked(data.isLiked);
        setLikeCount(data.count);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLikeLoading(false);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showComments) {
          setShowComments(false);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, showComments]);

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
    setShowComments(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setImageLoaded(false);
    setShowComments(false);
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
      // Track download
      const response = await fetch(`/api/photos/${currentPhoto.id}/download`, {
        method: "POST",
      });
      
      let downloadUrl = currentPhoto.url;
      if (response.ok) {
        const data = await response.json();
        downloadUrl = data.download_url || currentPhoto.url;
      }

      // Perform download
      const downloadResponse = await fetch(downloadUrl);
      const blob = await downloadResponse.blob();
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
      className="fixed inset-0 z-50 bg-black/95 flex flex-col lg:flex-row"
      onClick={onClose}
    >
      {/* Main photo area */}
      <div className={`flex-1 flex items-center justify-center relative ${showComments ? "lg:pr-80" : ""}`}>
        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClose();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClose();
          }}
          className="absolute top-4 right-4 z-50 p-3 rounded-full bg-black/70 hover:bg-black/90 text-white transition-colors touch-manipulation"
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
              className="absolute right-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors lg:right-4"
              style={{ right: showComments ? undefined : undefined }}
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
            className={`max-w-full object-contain ${showComments ? "max-h-[50vh] lg:max-h-[90vh]" : "max-h-[90vh]"}`}
            onLoad={() => setImageLoaded(true)}
            style={{ display: imageLoaded ? "block" : "none" }}
          />
        </div>

        {/* Photo counter */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-black/50 text-white text-sm font-mono">
          {currentIndex + 1} / {photos.length}
        </div>

        {/* Action buttons */}
        <div className={`absolute z-10 flex items-center gap-2 lg:gap-3 ${showComments ? "bottom-2 lg:bottom-4" : "bottom-4"} left-1/2 transform -translate-x-1/2`}>
          {/* Like button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            disabled={!isLoggedIn || likeLoading}
            className={`p-2.5 lg:p-3 rounded-full transition-colors flex items-center gap-1.5 lg:gap-2 ${
              isLiked
                ? "bg-accent-error text-white"
                : "bg-black/50 hover:bg-black/70 text-white"
            } ${!isLoggedIn ? "opacity-50 cursor-not-allowed" : ""}`}
            title={isLoggedIn ? (isLiked ? "Unlike" : "Like") : "Log in to like"}
          >
            {likeLoading ? (
              <InlineSpinner size="sm" />
            ) : (
              <Heart className={`h-4 w-4 lg:h-5 lg:w-5 ${isLiked ? "fill-current" : ""}`} />
            )}
            {likeCount > 0 && (
              <span className="text-xs lg:text-sm">{likeCount}</span>
            )}
          </button>

          {/* Comments toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(!showComments);
            }}
            className={`p-2.5 lg:p-3 rounded-full transition-colors flex items-center gap-1.5 lg:gap-2 ${
              showComments
                ? "bg-accent-secondary text-white"
                : "bg-black/50 hover:bg-black/70 text-white"
            }`}
            title="Comments"
          >
            <MessageCircle className="h-4 w-4 lg:h-5 lg:w-5" />
            {commentCount > 0 && (
              <span className="text-xs lg:text-sm">{commentCount}</span>
            )}
          </button>

          {/* Download */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            className="p-2.5 lg:p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4 lg:h-5 lg:w-5" />
          </button>

          {/* Instagram Share */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShareToInstagram();
            }}
            className="p-2.5 lg:p-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white transition-colors"
            title="Share to Instagram Stories"
          >
            <Instagram className="h-4 w-4 lg:h-5 lg:w-5" />
          </button>

          {/* Share */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="p-2.5 lg:p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            title="Share"
          >
            <Share2 className="h-4 w-4 lg:h-5 lg:w-5" />
          </button>
        </div>

        {/* Caption */}
        {currentPhoto.caption && !showComments && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10 max-w-md px-4 py-2 rounded-lg bg-black/50 text-white text-sm text-center">
            {currentPhoto.caption}
          </div>
        )}
      </div>

      {/* Comments panel - Bottom sheet on mobile, sidebar on desktop */}
      {showComments && (
        <div
          className="h-[50vh] lg:h-auto lg:w-80 bg-void/95 backdrop-blur-md border-t lg:border-t-0 lg:border-l border-border-subtle flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile handle */}
          <div className="lg:hidden flex justify-center py-2">
            <div className="w-12 h-1 bg-border-subtle rounded-full" />
          </div>
          
          <div className="px-4 py-3 lg:p-4 border-b border-border-subtle flex items-center justify-between">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">Comments</h3>
            <button
              onClick={() => setShowComments(false)}
              className="p-1.5 rounded-full bg-raised text-muted hover:text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-hidden">
            <PhotoComments
              photoId={currentPhoto.id}
              isLoggedIn={isLoggedIn}
              currentUserId={userId}
              onCommentCountChange={setCommentCount}
            />
          </div>
        </div>
      )}
    </div>
  );
}
