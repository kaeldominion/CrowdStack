"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, ChevronDown, Navigation, Check, Loader2 } from "lucide-react";

interface LocationSelectorProps {
  value: string;
  onChange: (city: string) => void;
  cities: { value: string; label: string }[];
  loading?: boolean;
}

const LOCATION_COOKIE_KEY = "crowdstack_location";
const LOCATION_COOKIE_EXPIRY_DAYS = 30;

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

// Reverse geocoding to get city from coordinates
async function getCityFromCoords(lat: number, lng: number): Promise<string | null> {
  try {
    // Using Nominatim (OpenStreetMap) for reverse geocoding - free and no API key needed
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "CrowdStack/1.0",
        },
      }
    );
    const data = await res.json();
    // Return city, town, or municipality
    return data.address?.city || data.address?.town || data.address?.municipality || null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}

export function LocationSelector({
  value,
  onChange,
  cities,
  loading = false,
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize from cookie or geolocation on mount
  useEffect(() => {
    if (hasInitialized) return;

    const initLocation = async () => {
      // First, check for saved cookie
      const savedLocation = getCookie(LOCATION_COOKIE_KEY);
      if (savedLocation && cities.some((c) => c.value === savedLocation)) {
        onChange(savedLocation);
        setHasInitialized(true);
        return;
      }

      // If no cookie, try to detect location
      if (navigator.geolocation) {
        setDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const city = await getCityFromCoords(
              position.coords.latitude,
              position.coords.longitude
            );
            
            if (city) {
              // Find matching city in our list (case-insensitive)
              const matchingCity = cities.find(
                (c) => c.value.toLowerCase() === city.toLowerCase()
              );
              
              if (matchingCity) {
                setCookie(LOCATION_COOKIE_KEY, matchingCity.value, LOCATION_COOKIE_EXPIRY_DAYS);
                onChange(matchingCity.value);
              }
            }
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

    // Wait for cities to load before initializing
    if (cities.length > 0) {
      initLocation();
    }
  }, [cities, hasInitialized, onChange]);

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
        const city = await getCityFromCoords(
          position.coords.latitude,
          position.coords.longitude
        );
        
        if (city) {
          const matchingCity = cities.find(
            (c) => c.value.toLowerCase() === city.toLowerCase()
          );
          
          if (matchingCity) {
            setCookie(LOCATION_COOKIE_KEY, matchingCity.value, LOCATION_COOKIE_EXPIRY_DAYS);
            onChange(matchingCity.value);
          } else {
            alert(`No events available in ${city} yet. Please select a different city.`);
          }
        } else {
          alert("Could not determine your city. Please select manually.");
        }
        setDetectingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Could not access your location. Please select manually.");
        setDetectingLocation(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [cities, onChange]);

  // Handle city selection
  const handleSelect = (city: string) => {
    if (city) {
      setCookie(LOCATION_COOKIE_KEY, city, LOCATION_COOKIE_EXPIRY_DAYS);
    }
    onChange(city);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-location-selector]")) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [isOpen]);

  const displayValue = value || "All Locations";

  return (
    <div className="relative" data-location-selector>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading || detectingLocation}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-glass border border-border-subtle hover:border-accent-primary/50 transition-all disabled:opacity-50"
      >
        {detectingLocation ? (
          <Loader2 className="h-4 w-4 text-accent-primary animate-spin" />
        ) : (
          <MapPin className="h-4 w-4 text-accent-primary" />
        )}
        <span className="font-medium text-primary text-sm">
          {detectingLocation ? "Detecting..." : displayValue}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-secondary transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-xl bg-raised border border-border-subtle shadow-lg z-50">
          {/* Detect Location Button */}
          <button
            onClick={handleDetectLocation}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-active transition-colors border-b border-border-subtle"
          >
            <Navigation className="h-4 w-4 text-accent-secondary" />
            <span className="text-sm font-medium text-primary">Use My Location</span>
          </button>

          {/* All Locations Option */}
          <button
            onClick={() => handleSelect("")}
            className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-active transition-colors ${
              !value ? "bg-active" : ""
            }`}
          >
            <span className="text-sm text-primary">All Locations</span>
            {!value && <Check className="h-4 w-4 text-accent-success" />}
          </button>

          {/* Divider */}
          <div className="border-t border-border-subtle" />

          {/* City List */}
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-secondary">
              Loading cities...
            </div>
          ) : cities.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-secondary">
              No cities available
            </div>
          ) : (
            cities.map((city) => (
              <button
                key={city.value}
                onClick={() => handleSelect(city.value)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-active transition-colors ${
                  value === city.value ? "bg-active" : ""
                }`}
              >
                <span className="text-sm text-primary">{city.label}</span>
                {value === city.value && (
                  <Check className="h-4 w-4 text-accent-success" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

