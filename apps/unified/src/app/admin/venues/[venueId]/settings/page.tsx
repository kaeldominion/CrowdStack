"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Card, Button, Input, Textarea, Tabs, TabsList, TabsTrigger, TabsContent, Badge, Modal, ConfirmModal, LoadingSpinner } from "@crowdstack/ui";
import { Save, Upload, X, Trash2, Star, ExternalLink, Eye, Check, Loader2, ImagePlus, CheckCircle2, MapPin } from "lucide-react";
import Image from "next/image";
import { MapPreview } from "@/components/venue/MapPreview";
import { VENUE_EVENT_GENRES } from "@/lib/constants/genres";
import type { Venue, VenueGallery as VenueGalleryType, VenueTag } from "@crowdstack/shared/types";

interface VenueSettingsData {
  venue: Venue;
  gallery: VenueGalleryType[];
  tags: VenueTag[];
}

const TAG_OPTIONS = {
  music: [...VENUE_EVENT_GENRES],
  dress_code: ["Casual", "Smart Casual", "Dressy", "Formal", "Black Tie", "No Dress Code"],
  crowd_type: ["Young Professional", "College", "Mixed", "Mature", "LGBTQ+", "International"],
  price_range: ["$", "$$", "$$$", "$$$$"],
};

export default function AdminVenueSettingsPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<VenueSettingsData | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedTab, setSavedTab] = useState<string | null>(null);
  
  // Gallery upload state
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadSuccess, setUploadSuccess] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; caption: string } | null>(null);
  
  // Address extraction state
  const [extractingAddress, setExtractingAddress] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccess, setExtractSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [venueId]);

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/venue/settings?venueId=${venueId}`);
      if (!response.ok) throw new Error("Failed to load settings");
      const result = await response.json();
      const venueData = result.venue || result;
      setData({
        venue: venueData,
        gallery: venueData.gallery || [],
        tags: venueData.tags || [],
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (tab: string) => {
    if (!data) return;

    setSaving(true);
    setErrors({});

    try {
      const payload: any = { venue: data.venue };
      
      if (tab === "tags") {
        payload.tags = data.tags;
      }

      const response = await fetch(`/api/venue/settings?venueId=${venueId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      await loadSettings();
      setSavedTab(tab);
      setTimeout(() => setSavedTab(null), 3000);
    } catch (error: any) {
      setErrors({ save: error.message });
    } finally {
      setSaving(false);
    }
  };

  const updateVenueField = (field: string, value: any) => {
    if (!data) return;
    setData({
      ...data,
      venue: {
        ...data.venue,
        [field]: value,
      },
    });
  };

  const generateSlug = () => {
    if (!data) return;
    const name = data.venue.name || "";
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    updateVenueField("slug", slug);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    const fileIds: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileId = `${Date.now()}-${i}`;
      fileIds.push(fileId);
      setUploadingFiles((prev) => [...prev, fileId]);
      setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }));

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`/api/venue/gallery?venueId=${venueId}`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }));
        setUploadSuccess((prev) => [...prev, fileId]);

        setTimeout(() => {
          setUploadSuccess((prev) => prev.filter((id) => id !== fileId));
        }, 2000);
      } catch (error) {
        setUploadError("Failed to upload one or more images");
      } finally {
        setUploadingFiles((prev) => prev.filter((id) => id !== fileId));
      }
    }

    await loadSettings();
    e.target.value = "";
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/venue/gallery/${imageId}?venueId=${venueId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      await loadSettings();
    } catch (error) {
      console.error("Error deleting image:", error);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleSetCoverImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/venue/gallery/${imageId}/cover?venueId=${venueId}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to set cover image");
      }

      await loadSettings();
    } catch (error) {
      console.error("Error setting cover image:", error);
    }
  };

  const handleTagToggle = (category: string, value: string) => {
    if (!data) return;

    const existingTag = data.tags.find(
      (t) => t.category === category && t.value === value
    );

    if (existingTag) {
      setData({
        ...data,
        tags: data.tags.filter((t) => t.id !== existingTag.id),
      });
    } else {
      setData({
        ...data,
        tags: [
          ...data.tags,
          {
            id: `new-${Date.now()}`,
            venue_id: venueId,
            tag_type: category as any,
            tag_value: value,
            category,
            value,
            created_at: new Date().toISOString(),
          },
        ],
      });
    }
  };

  // Try to extract coordinates from URL client-side (works for full URLs)
  const extractCoordsFromUrlClientSide = (url: string): { lat: number; lng: number } | null => {
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

  const extractAddressFromGoogleMaps = async () => {
    if (!data?.venue.google_maps_url) {
      setExtractError("Please enter a Google Maps URL first");
      return;
    }

    const url = data.venue.google_maps_url;
    setExtractingAddress(true);
    setExtractError(null);
    setExtractSuccess(false);

    // First, try client-side extraction (instant, no API needed)
    const clientCoords = extractCoordsFromUrlClientSide(url);
    if (clientCoords) {
      // Update local state with coordinates
      setData({
        ...data,
        venue: {
          ...data.venue,
          latitude: clientCoords.lat,
          longitude: clientCoords.lng,
        },
      });
      setExtractSuccess(true);
      setExtractingAddress(false);
      setTimeout(() => setExtractSuccess(false), 3000);
      return;
    }

    // If client-side fails (short URL), try server-side
    try {
      const response = await fetch(`/api/venue/settings/extract-address?venueId=${venueId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_maps_url: url }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to extract address");
      }

      // Reload to get updated coordinates and address
      await loadSettings();
      setExtractSuccess(true);
      setTimeout(() => setExtractSuccess(false), 3000);
    } catch (error: any) {
      // Provide helpful error message for short URLs
      const isShortUrl = /maps\.app\.goo\.gl|goo\.gl\/maps/.test(url);
      if (isShortUrl) {
        setExtractError("Short URL extraction requires Google Maps API key. Please open the link in your browser and copy the full URL, or enter coordinates manually below.");
      } else {
        setExtractError(error.message || "Failed to extract address from URL");
      }
    } finally {
      setExtractingAddress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading settings..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-secondary">
        Failed to load venue settings
      </div>
    );
  }

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="location">Location</TabsTrigger>
        <TabsTrigger value="gallery">Gallery</TabsTrigger>
        <TabsTrigger value="tags">Tags</TabsTrigger>
      </TabsList>

      {/* Profile Tab */}
      <TabsContent value="profile">
        <Card className="!p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Venue Name
              </label>
              <Input
                value={data.venue.name || ""}
                onChange={(e) => updateVenueField("name", e.target.value)}
                placeholder="Enter venue name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Slug (URL)
                </label>
                <div className="flex gap-2">
                  <Input
                    value={data.venue.slug || ""}
                    onChange={(e) => updateVenueField("slug", e.target.value)}
                    placeholder="venue-slug"
                  />
                  <Button variant="ghost" size="sm" onClick={generateSlug}>
                    Generate
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Email
                </label>
                <Input
                  value={data.venue.email || ""}
                  onChange={(e) => updateVenueField("email", e.target.value)}
                  placeholder="contact@venue.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Phone
                </label>
                <Input
                  value={data.venue.phone || ""}
                  onChange={(e) => updateVenueField("phone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Website
                </label>
                <Input
                  value={data.venue.website || ""}
                  onChange={(e) => updateVenueField("website", e.target.value)}
                  placeholder="https://venue.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Description
              </label>
              <Textarea
                value={data.venue.description || ""}
                onChange={(e) => updateVenueField("description", e.target.value)}
                placeholder="Describe your venue..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Capacity
                </label>
                <Input
                  type="number"
                  value={data.venue.capacity || ""}
                  onChange={(e) => updateVenueField("capacity", parseInt(e.target.value) || null)}
                  placeholder="500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Instagram Handle
                </label>
                <Input
                  value={data.venue.instagram_url || ""}
                  onChange={(e) => updateVenueField("instagram_url", e.target.value)}
                  placeholder="@venuename or instagram.com/venuename"
                />
              </div>
            </div>

            {errors.save && (
              <p className="text-sm text-accent-error">{errors.save}</p>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
              {savedTab === "profile" && (
                <span className="text-sm text-accent-success flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              )}
              <Button onClick={() => saveSettings("profile")} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* Location Tab */}
      <TabsContent value="location">
        <Card className="!p-6">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Location</h3>

            {/* Setup Instructions - show when no coordinates */}
            {!(data.venue.latitude && data.venue.longitude) && (
              <div className="bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-lg p-4">
                <h4 className="font-semibold text-[var(--text-primary)] mb-2">How to set up venue location</h4>
                <ol className="text-sm text-[var(--text-secondary)] space-y-2 list-decimal list-inside">
                  <li>Open <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-[var(--accent-primary)] hover:underline">Google Maps</a> and search for the venue</li>
                  <li>Copy the <strong>full URL</strong> from the browser&apos;s address bar (not a short link)</li>
                  <li>Paste it below and click <strong>&quot;Extract Address &amp; Coordinates&quot;</strong></li>
                  <li>Once coordinates are saved, you can replace the URL with a shorter link if needed</li>
                </ol>
              </div>
            )}

            {/* Success state - show when coordinates configured */}
            {data.venue.latitude && data.venue.longitude && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <p className="text-sm text-emerald-400 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span><strong>Location configured!</strong> Map coordinates are saved. You can use any Google Maps URL format now.</span>
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Google Maps URL
              </label>
              <div className="flex gap-2">
                <Input
                  value={data.venue.google_maps_url || ""}
                  onChange={(e) => updateVenueField("google_maps_url", e.target.value)}
                  placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/place/..."
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={extractAddressFromGoogleMaps}
                  disabled={extractingAddress || !data.venue.google_maps_url}
                >
                  {extractingAddress ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  <span className="ml-2">Extract Address &amp; Coordinates</span>
                </Button>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {data.venue.latitude && data.venue.longitude
                  ? "Coordinates saved. You can use a short link now - it will be used for the 'Open in Maps' button."
                  : "Paste the full Google Maps URL first to extract coordinates, then you can replace with a short link."
                }
              </p>
              {extractError && (
                <p className="text-sm text-[var(--accent-error)] mt-2">{extractError}</p>
              )}
              {extractSuccess && (
                <p className="text-sm text-emerald-400 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Coordinates extracted successfully!
                </p>
              )}
            </div>

            {/* Map Preview */}
            {data.venue.google_maps_url && (
              <MapPreview
                mapsUrl={data.venue.google_maps_url}
                lat={data.venue.latitude}
                lng={data.venue.longitude}
                address={data.venue.address}
                city={data.venue.city}
                state={data.venue.state}
                country={data.venue.country}
              />
            )}

            {/* Address Fields */}
            <div className="border-t border-[var(--border-subtle)] pt-6">
              <h4 className="text-md font-semibold text-[var(--text-primary)] mb-4">Address</h4>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Enter the venue address manually below.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Street Address
                  </label>
                  <Input
                    value={data.venue.address || ""}
                    onChange={(e) => updateVenueField("address", e.target.value)}
                    placeholder="123 Main Street, 12345"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      City
                    </label>
                    <Input
                      value={data.venue.city || ""}
                      onChange={(e) => updateVenueField("city", e.target.value)}
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      State/Province
                    </label>
                    <Input
                      value={data.venue.state || ""}
                      onChange={(e) => updateVenueField("state", e.target.value)}
                      placeholder="NY"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Country
                  </label>
                  <Input
                    value={data.venue.country || ""}
                    onChange={(e) => updateVenueField("country", e.target.value)}
                    placeholder="US"
                  />
                </div>

                {/* Manual Coordinates Entry */}
                <div className="border-t border-[var(--border-subtle)] pt-4 mt-4">
                  <p className="text-sm text-[var(--text-secondary)] mb-3">
                    <strong>Map Coordinates</strong> - Required for map preview. Get these from Google Maps URL or enter manually.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Latitude
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={data.venue.latitude || ""}
                        onChange={(e) => updateVenueField("latitude", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="-8.8123456"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                        Longitude
                      </label>
                      <Input
                        type="number"
                        step="any"
                        value={data.venue.longitude || ""}
                        onChange={(e) => updateVenueField("longitude", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="115.1234567"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Tip: In Google Maps, right-click on the location → &quot;What&apos;s here?&quot; to see coordinates
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
              {savedTab === "location" && (
                <span className="text-sm text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              )}
              <Button onClick={() => saveSettings("location")} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Location
              </Button>
            </div>
          </div>
        </Card>
      </TabsContent>

      {/* Gallery Tab */}
      <TabsContent value="gallery">
        <Card className="!p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Upload Images
              </label>
              <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-border-subtle rounded-lg cursor-pointer hover:border-accent-primary/50 transition-colors">
                <div className="text-center">
                  <ImagePlus className="h-8 w-8 text-secondary mx-auto mb-2" />
                  <p className="text-sm text-secondary">Click to upload images</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleGalleryUpload}
                />
              </label>
              {uploadError && (
                <p className="text-sm text-accent-error mt-2">{uploadError}</p>
              )}
            </div>

            {data.gallery.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.gallery.map((image) => (
                  <div
                    key={image.id}
                    className="relative group aspect-video rounded-lg overflow-hidden bg-raised"
                  >
                    <Image
                      src={image.image_url || image.storage_path}
                      alt={image.caption || "Gallery image"}
                      fill
                      className="object-cover"
                    />
                    {(image.is_cover || image.is_hero) && (
                      <Badge
                        variant="primary"
                        className="absolute top-2 left-2 z-10"
                      >
                        <Star className="h-3 w-3 mr-1" /> Cover
                      </Badge>
                    )}
                    <div className="absolute inset-0 bg-void/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!image.is_cover && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetCoverImage(image.id)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setDeleteConfirm({ id: image.id, caption: image.caption || "this image" })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.gallery.length === 0 && (
              <p className="text-center text-secondary py-8">
                No images in gallery. Upload some to get started.
              </p>
            )}
          </div>
        </Card>

        <ConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => deleteConfirm && handleDeleteGalleryImage(deleteConfirm.id)}
          title="Delete Image"
          message={`Are you sure you want to delete ${deleteConfirm?.caption}?`}
          confirmText="Delete"
          variant="danger"
        />
      </TabsContent>

      {/* Tags Tab */}
      <TabsContent value="tags">
        <Card className="!p-6">
          <div className="space-y-6">
            {Object.entries(TAG_OPTIONS).map(([category, options]) => (
              <div key={category}>
                <label className="block text-sm font-medium text-primary mb-3 capitalize">
                  {category.replace("_", " ")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {options.map((option) => {
                    const isSelected = data.tags.some(
                      (t) => t.category === category && t.value === option
                    );
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleTagToggle(category, option)}
                        className="inline-flex"
                      >
                        <Badge
                          variant={isSelected ? "primary" : "secondary"}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? ""
                              : "hover:bg-accent-primary/20"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 mr-1" />}
                          {option}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
              {savedTab === "tags" && (
                <span className="text-sm text-accent-success flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Saved
                </span>
              )}
              <Button onClick={() => saveSettings("tags")} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Tags
              </Button>
            </div>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
