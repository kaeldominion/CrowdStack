"use client";

import { useState } from "react";
import { Button } from "@crowdstack/ui";
import { Share2, Loader2 } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text?: string;
  url: string;
  imageUrl?: string; // Optional image URL (e.g., event flier) for Instagram Stories
  label?: string;
  compact?: boolean; // Smaller size for inline layout
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

export function ShareButton({ 
  title, 
  text, 
  url, 
  imageUrl,
  label = "Share", 
  compact = false 
}: ShareButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = async () => {
    if (!navigator.share) {
      // Fallback to clipboard for browsers without Web Share API
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
      } catch {
        // If clipboard also fails, do nothing
      }
      return;
    }

    setIsLoading(true);

    try {
      // Build share data
      const shareData: ShareData = {
        title,
        text,
        url,
      };

      // If we have an image URL, try to include it as a file
      // This enables sharing to Instagram Stories and other media-focused apps
      if (imageUrl && navigator.canShare) {
        const imageFile = await fetchImageAsFile(imageUrl, title.replace(/[^a-zA-Z0-9]/g, "-"));
        
        if (imageFile) {
          const shareDataWithFile = { ...shareData, files: [imageFile] };
          
          // Check if the browser supports sharing files
          if (navigator.canShare(shareDataWithFile)) {
            await navigator.share(shareDataWithFile);
            setIsLoading(false);
            return;
          }
        }
      }

      // Fallback to sharing without file
      await navigator.share(shareData);
    } catch (error: unknown) {
      // Handle different error types gracefully
      if (error instanceof Error) {
        // AbortError = user cancelled, NotAllowedError = permission denied
        if (error.name === "AbortError" || error.name === "NotAllowedError") {
          setIsLoading(false);
          return; // Silently ignore cancellations
        }
        
        console.warn("Share failed, falling back to clipboard:", error.message);
      }
      
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
      } catch {
        // If clipboard also fails, do nothing
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleShare}
        disabled={isLoading}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-border text-foreground-muted hover:text-foreground hover:border-primary/50 transition-all text-sm font-medium disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
        {label}
      </button>
    );
  }

  return (
    <Button variant="secondary" size="lg" onClick={handleShare} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Share2 className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );
}
