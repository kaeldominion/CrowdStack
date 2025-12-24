"use client";

import { useState, useRef, useEffect } from "react";
import { Button, InlineSpinner } from "@crowdstack/ui";
import { Share2, Link2, Image as ImageIcon, Video, Check, X } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text?: string;
  url: string;
  imageUrl?: string; // Optional image URL (e.g., event flier) for Instagram Stories
  videoUrl?: string; // Optional video URL for sharing video fliers
  label?: string;
  compact?: boolean; // Smaller size for inline layout
  userId?: string; // Optional user ID to append as ?ref= parameter for referral tracking
}

// Helper to fetch media and convert to File for sharing
async function fetchMediaAsFile(mediaUrl: string, filename: string, isVideo = false): Promise<File | null> {
  try {
    const response = await fetch(mediaUrl);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    const mimeType = blob.type || (isVideo ? "video/mp4" : "image/png");
    const extension = mimeType.split("/")[1] || (isVideo ? "mp4" : "png");
    
    return new File([blob], `${filename}.${extension}`, { type: mimeType });
  } catch {
    return null;
  }
}

export function ShareButton({ 
          title,
          text,
          url,
  imageUrl,
  videoUrl,
  label = "Share", 
  compact = false,
  userId,
}: ShareButtonProps) {
  // Append userId as ref parameter if provided
  const getShareUrl = () => {
    if (!userId) return url;
    const urlObj = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    urlObj.searchParams.set("ref", userId);
    return urlObj.toString();
  };

  const shareUrl = getShareUrl();
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  
  // Use centered modal instead of positioned menu
  // No need for position calculation - menu will be centered

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      // Use a small delay to prevent immediate closing when button is clicked
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
    return () => {};
  }, [showMenu]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 1500);
    } catch {
      // Clipboard failed
    }
  };

  const handleShareLink = async () => {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }

    setLoadingAction("link");
    try {
      await navigator.share({ title, text, url: shareUrl });
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError" && error.name !== "NotAllowedError") {
        handleCopyLink();
      }
    } finally {
      setLoadingAction(null);
      setShowMenu(false);
    }
  };

  const handleShareImage = async () => {
    if (!imageUrl || !navigator.share || !navigator.canShare) {
      return;
    }

    setLoadingAction("image");
    try {
      const imageFile = await fetchMediaAsFile(imageUrl, title.replace(/[^a-zA-Z0-9]/g, "-"), false);
      
      if (imageFile) {
        const shareData = { files: [imageFile] };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError" && error.name !== "NotAllowedError") {
        console.warn("Image share failed:", error.message);
      }
    } finally {
      setLoadingAction(null);
      setShowMenu(false);
    }
  };

  const handleShareVideo = async () => {
    if (!videoUrl || !navigator.share || !navigator.canShare) {
      return;
    }

    setLoadingAction("video");
    try {
      const videoFile = await fetchMediaAsFile(videoUrl, title.replace(/[^a-zA-Z0-9]/g, "-"), true);
      
      if (videoFile) {
        const shareData = { files: [videoFile] };
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError" && error.name !== "NotAllowedError") {
        console.warn("Video share failed:", error.message);
      }
    } finally {
      setLoadingAction(null);
      setShowMenu(false);
    }
  };

  const menuContent = showMenu ? (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(false);
        }}
      />
      <div 
        ref={menuRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 rounded-xl border border-white/20 backdrop-blur-xl bg-black/95 shadow-2xl shadow-black/50 overflow-hidden z-[110]"
      >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <span className="text-sm font-medium text-white">Share</span>
        <button 
          onClick={() => setShowMenu(false)}
          className="p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4 text-white/60" />
        </button>
      </div>

      {/* Options */}
      <div className="py-1">
        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
        >
          {copied ? (
            <Check className="h-5 w-5 text-green-400" />
          ) : (
            <Link2 className="h-5 w-5 text-blue-400" />
          )}
          <div className="text-left">
            <p className="font-medium">{copied ? "Copied!" : "Copy Link"}</p>
            <p className="text-xs text-white/50">Paste anywhere</p>
          </div>
        </button>

        {/* Share Link */}
        <button
          onClick={handleShareLink}
          disabled={loadingAction === "link"}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          {loadingAction === "link" ? (
            <InlineSpinner size="md" className="text-purple-400" />
          ) : (
            <Share2 className="h-5 w-5 text-purple-400" />
          )}
          <div className="text-left">
            <p className="font-medium">Share Link</p>
            <p className="text-xs text-white/50">WhatsApp, Messages, Email</p>
          </div>
        </button>

        {/* Share Image - Only show if imageUrl exists */}
        {imageUrl && (
          <button
            onClick={handleShareImage}
            disabled={loadingAction === "image"}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {loadingAction === "image" ? (
              <InlineSpinner size="md" className="text-pink-400" />
            ) : (
              <ImageIcon className="h-5 w-5 text-pink-400" />
            )}
            <div className="text-left">
              <p className="font-medium">Share Image</p>
              <p className="text-xs text-white/50">Instagram Stories, Snapchat</p>
            </div>
          </button>
        )}

        {/* Share Video - Only show if videoUrl exists */}
        {videoUrl && (
          <button
            onClick={handleShareVideo}
            disabled={loadingAction === "video"}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {loadingAction === "video" ? (
              <InlineSpinner size="md" className="text-cyan-400" />
            ) : (
              <Video className="h-5 w-5 text-cyan-400" />
            )}
            <div className="text-left">
              <p className="font-medium">Share Video</p>
              <p className="text-xs text-white/50">Instagram Stories, TikTok</p>
            </div>
          </button>
        )}
      </div>
    </div>
    </>
  ) : null;

  if (compact) {
    return (
      <div className="relative flex-1" ref={buttonRef}>
      <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-border text-foreground-muted hover:text-foreground hover:border-primary/50 transition-all text-sm font-medium disabled:opacity-50"
      >
          {isLoading ? (
            <InlineSpinner size="sm" />
          ) : (
        <Share2 className="h-4 w-4" />
          )}
        {label}
      </button>
        {showMenu && typeof window !== 'undefined' && menuContent}
      </div>
    );
  }

  return (
    <div 
      className="relative" 
      ref={buttonRef}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Button 
        variant="secondary" 
        size="lg" 
        onClick={() => {
          setShowMenu(!showMenu);
        }} 
        disabled={isLoading}
        aria-label={label || "Share"}
      >
        {isLoading ? (
          <InlineSpinner size="sm" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
      </Button>
      {showMenu && typeof window !== 'undefined' && menuContent}
    </div>
  );
}
