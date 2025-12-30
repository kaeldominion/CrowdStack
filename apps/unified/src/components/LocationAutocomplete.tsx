"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@crowdstack/ui";
import { MapPin, Loader2 } from "lucide-react";

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

// Country name abbreviations
const COUNTRY_ABBREVIATIONS: Record<string, string> = {
  "United States": "USA",
  "United States of America": "USA",
  "United Kingdom": "UK",
  "United Arab Emirates": "UAE",
  "Republic of Korea": "South Korea",
  "Democratic Republic of the Congo": "DR Congo",
  "Central African Republic": "CAR",
  "Papua New Guinea": "PNG",
  "Dominican Republic": "Dom. Rep.",
  "Czech Republic": "Czechia",
  "Bosnia and Herzegovina": "Bosnia",
  "Trinidad and Tobago": "Trinidad",
  "Saint Vincent and the Grenadines": "St. Vincent",
  "Antigua and Barbuda": "Antigua",
  "Saint Kitts and Nevis": "St. Kitts",
  "São Tomé and Príncipe": "São Tomé",
  "Equatorial Guinea": "Eq. Guinea",
  "New Zealand": "NZ",
  "South Africa": "SA",
  "Saudi Arabia": "KSA",
  "Hong Kong SAR China": "Hong Kong",
  "Macao SAR China": "Macau",
};

// Apply abbreviations to location string
function abbreviateCountry(location: string): string {
  let result = location;
  for (const [full, abbr] of Object.entries(COUNTRY_ABBREVIATIONS)) {
    // Replace at end of string or before comma
    result = result.replace(new RegExp(`${full}$`, "i"), abbr);
    result = result.replace(new RegExp(`${full},`, "gi"), `${abbr},`);
  }
  return result;
}

export function LocationAutocomplete({
  value,
  onChange,
  label = "Location",
  placeholder = "Start typing a city...",
  helperText = "Search for your city",
  disabled = false,
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isSelectingRef = useRef(false); // Track if a selection is in progress

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch predictions from Google Places API
  const fetchPredictions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/places/autocomplete?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setPredictions(data.predictions || []);
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error("Error fetching place predictions:", error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setHighlightedIndex(-1);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce API calls
    debounceRef.current = setTimeout(() => {
      fetchPredictions(newValue);
      setIsOpen(true);
    }, 300);
  };

  // Handle selection
  const handleSelect = (prediction: PlacePrediction) => {
    // Mark that we're selecting to prevent blur from overwriting
    isSelectingRef.current = true;
    
    // Format as "City, Country" or use description
    let formattedLocation = prediction.structured_formatting
      ? `${prediction.structured_formatting.main_text}, ${prediction.structured_formatting.secondary_text}`
      : prediction.description;
    
    // Apply country abbreviations
    formattedLocation = abbreviateCountry(formattedLocation);
    
    setInputValue(formattedLocation);
    onChange(formattedLocation);
    setPredictions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
    
    // Reset the selecting flag after a short delay
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 250);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || predictions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < predictions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev > 0 ? prev - 1 : predictions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && predictions[highlightedIndex]) {
          handleSelect(predictions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle blur - allow manual input if no selection
  const handleBlur = () => {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      // Don't update if a selection just happened (prevents overwriting the selected value)
      if (isSelectingRef.current) {
        return;
      }
      if (inputValue !== value) {
        onChange(inputValue);
      }
      setIsOpen(false);
    }, 200);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          label={label}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.length >= 2 && setIsOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          helperText={helperText}
          disabled={disabled}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-[38px]">
            <Loader2 className="h-4 w-4 animate-spin text-muted" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-raised border border-border rounded-xl shadow-lg max-h-60 overflow-auto"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                index === highlightedIndex
                  ? "bg-active text-primary"
                  : "text-primary hover:bg-glass"
              }`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => handleSelect(prediction)}
            >
              <MapPin className="h-4 w-4 text-muted flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {prediction.structured_formatting?.main_text || prediction.description}
                </div>
                {prediction.structured_formatting?.secondary_text && (
                  <div className="text-sm text-secondary truncate">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

