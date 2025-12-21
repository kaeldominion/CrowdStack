"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@crowdstack/ui";
import { Share2, Loader2, Link2, Image as ImageIcon, Video, Check, X } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text?: string;
  url: string;
  imageUrl?: string; // Optional image URL (e.g., event flier) for Instagram Stories
  videoUrl?: string; // Optional video URL for sharing video fliers
  label?: string;
  compact?: boolean; // Smaller size for inline layout
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
  compact = false 
}: ShareButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
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
      await navigator.share({ title, text, url });
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

  const menuContent = (
    <div 
      ref={menuRef}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl border border-white/20 backdrop-blur-xl bg-black/90 shadow-2xl shadow-black/50 overflow-hidden z-50"
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
            <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
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
              <Loader2 className="h-5 w-5 animate-spin text-pink-400" />
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
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
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
  );

  if (compact) {
    return (
      <div className="relative flex-1">
      <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-border text-foreground-muted hover:text-foreground hover:border-primary/50 transition-all text-sm font-medium disabled:opacity-50"
      >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
        <Share2 className="h-4 w-4" />
          )}
        {label}
      </button>
        {showMenu && menuContent}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button variant="secondary" size="lg" onClick={() => setShowMenu(!showMenu)} disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
      <Share2 className="h-4 w-4 mr-2" />
        )}
      {label}
    </Button>
      {showMenu && menuContent}
    </div>
  );
}
