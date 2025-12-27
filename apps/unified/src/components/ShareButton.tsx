"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  iconOnly?: boolean; // Minimal circular icon button
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
  iconOnly = false,
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
        className="fixed inset-0 z-[100] bg-void/80 backdrop-blur-sm"
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(false);
        }}
      />
      <div 
        ref={menuRef}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 rounded-2xl border border-border-strong backdrop-blur-xl bg-glass/95 shadow-soft overflow-hidden z-[110]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
          <span className="font-sans text-sm font-bold uppercase tracking-wider text-primary">Share</span>
          <button 
            onClick={() => setShowMenu(false)}
            className="p-1.5 rounded-lg hover:bg-active transition-colors"
          >
            <X className="h-4 w-4 text-muted" />
          </button>
        </div>

        {/* Options */}
        <div className="p-2 space-y-1">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-accent-secondary/20 flex items-center justify-center">
              {copied ? (
                <Check className="h-4 w-4 text-accent-success" />
              ) : (
                <Link2 className="h-4 w-4 text-accent-secondary" />
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-primary">{copied ? "Copied!" : "Copy Link"}</p>
              <p className="text-xs text-muted">Paste anywhere</p>
            </div>
          </button>

          {/* Share Link */}
          <button
            onClick={handleShareLink}
            disabled={loadingAction === "link"}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-secondary hover:text-primary hover:bg-active transition-colors disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-lg bg-accent-primary/20 flex items-center justify-center">
              {loadingAction === "link" ? (
                <InlineSpinner size="sm" className="text-accent-primary" />
              ) : (
                <Share2 className="h-4 w-4 text-accent-primary" />
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold text-primary">Share Link</p>
              <p className="text-xs text-muted">WhatsApp, Messages, Email</p>
            </div>
          </button>

          {/* Share Image - Only show if imageUrl exists */}
          {imageUrl && (
            <button
              onClick={handleShareImage}
              disabled={loadingAction === "image"}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-secondary hover:text-primary hover:bg-active transition-colors disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-lg bg-pink-500/20 flex items-center justify-center">
                {loadingAction === "image" ? (
                  <InlineSpinner size="sm" className="text-pink-400" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-pink-400" />
                )}
              </div>
              <div className="text-left">
                <p className="font-semibold text-primary">Share Image</p>
                <p className="text-xs text-muted">Instagram Stories, Snapchat</p>
              </div>
            </button>
          )}

          {/* Share Video - Only show if videoUrl exists */}
          {videoUrl && (
            <button
              onClick={handleShareVideo}
              disabled={loadingAction === "video"}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm text-secondary hover:text-primary hover:bg-active transition-colors disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                {loadingAction === "video" ? (
                  <InlineSpinner size="sm" className="text-cyan-400" />
                ) : (
                  <Video className="h-4 w-4 text-cyan-400" />
                )}
              </div>
              <div className="text-left">
                <p className="font-semibold text-primary">Share Video</p>
                <p className="text-xs text-muted">Instagram Stories, TikTok</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </>
  ) : null;

  // Icon-only mode - minimal circular button
  if (iconOnly) {
    return (
      <div 
        className="relative" 
        ref={buttonRef}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          disabled={isLoading}
          className="w-8 h-8 rounded-full bg-glass/80 backdrop-blur-sm border border-border-subtle flex items-center justify-center text-secondary hover:text-primary hover:border-border-strong transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <InlineSpinner size="sm" />
          ) : (
            <Share2 className="h-3.5 w-3.5" />
          )}
        </button>
        {showMenu && typeof window !== 'undefined' && createPortal(menuContent, document.body)}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="relative flex-1" ref={buttonRef}>
      <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-glass border border-border text-secondary hover:text-primary hover:border-primary/50 transition-all text-sm font-medium disabled:opacity-50"
      >
          {isLoading ? (
            <InlineSpinner size="sm" />
          ) : (
        <Share2 className="h-4 w-4" />
          )}
        {label}
      </button>
        {showMenu && typeof window !== 'undefined' && createPortal(menuContent, document.body)}
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
      {showMenu && typeof window !== 'undefined' && createPortal(menuContent, document.body)}
    </div>
  );
}
