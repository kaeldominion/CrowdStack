"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Image as ImageIcon, FileText, Share2, Loader2, Link2, Check, X } from "lucide-react";
import { useFlierToggle } from "./MobileFlierExperience";

interface MobileStickyCTAProps {
  href: string;
  label: string;
  eventName: string;
  shareUrl?: string;
  shareTitle?: string;
  shareText?: string;
  shareImageUrl?: string; // Optional image URL for Instagram Stories sharing
}

// Helper to fetch image and convert to File for sharing
async function fetchImageAsFile(imageUrl: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    const mimeType = blob.type || "image/png";
    const extension = mimeType.split("/")[1] || "png";
    
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
}: MobileStickyCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const flierState = useFlierToggle();
  const menuRef = useRef<HTMLDivElement>(null);

  // Check if we have a flier toggle (event has a flier)
  const hasFlierToggle = flierState.showFlier !== null && flierState.onToggle !== null;

  useEffect(() => {
    // Only show on mobile devices
    const checkMobile = () => {
      const isMobile = window.innerWidth < 1024; // lg breakpoint
      setIsVisible(isMobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close menu when clicking outside
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
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
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
    if (!shareUrl) return;
    
    if (!navigator.share) {
      handleCopyLink();
      return;
    }

    setLoadingAction("link");
    try {
      await navigator.share({
        title: shareTitle || eventName,
        text: shareText,
        url: shareUrl,
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
      const imageFile = await fetchImageAsFile(
        shareImageUrl, 
        (shareTitle || eventName).replace(/[^a-zA-Z0-9]/g, "-")
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

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 lg:hidden max-w-[calc(100vw-2rem)]">
      {/* Share Menu Popup */}
      {showShareMenu && shareUrl && (
        <div 
          ref={menuRef}
          className="absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-white/20 backdrop-blur-xl bg-black/90 shadow-2xl shadow-black/50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
            <span className="text-sm font-medium text-white">Share</span>
            <button 
              onClick={() => setShowShareMenu(false)}
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
            {shareImageUrl && (
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
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {/* Share Button */}
        {shareUrl && (
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            className="flex items-center justify-center h-11 w-11 rounded-full flex-shrink-0
                       bg-black/70 backdrop-blur-md
                       text-white
                       shadow-lg shadow-black/30
                       border border-white/20
                       hover:bg-black/80 hover:scale-105 
                       active:scale-95
                       transition-all duration-200"
            aria-label="Share event"
            title="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>
        )}

        {/* Flier Toggle Button - Only show when event has a flier */}
        {hasFlierToggle && (
          <button
            onClick={flierState.onToggle!}
            className="flex items-center justify-center h-11 w-11 rounded-full flex-shrink-0
                       bg-black/70 backdrop-blur-md
                       text-white
                       shadow-lg shadow-black/30
                       border border-white/20
                       hover:bg-black/80 hover:scale-105 
                       active:scale-95
                       transition-all duration-200"
            aria-label={flierState.showFlier ? "View event details" : "View flier"}
            title={flierState.showFlier ? "View details" : "View flier"}
          >
            {flierState.showFlier ? (
              <FileText className="h-4 w-4" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Register Now Button */}
        <Link 
          href={href} 
          className="flex items-center gap-2 px-4 py-3 rounded-full 
                     bg-gradient-to-r from-indigo-600 to-purple-600 
                     text-white font-semibold text-sm
                     shadow-lg shadow-indigo-500/40
                     border border-white/20
                     backdrop-blur-sm
                     whitespace-nowrap
                     hover:shadow-xl hover:shadow-indigo-500/50 
                     hover:scale-105 
                     active:scale-95
                     transition-all duration-200"
        >
          {label}
          <ArrowRight className="h-4 w-4 flex-shrink-0" />
        </Link>
      </div>
    </div>
  );
}
