"use client";

import { useState, useEffect, useRef } from "react";
import { Select } from "@crowdstack/ui";
import { X, Filter, ChevronDown } from "lucide-react";
import { Badge } from "@crowdstack/ui";

export interface BrowseFilters {
  search?: string;
  date?: string;
  genre?: string;
}

interface BrowseFiltersProps {
  filters: BrowseFilters;
  onChange: (filters: BrowseFilters) => void;
  variant?: "sidebar" | "compact";
}

export function BrowseFilters({ filters, onChange, variant = "sidebar" }: BrowseFiltersProps) {
  const [genres, setGenres] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch filter options
  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        // Fetch venues to extract genres
        const venuesRes = await fetch("/api/browse/venues?limit=1000");
        const venuesData = await venuesRes.json();

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
      } catch (error) {
        console.error("Error fetching filter options:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFilterOptions();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const hasActiveFilters = Object.keys(filters).filter(k => k !== 'search').length > 0;
  const activeFilterCount = Object.keys(filters).filter(k => k !== 'search').length;

  const dateOptions = [
    { value: "", label: "All Dates" },
    { value: "today", label: "Today" },
    { value: "this_week", label: "This Week" },
    { value: "this_month", label: "This Month" },
  ];

  // Compact variant - just a filter button with dropdown
  if (variant === "compact") {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
            ${hasActiveFilters 
              ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/50" 
              : "bg-glass border border-border-subtle text-secondary hover:text-primary hover:border-border-strong"
            }
          `}
        >
          <Filter className="w-4 h-4" />
          <span>Filter</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent-primary text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-72 p-4 rounded-xl bg-surface border border-border-subtle shadow-xl z-50">
            <div className="space-y-4">
              <Select
                label="Date"
                value={filters.date || ""}
                onChange={(e) => handleFilterChange("date", e.target.value)}
                options={dateOptions}
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

              {hasActiveFilters && (
                <div className="pt-2 border-t border-border-subtle">
                  <button
                    onClick={() => {
                      clearAll();
                      setIsOpen(false);
                    }}
                    className="text-sm text-accent-primary hover:text-accent-primary/80 font-medium"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Sidebar variant (original layout)
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
          label="Genre"
          value={filters.genre || ""}
          onChange={(e) => handleFilterChange("genre", e.target.value)}
          options={[
            { value: "", label: "All Genres" },
            ...genres,
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
            <button onClick={() => clearFilter("date")} className="inline-flex">
              <Badge
                color="blue"
                variant="outline"
                className="flex items-center gap-1.5 cursor-pointer hover:bg-accent-secondary/20"
              >
                Date: {dateOptions.find((o) => o.value === filters.date)?.label || filters.date}
                <X className="h-3 w-3" />
              </Badge>
            </button>
          )}

          {filters.genre && (
            <button onClick={() => clearFilter("genre")} className="inline-flex">
              <Badge
                color="blue"
                variant="outline"
                className="flex items-center gap-1.5 cursor-pointer hover:bg-accent-secondary/20"
              >
                Genre: {filters.genre}
                <X className="h-3 w-3" />
              </Badge>
            </button>
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
