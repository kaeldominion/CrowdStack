"use client";

import { Button } from "@crowdstack/ui";
import { Share2 } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text?: string;
  url: string;
  label?: string;
}

export function ShareButton({ title, text, url, label = "Share" }: ShareButtonProps) {
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

  return (
    <Button variant="secondary" size="lg" onClick={handleShare}>
      <Share2 className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}

