"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Image as ImageIcon, FileText, Share2, Link2, Check, X, Video, QrCode, Ticket } from "lucide-react";
import { InlineSpinner } from "@crowdstack/ui";
import { useFlierToggle } from "./MobileFlierExperience";

interface MobileStickyCTAProps {
  href: string;
  label: string;
  eventName: string;
  shareUrl?: string;
  shareTitle?: string;
  shareText?: string;
  shareImageUrl?: string;
  shareVideoUrl?: string;
  userId?: string;
  isRegistered?: boolean;
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

export function MobileStickyCTA({ 
  href, 
  label, 
  eventName,
  shareUrl,
  shareTitle,
  shareText,
  shareImageUrl,
  shareVideoUrl,
  userId,
  isRegistered = false,
}: MobileStickyCTAProps) {
  const getShareUrl = () => {
    if (!shareUrl || !userId) return shareUrl || "";
    const urlObj = new URL(shareUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    urlObj.searchParams.set("ref", userId);
    return urlObj.toString();
  };

  const finalShareUrl = getShareUrl();
  const [isVisible, setIsVisible] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const flierState = useFlierToggle();
  const menuRef = useRef<HTMLDivElement>(null);

  const hasFlierToggle = flierState.showFlier !== null && flierState.onToggle !== null;

  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 1024;
      setIsVisible(isMobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showShareMenu]);

  const handleCopyLink = async () => {
    if (!finalShareUrl) return;
    try {
      await navigator.clipboard.writeText(finalShareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareMenu(false);
      }, 1500);
    } catch {
      // Clipboard failed
    }
  };

  const handleShareLink = async () => {
    if (!finalShareUrl) return;
    
    if (!navigator.share) {
      handleCopyLink();
      return;
    }

    setLoadingAction("link");
    try {
      await navigator.share({
        title: shareTitle || eventName,
        text: shareText,
        url: finalShareUrl,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError" && error.name !== "NotAllowedError") {
        handleCopyLink();
      }
    } finally {
      setLoadingAction(null);
      setShowShareMenu(false);
    }
  };

  const handleShareImage = async () => {
    if (!shareImageUrl || !navigator.share || !navigator.canShare) {
      return;
    }

    setLoadingAction("image");
    try {
      const imageFile = await fetchMediaAsFile(
        shareImageUrl, 
        (shareTitle || eventName).replace(/[^a-zA-Z0-9]/g, "-"),
        false
      );
      
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
      setShowShareMenu(false);
    }
  };

  const handleShareVideo = async () => {
    if (!shareVideoUrl || !navigator.share || !navigator.canShare) {
      return;
    }

    setLoadingAction("video");
    try {
      const videoFile = await fetchMediaAsFile(
        shareVideoUrl, 
        (shareTitle || eventName).replace(/[^a-zA-Z0-9]/g, "-"),
        true
      );
      
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
      setShowShareMenu(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden max-w-[calc(100vw-2rem)]">
      {/* Share Menu Popup - Design System */}
      {showShareMenu && finalShareUrl && (
        <div 
          ref={menuRef}
          className="absolute bottom-full left-0 mb-2 w-56 rounded-2xl border border-border-subtle backdrop-blur-xl bg-glass/95 shadow-soft overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <span className="font-sans text-sm font-bold uppercase tracking-wider text-primary">Share</span>
            <button 
              onClick={() => setShowShareMenu(false)}
              className="p-1 rounded-full hover:bg-active transition-colors"
            >
              <X className="h-4 w-4 text-muted" />
            </button>
          </div>

          {/* Options */}
          <div className="py-1">
            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-secondary hover:text-primary hover:bg-active transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-accent-secondary/20 flex items-center justify-center">
                {copied ? (
                  <Check className="h-4 w-4 text-accent-success" />
                ) : (
                  <Link2 className="h-4 w-4 text-accent-secondary" />
                )}
              </div>
              <div className="text-left">
                <p className="font-medium">{copied ? "Copied!" : "Copy Link"}</p>
                <p className="text-xs text-muted">Paste anywhere</p>
              </div>
            </button>

            {/* Share Link */}
            <button
              onClick={handleShareLink}
              disabled={loadingAction === "link"}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm text-secondary hover:text-primary hover:bg-active transition-colors disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                {loadingAction === "link" ? (
                  <InlineSpinner size="md" />
                ) : (
                  <Share2 className="h-4 w-4 text-accent-primary" />
                )}
              </div>
              <div className="text-left">
                <p className="font-medium">Share Link</p>
                <p className="text-xs text-muted">WhatsApp, Messages, Email</p>
              </div>
            </button>

            {/* Share Image */}
            {shareImageUrl && (
              <button
                onClick={handleShareImage}
                disabled={loadingAction === "image"}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-secondary hover:text-primary hover:bg-active transition-colors disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-lg bg-accent-secondary/20 flex items-center justify-center">
                  {loadingAction === "image" ? (
                    <InlineSpinner size="md" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-accent-secondary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium">Share Image</p>
                  <p className="text-xs text-muted">Instagram, Snapchat</p>
                </div>
              </button>
            )}

            {/* Share Video */}
            {shareVideoUrl && (
              <button
                onClick={handleShareVideo}
                disabled={loadingAction === "video"}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-secondary hover:text-primary hover:bg-active transition-colors disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-lg bg-accent-primary/20 flex items-center justify-center">
                  {loadingAction === "video" ? (
                    <InlineSpinner size="md" />
                  ) : (
                    <Video className="h-4 w-4 text-accent-primary" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-medium">Share Video</p>
                  <p className="text-xs text-muted">Instagram, TikTok</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Share Button */}
        {finalShareUrl && (
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="flex items-center justify-center h-12 w-12 rounded-full flex-shrink-0
                       bg-void/80 backdrop-blur-xl
                       text-primary
                       shadow-soft
                       border border-border-subtle
                       hover:border-border-strong hover:scale-105 
                       active:scale-95
                       transition-all duration-200"
            aria-label="Share event"
          >
            <Share2 className="h-5 w-5" />
          </button>
        )}

        {/* Flier Toggle Button */}
        {hasFlierToggle && (
          <button
            onClick={flierState.onToggle!}
            className="flex items-center justify-center h-12 w-12 rounded-full flex-shrink-0
                       bg-void/80 backdrop-blur-xl
                       text-primary
                       shadow-soft
                       border border-border-subtle
                       hover:border-border-strong hover:scale-105 
                       active:scale-95
                       transition-all duration-200"
            aria-label={flierState.showFlier ? "View event details" : "View flier"}
          >
            {flierState.showFlier ? (
              <FileText className="h-5 w-5" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )}
          </button>
        )}

        {/* Register / View Pass Button */}
        <Link 
          href={href} 
          className={`flex items-center gap-2 px-5 py-3.5 rounded-full 
                     font-mono text-[11px] font-bold uppercase tracking-wider
                     border
                     backdrop-blur-sm
                     whitespace-nowrap
                     hover:scale-105 
                     active:scale-95
                     transition-all duration-200
                     ${isRegistered 
                       ? 'bg-gradient-to-r from-accent-success to-emerald-500 border-accent-success/50 text-void shadow-lg shadow-accent-success/30' 
                       : 'bg-gradient-to-r from-accent-secondary to-accent-primary border-accent-primary/50 text-void shadow-lg shadow-accent-primary/30'
                     }`}
        >
          {isRegistered ? (
            <>
              <QrCode className="h-4 w-4 flex-shrink-0" />
              {label}
            </>
          ) : (
            <>
              <Ticket className="h-4 w-4 flex-shrink-0" />
              {label}
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
