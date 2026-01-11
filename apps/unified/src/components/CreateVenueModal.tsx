"use client";

import { useState } from "react";
import { Modal, Button, Input, Textarea } from "@crowdstack/ui";
import { MapPin, Loader2, Check, ChevronDown, ChevronUp } from "lucide-react";

interface CreateVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateVenueModal({ isOpen, onClose, onSuccess }: CreateVenueModalProps) {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractSuccess, setExtractSuccess] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    google_maps_url: "",
    latitude: null as number | null,
    longitude: null as number | null,
    address: "",
    city: "",
    state: "",
    country: "",
    phone: "",
    email: "",
    website: "",
  });

  // Extract coordinates from Google Maps URL client-side
  const extractCoordsFromUrl = (url: string): { lat: number; lng: number } | null => {
    if (!url) return null;

    // Pattern 1: @lat,lng (most common)
    let match = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }

    // Pattern 2: !3dlat!4dlng
    match = url.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }

    // Pattern 3: ?q=lat,lng
    match = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }

    return null;
  };

  const handleExtractCoords = async () => {
    if (!formData.google_maps_url) {
      setExtractError("Please enter a Google Maps URL first");
      return;
    }

    setExtracting(true);
    setExtractError(null);
    setExtractSuccess(false);

    // Try client-side extraction first
    const coords = extractCoordsFromUrl(formData.google_maps_url);
    if (coords) {
      setFormData(prev => ({
        ...prev,
        latitude: coords.lat,
        longitude: coords.lng,
      }));
      setExtractSuccess(true);
      setTimeout(() => setExtractSuccess(false), 3000);
      setExtracting(false);
      return;
    }

    // If client-side fails, try server-side for short URLs
    try {
      const response = await fetch("/api/maps/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formData.google_maps_url }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to extract coordinates");
      }

      const data = await response.json();
      if (data.latitude && data.longitude) {
        setFormData(prev => ({
          ...prev,
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address || prev.address,
          city: data.city || prev.city,
          state: data.state || prev.state,
          country: data.country || prev.country,
        }));
        setExtractSuccess(true);
        setTimeout(() => setExtractSuccess(false), 3000);
      } else {
        throw new Error("Could not extract coordinates from URL");
      }
    } catch (error: any) {
      const isShortUrl = /maps\.app\.goo\.gl|goo\.gl\/maps/.test(formData.google_maps_url);
      if (isShortUrl) {
        setExtractError("Short URLs require server-side resolution. Please use the full Google Maps URL from your browser's address bar.");
      } else {
        setExtractError(error.message || "Failed to extract coordinates");
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/venues/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          google_maps_url: formData.google_maps_url || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          country: formData.country || null,
          phone: formData.phone || null,
          email: formData.email || null,
          website: formData.website || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create venue");
      }

      // Reset form
      setFormData({
        name: "",
        google_maps_url: "",
        latitude: null,
        longitude: null,
        address: "",
        city: "",
        state: "",
        country: "",
        phone: "",
        email: "",
        website: "",
      });
      setExtractSuccess(false);
      setExtractError(null);
      setShowManualAddress(false);

      onSuccess();
      onClose();
    } catch (error: any) {
      alert(error.message || "Failed to create venue");
    } finally {
      setLoading(false);
    }
  };

  const hasCoordinates = formData.latitude !== null && formData.longitude !== null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Venue" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Venue Name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="The Grand Ballroom"
        />

        {/* Location Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--accent-primary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Location</span>
          </div>

          {/* Instructions */}
          {!hasCoordinates && (
            <div className="bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-lg p-3 text-xs text-[var(--text-secondary)]">
              <p className="font-medium text-[var(--text-primary)] mb-1">How to set location:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open Google Maps and find your venue</li>
                <li>Copy the full URL from your browser</li>
                <li>Paste below and click "Extract Coordinates"</li>
              </ol>
            </div>
          )}

          {/* Success state */}
          {hasCoordinates && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-xs text-emerald-400 flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>
                  <strong>Coordinates set!</strong> ({formData.latitude?.toFixed(6)}, {formData.longitude?.toFixed(6)})
                </span>
              </p>
            </div>
          )}

          <Input
            label="Google Maps URL"
            type="url"
            value={formData.google_maps_url}
            onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
            placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/place/..."
            helperText={hasCoordinates ? "✓ Coordinates extracted" : "Paste a Google Maps URL to auto-extract coordinates"}
          />

          {formData.google_maps_url && !hasCoordinates && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleExtractCoords}
              disabled={extracting}
            >
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : extractSuccess ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Extracted!
                </>
              ) : (
                "Extract Coordinates"
              )}
            </Button>
          )}

          {extractError && (
            <p className="text-xs text-red-400">{extractError}</p>
          )}

          {/* Manual Address Toggle */}
          <button
            type="button"
            onClick={() => setShowManualAddress(!showManualAddress)}
            className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showManualAddress ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showManualAddress ? "Hide" : "Show"} manual address fields
          </button>

          {/* Manual Address Fields */}
          {showManualAddress && (
            <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
              <Input
                label="Street Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Jakarta"
                />
                <Input
                  label="State/Province"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="DKI Jakarta"
                />
              </div>

              <Input
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Indonesia"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Latitude"
                  type="number"
                  step="any"
                  value={formData.latitude || ""}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="-6.2088"
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="any"
                  value={formData.longitude || ""}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="106.8456"
                />
              </div>
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
          <span className="text-sm font-medium text-[var(--text-primary)]">Contact Info</span>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="venue@example.com"
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+62 812 3456 7890"
            />
          </div>

          <Input
            label="Website"
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://venue.com"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Create Venue
          </Button>
        </div>
      </form>
    </Modal>
  );
}
