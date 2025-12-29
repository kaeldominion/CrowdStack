"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@crowdstack/ui";
import { X, ChevronDown, Check } from "lucide-react";
import { GENRES, GENRE_CATEGORIES } from "@/lib/constants/genres";

interface GenreSelectorProps {
  value: string[];
  onChange: (genres: string[]) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  maxSelections?: number;
  disabled?: boolean;
  grouped?: boolean; // Show genres grouped by category
}

export function GenreSelector({
  value,
  onChange,
  label = "Genres",
  placeholder = "Select genres...",
  helperText,
  maxSelections,
  disabled = false,
  grouped = false,
}: GenreSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleGenre = (genre: string) => {
    if (value.includes(genre)) {
      onChange(value.filter((g) => g !== genre));
    } else {
      if (maxSelections && value.length >= maxSelections) return;
      onChange([...value, genre]);
    }
  };

  const removeGenre = (genre: string) => {
    onChange(value.filter((g) => g !== genre));
  };

  // Filter genres based on search
  const filteredGenres = GENRES.filter((genre) =>
    genre.toLowerCase().includes(search.toLowerCase())
  );

  // Get filtered genres by category
  const getFilteredByCategory = () => {
    const result: Record<string, string[]> = {};
    for (const [category, genres] of Object.entries(GENRE_CATEGORIES)) {
      const filtered = genres.filter((g) =>
        g.toLowerCase().includes(search.toLowerCase())
      );
      if (filtered.length > 0) {
        result[category] = filtered;
      }
    }
    return result;
  };

  const canAddMore = !maxSelections || value.length < maxSelections;

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-primary mb-2">
          {label}
          {maxSelections && (
            <span className="text-muted font-normal ml-1">
              ({value.length}/{maxSelections})
            </span>
          )}
        </label>
      )}

      {/* Selected Tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((genre) => (
            <Badge
              key={genre}
              variant="solid"
              color="purple"
              className="flex items-center gap-1 pr-1"
            >
              {genre}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeGenre(genre)}
                  className="p-0.5 hover:bg-white/20 rounded transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between gap-2 px-4 py-2.5
          rounded-xl border bg-glass text-left
          transition-all duration-200
          ${isOpen ? "border-accent-primary ring-1 ring-accent-primary/20" : "border-border-subtle hover:border-border-strong"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${!canAddMore ? "opacity-75" : ""}
        `}
      >
        <span className={value.length === 0 ? "text-muted" : "text-primary"}>
          {value.length === 0 ? placeholder : `${value.length} genre${value.length === 1 ? "" : "s"} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-raised border border-border rounded-xl shadow-xl max-h-72 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-border-subtle">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search genres..."
              className="w-full px-3 py-2 rounded-lg bg-glass border border-border-subtle text-sm text-primary placeholder:text-muted focus:outline-none focus:border-accent-primary"
              autoFocus
            />
          </div>

          {/* Genre List */}
          <div className="overflow-y-auto max-h-52 p-2">
            {grouped ? (
              // Grouped display
              Object.entries(getFilteredByCategory()).map(([category, genres]) => (
                <div key={category} className="mb-3 last:mb-0">
                  <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
                    {category}
                  </div>
                  <div className="space-y-0.5">
                    {genres.map((genre) => {
                      const isSelected = value.includes(genre);
                      const isDisabled = !canAddMore && !isSelected;
                      return (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => !isDisabled && toggleGenre(genre)}
                          disabled={isDisabled}
                          className={`
                            w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors
                            ${isSelected ? "bg-accent-primary/20 text-accent-primary" : "text-primary hover:bg-glass"}
                            ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                          `}
                        >
                          <span>{genre}</span>
                          {isSelected && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              // Flat display
              <div className="space-y-0.5">
                {filteredGenres.map((genre) => {
                  const isSelected = value.includes(genre);
                  const isDisabled = !canAddMore && !isSelected;
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => !isDisabled && toggleGenre(genre)}
                      disabled={isDisabled}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors
                        ${isSelected ? "bg-accent-primary/20 text-accent-primary" : "text-primary hover:bg-glass"}
                        ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
                      `}
                    >
                      <span>{genre}</span>
                      {isSelected && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
                {filteredGenres.length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-muted">
                    No genres found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {helperText && (
        <p className="mt-1.5 text-xs text-muted">{helperText}</p>
      )}
    </div>
  );
}

