"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MapPin, Navigation, Loader2, X, Search } from "lucide-react";
import { Input } from "@crowdstack/ui";
import { formatVenueLocation } from "@/lib/utils/format-venue-location";

interface LocationSelectorProps {
  value: string; // City name (for filtering)
  onChange: (city: string) => void;
  cities?: { value: string; label: string }[]; // Legacy prop, not used anymore
  loading?: boolean;
}

const LOCATION_COOKIE_KEY = "crowdstack_location";
const LOCATION_COOKIE_EXPIRY_DAYS = 30;
const DEFAULT_RADIUS_KM = 50;

// Helper to get cookie
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

// Helper to set cookie
function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

interface SearchResult {
  value: string; // City name for filtering
  label: string; // Formatted "City, Country"
  city: string;
  state: string | null;
  country: string | null;
  distance?: number; // Distance in km (for nearby results)
}

export function LocationSelector({
  value,
  onChange,
  loading = false,
}: LocationSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isSelectingRef = useRef(false);

  // Load selected location label on mount
  useEffect(() => {
    if (value) {
      // Fetch the label for the selected city
      fetch(`/api/browse/locations/search?q=${encodeURIComponent(value)}&limit=1`)
        .then((res) => res.json())
        .then((data) => {
          if (data.cities && data.cities.length > 0) {
            setSelectedLabel(data.cities[0].label);
            setInputValue(data.cities[0].label);
          } else {
            setSelectedLabel(value);
            setInputValue(value);
          }
        })
        .catch(() => {
          setSelectedLabel(value);
          setInputValue(value);
        });
    } else {
      setSelectedLabel("");
      setInputValue("");
    }
  }, [value]);

  // Initialize from cookie or geolocation on mount
  useEffect(() => {
    if (hasInitialized) return;

    const initLocation = async () => {
      // First, check for saved cookie
      const savedLocation = getCookie(LOCATION_COOKIE_KEY);
      if (savedLocation) {
        onChange(savedLocation);
        setHasInitialized(true);
        return;
      }

      // If no cookie, try to detect location
      if (navigator.geolocation) {
        setDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await findNearbyLocation(
              position.coords.latitude,
              position.coords.longitude
            );
            setDetectingLocation(false);
            setHasInitialized(true);
          },
          (error) => {
            console.log("Geolocation error:", error.message);
            setDetectingLocation(false);
            setHasInitialized(true);
          },
          { timeout: 5000, enableHighAccuracy: false }
        );
      } else {
        setHasInitialized(true);
      }
    };

    initLocation();
  }, [hasInitialized, onChange]);

  // Find nearby location using radius-based matching
  const findNearbyLocation = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await fetch(
          `/api/browse/locations/nearby?lat=${lat}&lng=${lng}&radius=${DEFAULT_RADIUS_KM}`
        );
        const data = await res.json();

        if (data.cities && data.cities.length > 0) {
          // Use the nearest city
          const nearest = data.cities[0];
          setCookie(
            LOCATION_COOKIE_KEY,
            nearest.city,
            LOCATION_COOKIE_EXPIRY_DAYS
          );
          onChange(nearest.city);
          setSelectedLabel(nearest.formattedLocation);
          setInputValue(nearest.formattedLocation);
        } else {
          // No cities within radius - show message but don't auto-select
          console.log(
            `No events found within ${DEFAULT_RADIUS_KM}km of your location`
          );
        }
      } catch (error) {
        console.error("Error finding nearby location:", error);
      }
    },
    [onChange]
  );

  // Handle manual location detection
  const handleDetectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setDetectingLocation(true);
    setIsOpen(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await findNearbyLocation(
          position.coords.latitude,
          position.coords.longitude
        );
        setDetectingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Could not access your location. Please search manually.");
        setDetectingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [findNearbyLocation]);

  // Search for locations
  const searchLocations = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/browse/locations/search?q=${encodeURIComponent(query)}&limit=10`
      );
      const data = await res.json();
      setSuggestions(data.cities || []);
    } catch (error) {
      console.error("Error searching locations:", error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce API calls
    debounceRef.current = setTimeout(() => {
      if (newValue.length >= 2) {
        searchLocations(newValue);
      } else {
        setSuggestions([]);
      }
    }, 300);
  };

  // Handle selection
  const handleSelect = (result: SearchResult) => {
    setInputValue(result.label);
    setSelectedLabel(result.label);
    setCookie(LOCATION_COOKIE_KEY, result.value, LOCATION_COOKIE_EXPIRY_DAYS);
    onChange(result.value);
    setSuggestions([]);
    setIsOpen(false);
    isSelectingRef.current = true;
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 250);
  };

  // Handle clear
  const handleClear = () => {
    setInputValue("");
    setSelectedLabel("");
    setCookie(LOCATION_COOKIE_KEY, "", LOCATION_COOKIE_EXPIRY_DAYS);
    onChange("");
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Handle blur
  const handleBlur = () => {
    if (isSelectingRef.current) return;

    setTimeout(() => {
      // Restore selected label if user didn't select anything
      if (selectedLabel && !value) {
        setInputValue(selectedLabel);
      } else if (!value) {
        setInputValue("");
      }
      setIsOpen(false);
    }, 200);
  };

  // Handle "All Locations"
  const handleAllLocations = () => {
    handleClear();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !inputRef.current?.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const displayValue = value ? selectedLabel || value : "All Locations";

  return (
    <div className="relative w-full max-w-md" data-location-selector>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={detectingLocation ? "Detecting location..." : "Search city or location..."}
          disabled={detectingLocation || loading}
          className="pl-11 pr-20"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-12 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-active transition-colors"
            type="button"
          >
            <X className="h-4 w-4 text-muted hover:text-primary" />
          </button>
        )}
        <button
          onClick={handleDetectLocation}
          disabled={detectingLocation || loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded hover:bg-active transition-colors disabled:opacity-50"
          type="button"
          title="Use My Location"
        >
          {detectingLocation ? (
            <Loader2 className="h-4 w-4 text-accent-primary animate-spin" />
          ) : (
            <Navigation className="h-4 w-4 text-accent-secondary" />
          )}
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-xl bg-raised border border-border-subtle shadow-lg z-50"
        >
          {/* Use My Location Button */}
          <button
            onClick={handleDetectLocation}
            disabled={detectingLocation}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-active transition-colors border-b border-border-subtle disabled:opacity-50"
          >
            <Navigation className="h-4 w-4 text-accent-secondary flex-shrink-0" />
            <span className="text-sm font-medium text-primary">
              {detectingLocation ? "Detecting location..." : "Use My Location"}
            </span>
            {detectingLocation && (
              <Loader2 className="h-4 w-4 text-accent-primary animate-spin ml-auto" />
            )}
          </button>

          {/* All Locations Option */}
          <button
            onClick={handleAllLocations}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-active transition-colors ${
              !value ? "bg-active" : ""
            }`}
          >
            <span className="text-sm text-primary">All Locations</span>
            {!value && (
              <div className="h-4 w-4 rounded-full bg-accent-success" />
            )}
          </button>

          {/* Divider */}
          {suggestions.length > 0 && (
            <div className="border-t border-border-subtle" />
          )}

          {/* Suggestions */}
          {isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-secondary">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : suggestions.length === 0 && inputValue.length >= 2 ? (
            <div className="px-4 py-6 text-center text-sm text-secondary">
              No locations found
            </div>
          ) : (
            suggestions.map((result, index) => (
              <button
                key={`${result.value}-${index}`}
                onClick={() => handleSelect(result)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-active transition-colors ${
                  value === result.value ? "bg-active" : ""
                } ${
                  highlightedIndex === index ? "bg-active" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-primary">{result.label}</div>
                  {result.distance !== undefined && (
                    <div className="text-xs text-secondary mt-0.5">
                      {result.distance}km away
                    </div>
                  )}
                </div>
                {value === result.value && (
                  <div className="h-4 w-4 rounded-full bg-accent-success flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
