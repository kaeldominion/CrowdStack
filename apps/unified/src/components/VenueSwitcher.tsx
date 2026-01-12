"use client";

import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@crowdstack/ui";

interface Venue {
  id: string;
  name: string;
  slug: string | null;
}

interface VenueSwitcherProps {
  className?: string;
}

export function VenueSwitcher({ className }: VenueSwitcherProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      setLoading(true);
      const [venuesResponse, selectedResponse] = await Promise.all([
        fetch("/api/venue/list"),
        fetch("/api/venue/select"),
      ]);

      if (venuesResponse.ok) {
        const venuesData = await venuesResponse.json();
        setVenues(venuesData.venues || []);
      }

      if (selectedResponse.ok) {
        const selectedData = await selectedResponse.json();
        setSelectedVenueId(selectedData.venueId || null);
      }
    } catch (error) {
      console.error("Error loading venues:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVenueChange = async (venueId: string) => {
    try {
      const response = await fetch("/api/venue/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to switch venue");
      }

      setSelectedVenueId(venueId);
      
      // If we're on a venue-specific page, update URL with venueId query param and refresh
      if (pathname?.startsWith("/app/venue")) {
        // Update URL to include venueId query param for pages that support it
        const url = new URL(window.location.href);
        url.searchParams.set("venueId", venueId);
        router.push(url.pathname + url.search);
        router.refresh();
      } else {
        // For other pages, just refresh
        router.refresh();
      }

      toast.success("Venue Switched", "You've switched to a different venue.");
    } catch (error: any) {
      console.error("Error switching venue:", error);
      toast.error("Error", error.message || "Failed to switch venue.");
    }
  };

  // Don't show if user only has one venue
  if (venues.length <= 1) {
    return null;
  }

  const selectedVenue = venues.find((v) => v.id === selectedVenueId) || venues[0];

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Building2 className="h-4 w-4 text-secondary" />
        <span className="text-sm text-secondary">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Building2 className="h-4 w-4 text-secondary" />
      <select
        value={selectedVenue?.id || ""}
        onChange={(e) => handleVenueChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg bg-void border border-border-subtle text-sm text-primary focus:outline-none focus:border-accent-primary/50 focus:ring-2 focus:ring-accent-primary/20"
      >
        {venues.map((venue) => (
          <option key={venue.id} value={venue.id}>
            {venue.name}
          </option>
        ))}
      </select>
    </div>
  );
}

