"use client";

import { Button } from "@crowdstack/ui";
import { Share2 } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text?: string;
  url: string;
  label?: string;
  compact?: boolean; // Smaller size for inline layout
}

export function ShareButton({ title, text, url, label = "Share", compact = false }: ShareButtonProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  if (compact) {
    return (
      <button
        onClick={handleShare}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-border text-foreground-muted hover:text-foreground hover:border-primary/50 transition-all text-sm font-medium"
      >
        <Share2 className="h-4 w-4" />
        {label}
      </button>
    );
  }

  return (
    <Button variant="secondary" size="lg" onClick={handleShare}>
      <Share2 className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
