"use client";

import { useState, useEffect } from "react";
import { Select } from "@crowdstack/ui";
import { X } from "lucide-react";
import { Badge } from "@crowdstack/ui";

export interface BrowseFilters {
  search?: string;
  date?: string;
  city?: string;
  genre?: string;
  venue_id?: string;
}

interface BrowseFiltersProps {
  filters: BrowseFilters;
  onChange: (filters: BrowseFilters) => void;
}

export function BrowseFilters({ filters, onChange }: BrowseFiltersProps) {
  const [cities, setCities] = useState<{ value: string; label: string }[]>([]);
  const [genres, setGenres] = useState<{ value: string; label: string }[]>([]);
  const [venues, setVenues] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch filter options
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        // Fetch cities from venues
        const venuesRes = await fetch("/api/browse/venues?limit=1000");
        const venuesData = await venuesRes.json();
        
        // Extract unique cities
        const uniqueCities = Array.from(
          new Set(
            venuesData.venues
              ?.map((v: any) => v.city)
              .filter(Boolean) || []
          )
        ).sort() as string[];

        setCities(
          uniqueCities.map((city) => ({ value: city, label: city }))
        );

        // Extract unique genres from venue tags
        const allTags = venuesData.venues?.flatMap((v: any) => 
          v.tags?.filter((t: any) => t.tag_type === "music") || []
        ) || [];
        
        const uniqueGenres = Array.from(
          new Set(allTags.map((t: any) => t.tag_value))
        ).sort() as string[];

        setGenres(
          uniqueGenres.map((genre) => ({ value: genre, label: genre }))
        );

        // Set venues list
        setVenues(
          venuesData.venues?.map((v: any) => ({
            value: v.id,
            label: v.name,
          })) || []
        );
      } catch (error) {
        console.error("Error fetching filter options:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFilterOptions();
  }, []);

  const handleFilterChange = (key: keyof BrowseFilters, value: string) => {
    const newFilters = { ...filters };
    if (value === "") {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onChange(newFilters);
  };

  const clearFilter = (key: keyof BrowseFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onChange(newFilters);
  };

  const clearAll = () => {
    onChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  const dateOptions = [
    { value: "", label: "All Dates" },
    { value: "today", label: "Today" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Dropdowns */}
      <div className="grid grid-cols-1 gap-4">
        <Select
          label="Date"
          value={filters.date || ""}
          onChange={(e) => handleFilterChange("date", e.target.value)}
          options={dateOptions}
        />

        <Select
          label="City"
          value={filters.city || ""}
          onChange={(e) => handleFilterChange("city", e.target.value)}
          options={[
            { value: "", label: "All Cities" },
            ...cities,
          ]}
          disabled={loading}
        />

        <Select
          label="Genre"
          value={filters.genre || ""}
          onChange={(e) => handleFilterChange("genre", e.target.value)}
          options={[
            { value: "", label: "All Genres" },
            ...genres,
          ]}
          disabled={loading}
        />

        <Select
          label="Venue"
          value={filters.venue_id || ""}
          onChange={(e) => handleFilterChange("venue_id", e.target.value)}
          options={[
            { value: "", label: "All Venues" },
            ...venues,
          ]}
          disabled={loading}
        />
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
            Active Filters:
          </span>
          
          {filters.date && (
            <Badge
              color="blue"
              variant="outline"
              className="flex items-center gap-1.5 cursor-pointer hover:bg-accent-secondary/20"
              onClick={() => clearFilter("date")}
            >
              Date: {dateOptions.find((o) => o.value === filters.date)?.label || filters.date}
              <X className="h-3 w-3" />
            </Badge>
          )}

          {filters.city && (
            <Badge
              color="blue"
              variant="outline"
              className="flex items-center gap-1.5 cursor-pointer hover:bg-accent-secondary/20"
              onClick={() => clearFilter("city")}
            >
              City: {filters.city}
              <X className="h-3 w-3" />
            </Badge>
          )}

          {filters.genre && (
            <Badge
              color="blue"
              variant="outline"
              className="flex items-center gap-1.5 cursor-pointer hover:bg-accent-secondary/20"
              onClick={() => clearFilter("genre")}
            >
              Genre: {filters.genre}
              <X className="h-3 w-3" />
            </Badge>
          )}

          {filters.venue_id && (
            <Badge
              color="blue"
              variant="outline"
              className="flex items-center gap-1.5 cursor-pointer hover:bg-accent-secondary/20"
              onClick={() => clearFilter("venue_id")}
            >
              Venue: {venues.find((v) => v.value === filters.venue_id)?.label || "Selected"}
              <X className="h-3 w-3" />
            </Badge>
          )}

          <button
            onClick={clearAll}
            className="text-xs text-secondary hover:text-primary transition-colors font-medium"
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}

