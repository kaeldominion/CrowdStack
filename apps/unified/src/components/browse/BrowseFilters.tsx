"use client";

import { useState, useEffect, useRef } from "react";
import { Select } from "@crowdstack/ui";
import { X, Filter, ChevronDown } from "lucide-react";
import { Badge } from "@crowdstack/ui";
import { GENRES, VENUE_EVENT_GENRES } from "@/lib/constants/genres";

export interface BrowseFilters {
  search?: string;
  date?: string;
  genre?: string;
  country?: string;
}

// Common countries for DJ filtering
const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Spain",
  "Italy",
  "Brazil",
  "Mexico",
  "Japan",
  "South Korea",
  "India",
  "South Africa",
];

interface BrowseFiltersProps {
  filters: BrowseFilters;
  onChange: (filters: BrowseFilters) => void;
  variant?: "sidebar" | "compact";
  /** Filter type - "events" shows date+genre, "djs" shows genre+country */
  filterType?: "events" | "djs";
}

export function BrowseFilters({ filters, onChange, variant = "sidebar", filterType = "events" }: BrowseFiltersProps) {
  // Use different genre lists based on filter type
  // DJs get detailed list, Events/Venues get curated list
  const genres = (filterType === "djs" ? GENRES : VENUE_EVENT_GENRES).map((genre) => ({ 
    value: genre, 
    label: genre 
  }));
  const countries = COUNTRIES.map((country) => ({ value: country, label: country }));
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
              {/* Date filter - only for events */}
              {filterType === "events" && (
                <Select
                  label="Date"
                  value={filters.date || ""}
                  onChange={(e) => handleFilterChange("date", e.target.value)}
                  options={dateOptions}
                />
              )}

              <Select
                label="Genre"
                value={filters.genre || ""}
                onChange={(e) => handleFilterChange("genre", e.target.value)}
                options={[
                  { value: "", label: "All Genres" },
                  ...genres,
                ]}
              />

              {/* Country filter - only for DJs */}
              {filterType === "djs" && (
                <Select
                  label="Country"
                  value={filters.country || ""}
                  onChange={(e) => handleFilterChange("country", e.target.value)}
                  options={[
                    { value: "", label: "All Countries" },
                    ...countries,
                  ]}
                />
              )}

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
        {/* Date filter - only for events */}
        {filterType === "events" && (
          <Select
            label="Date"
            value={filters.date || ""}
            onChange={(e) => handleFilterChange("date", e.target.value)}
            options={dateOptions}
          />
        )}

        <Select
          label="Genre"
          value={filters.genre || ""}
          onChange={(e) => handleFilterChange("genre", e.target.value)}
          options={[
            { value: "", label: "All Genres" },
            ...genres,
          ]}
        />

        {/* Country filter - only for DJs */}
        {filterType === "djs" && (
          <Select
            label="Country"
            value={filters.country || ""}
            onChange={(e) => handleFilterChange("country", e.target.value)}
            options={[
              { value: "", label: "All Countries" },
              ...countries,
            ]}
          />
        )}
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

          {filters.country && (
            <button onClick={() => clearFilter("country")} className="inline-flex">
              <Badge
                color="blue"
                variant="outline"
                className="flex items-center gap-1.5 cursor-pointer hover:bg-accent-secondary/20"
              >
                Country: {filters.country}
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
