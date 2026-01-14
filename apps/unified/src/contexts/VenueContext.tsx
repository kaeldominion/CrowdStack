"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@crowdstack/ui";

interface Venue {
  id: string;
  name: string;
  slug: string | null;
}

interface VenueContextType {
  // State
  venues: Venue[];
  selectedVenueId: string | null;
  selectedVenue: Venue | null;
  isLoading: boolean;
  isInitialized: boolean;

  // A version number that increments every time the venue changes
  // Components can use this in useEffect dependencies to reload data
  venueVersion: number;

  // Actions
  switchVenue: (venueId: string) => Promise<void>;
  refreshVenues: () => Promise<void>;
}

const VenueContext = createContext<VenueContextType | undefined>(undefined);

interface VenueProviderProps {
  children: ReactNode;
}

export function VenueProvider({ children }: VenueProviderProps) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [venueVersion, setVenueVersion] = useState(0);

  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  // Load venues and selected venue on mount
  const loadVenues = useCallback(async () => {
    try {
      setIsLoading(true);
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
      console.error("[VenueContext] Error loading venues:", error);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadVenues();
  }, [loadVenues]);

  // Switch venue
  const switchVenue = useCallback(async (venueId: string) => {
    if (venueId === selectedVenueId) {
      return; // No change needed
    }

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

      // Update local state FIRST
      setSelectedVenueId(venueId);

      // Increment version to signal all consumers to reload their data
      // This triggers useEffect in components like UnifiedDashboard
      setVenueVersion((v) => v + 1);

      // If we're on a venue-specific page, update URL for bookmarkability
      // But DON'T call router.refresh() as it interferes with React state updates
      if (pathname?.startsWith("/app/venue")) {
        const url = new URL(window.location.href);
        url.searchParams.set("venueId", venueId);
        // Use replace to avoid adding to history for every venue switch
        window.history.replaceState(null, "", url.pathname + url.search);
      }
      // Note: We don't call router.refresh() anymore - the venueVersion change
      // will trigger useEffects in components to reload their data

      const venueName = venues.find(v => v.id === venueId)?.name || "venue";
      toast.success("Venue Switched", `Switched to ${venueName}`);
    } catch (error: any) {
      console.error("[VenueContext] Error switching venue:", error);
      toast.error("Error", error.message || "Failed to switch venue.");
      throw error;
    }
  }, [selectedVenueId, pathname, router, venues, toast]);

  // Refresh venues (useful after creating/deleting venues)
  const refreshVenues = useCallback(async () => {
    await loadVenues();
  }, [loadVenues]);

  // Get the full venue object
  const selectedVenue = venues.find((v) => v.id === selectedVenueId) || null;

  const value: VenueContextType = {
    venues,
    selectedVenueId,
    selectedVenue,
    isLoading,
    isInitialized,
    venueVersion,
    switchVenue,
    refreshVenues,
  };

  return (
    <VenueContext.Provider value={value}>
      {children}
    </VenueContext.Provider>
  );
}

export function useVenue() {
  const context = useContext(VenueContext);
  if (context === undefined) {
    throw new Error("useVenue must be used within a VenueProvider");
  }
  return context;
}

/**
 * Hook that returns true only when venue context is fully initialized
 * and we have venue data. Useful for components that need to wait for venue selection.
 */
export function useVenueReady() {
  const { isInitialized, selectedVenueId, venues } = useVenue();
  return isInitialized && (venues.length === 0 || selectedVenueId !== null);
}
