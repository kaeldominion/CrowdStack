"use client";

import { useState, useEffect } from "react";
import { Button } from "@crowdstack/ui";
import { Star } from "lucide-react";

interface FavoriteButtonProps {
  venueId: string;
  className?: string;
}

export function FavoriteButton({ venueId, className = "" }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);

  // Check favorite status on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const response = await fetch(`/api/venues/${venueId}/favorite`);
        if (response.ok) {
          const data = await response.json();
          setIsFavorited(data.favorited || false);
        }
      } catch (error) {
        console.error("Error checking favorite status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (venueId) {
      checkFavoriteStatus();
    }
  }, [venueId]);

  const handleToggle = async () => {
    if (isToggling || isLoading) return;

    setIsToggling(true);
    const wasFavorited = isFavorited;
    
    // Optimistically update UI
    setIsFavorited(!wasFavorited);

    try {
      const method = wasFavorited ? "DELETE" : "POST";
      const response = await fetch(`/api/venues/${venueId}/favorite`, {
        method,
      });

      if (!response.ok) {
        // Revert on error
        setIsFavorited(wasFavorited);
        throw new Error("Failed to update favorite");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Revert on error
      setIsFavorited(wasFavorited);
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return null; // Don't show button while loading
  }

  return (
    <Button
      variant="secondary"
      size="lg"
      onClick={handleToggle}
      disabled={isToggling}
      className={className}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Star
        className={`h-4 w-4 transition-all ${
          isFavorited
            ? "fill-yellow-400 text-yellow-400"
            : "text-white/60"
        }`}
      />
    </Button>
  );
}

