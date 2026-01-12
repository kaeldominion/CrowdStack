"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Card, Button, Input, Textarea, Tabs, TabsList, TabsTrigger, TabsContent, Badge, Modal, ConfirmModal, LoadingSpinner, Select } from "@crowdstack/ui";
import { Save, Upload, X, Trash2, Star, ExternalLink, Eye, Check, Loader2, ImagePlus, CheckCircle2, MapPin, Plus, FileText, Edit2, Palette } from "lucide-react";
import Image from "next/image";
import { MapPreview } from "@/components/venue/MapPreview";
import { FeedbackSettingsTab } from "@/components/venue/FeedbackSettingsTab";
import { VENUE_EVENT_GENRES } from "@/lib/constants/genres";
import { CURRENCIES } from "@/lib/constants/currencies";
import type { Venue, VenueGallery as VenueGalleryType, VenueTag } from "@crowdstack/shared/types";
import { ThemeToggle } from "@/components/ThemeToggle";

interface VenueSettingsData {
  venue: Venue;
  gallery: VenueGalleryType[];
  tags: VenueTag[];
}

const TAG_OPTIONS = {
  music: [...VENUE_EVENT_GENRES], // Use curated venue/event genres
  dress_code: ["Casual", "Smart Casual", "Dressy", "Formal", "Black Tie", "No Dress Code"],
  crowd_type: ["Young Professional", "College", "Mixed", "Mature", "LGBTQ+", "International"],
  price_range: ["$", "$$", "$$$", "$$$$"],
};

export default function VenueSettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const venueId = searchParams.get("venueId");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<VenueSettingsData | null>(null);
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabParam || "profile");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
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
  
  
  // Image upload state
  const [uploadingImage, setUploadingImage] = useState<"logo" | "cover" | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Load selected venue from cookie/client-side and sync URL
  useEffect(() => {
    const loadSelectedVenue = async () => {
      try {
        const response = await fetch("/api/venue/select");
        if (response.ok) {
          const data = await response.json();
          const cookieVenueId = data.venueId || null;
          setSelectedVenueId(cookieVenueId);
          
          // If no venueId in URL but we have a selected venue from cookie, update URL
          // This ensures the page always shows the venue selected in the dropdown
          if (!venueId && cookieVenueId) {
            router.replace(`/app/venue/settings?venueId=${cookieVenueId}`);
            return; // Exit early, will reload with new venueId
          }
          
          // If URL has different venueId than cookie, update URL to match cookie
          // This fixes the mismatch where dropdown shows one venue but page shows another
          if (venueId && cookieVenueId && venueId !== cookieVenueId) {
            console.log(`[Venue Settings] Mismatch detected: URL has ${venueId}, cookie has ${cookieVenueId}. Updating URL.`);
            router.replace(`/app/venue/settings?venueId=${cookieVenueId}`);
            return; // Exit early, will reload with correct venueId
          }
        }
      } catch (error) {
        console.error("Error loading selected venue:", error);
      }
    };
    loadSelectedVenue();
  }, [venueId, router, pathname]);

  useEffect(() => {
    loadSettings();
  }, [venueId]);

  // Update active tab when tab param changes
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);


  const loadSettings = async () => {
    try {
      // Add cache busting timestamp to ensure fresh data
      const timestamp = Date.now();
      const url = venueId 
        ? `/api/venue/settings?venueId=${venueId}&_t=${timestamp}` 
        : `/api/venue/settings?_t=${timestamp}`;
      
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!response.ok) throw new Error("Failed to load settings");
      const result = await response.json();
      // Handle nested structure from API
      const venueData = result.venue || result;

      console.log(`[Venue Settings] Loaded venue:`, {
        id: venueData.id,
        slug: venueData.slug,
        name: venueData.name,
      });

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

      // Include tags if on tags tab
      if (tab === "tags") {
        payload.tags = data.tags;
      }

      console.log(`[Venue Settings] Saving ${tab}`, {
        venueId: venueId || "from-session",
        description: data.venue.description?.substring(0, 50),
        address: data.venue.address,
        google_maps_url: data.venue.google_maps_url?.substring(0, 50),
      });

      const url = venueId ? `/api/venue/settings?venueId=${venueId}` : "/api/venue/settings";
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save");
      }

      console.log(`[Venue Settings] Save response:`, {
        id: result.venue?.id,
        slug: result.venue?.slug,
        name: result.venue?.name,
        description: result.venue?.description?.substring(0, 50),
        address: result.venue?.address,
        updated_at: result.venue?.updated_at,
      });

      // Verify the save actually worked
      if (tab === "profile" && data.venue.description && result.venue?.description !== data.venue.description) {
        console.error("[Venue Settings] WARNING: Description mismatch after save!", {
          sent: data.venue.description?.substring(0, 50),
          returned: result.venue?.description?.substring(0, 50),
        });
      }

      // Reload to get updated data
      await loadSettings();

      // Show success indicator
      setSavedTab(tab);
      setTimeout(() => {
        setSavedTab(null);
      }, 3000); // Hide after 3 seconds
    } catch (error: any) {
      console.error("[Venue Settings] Save failed:", error);
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
    const slug = data.venue.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    updateVenueField("slug", slug);
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

  const extractAddressFromUrl = async () => {
    if (!data?.venue?.google_maps_url) {
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
      console.log("[Settings] Extracted coordinates client-side:", clientCoords);
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
    console.log("[Settings] Client-side extraction failed, trying server-side...");
    
    try {
      const apiUrl = venueId 
        ? `/api/venue/settings/extract-address?venueId=${venueId}` 
        : "/api/venue/settings/extract-address";
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ google_maps_url: url }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to extract address");
      }

      // Reload venue data to get updated coordinates and address
      await loadSettings();
      setExtractSuccess(true);
      setTimeout(() => setExtractSuccess(false), 3000);
    } catch (error: any) {
      console.error("Failed to extract address:", error);
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


  const handleImageUpload = async (type: "logo" | "cover", file: File) => {
    if (!data) return;

    setUploadingImage(type);
    setImageUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Build URL with type and optional venueId
      const params = new URLSearchParams({ type });
      if (venueId) params.set("venueId", venueId);

      const response = await fetch(`/api/venue/upload-image?${params}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload image");
      }

      const result = await response.json();

      // Update local state with the storage URL
      updateVenueField(type === "logo" ? "logo_url" : "cover_image_url", result.url);

      // Reload settings to ensure we have the latest data
      await loadSettings();
    } catch (error: any) {
      console.error("Failed to upload image:", error);
      setImageUploadError(error.message || "Failed to upload image");
    } finally {
      setUploadingImage(null);
    }
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!data || !files || files.length === 0) return;

    const fileArray = Array.from(files);
    const fileNames = fileArray.map(f => f.name);
    
    setUploadingFiles(fileNames);
    setUploadError(null);
    setUploadSuccess([]);
    
    // Initialize progress for each file
    const initialProgress: Record<string, number> = {};
    fileNames.forEach(name => { initialProgress[name] = 0; });
    setUploadProgress(initialProgress);

    const url = venueId 
      ? `/api/venue/gallery?venueId=${venueId}` 
      : "/api/venue/gallery";

    const successfulUploads: string[] = [];
    const failedUploads: string[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const fileName = file.name;
      
      try {
        // Simulate progress (since fetch doesn't support progress natively for uploads without XHR)
        setUploadProgress(prev => ({ ...prev, [fileName]: 20 }));
        
        const formData = new FormData();
        formData.append("file", file);
        
        setUploadProgress(prev => ({ ...prev, [fileName]: 50 }));

        const response = await fetch(url, {
          method: "POST",
          body: formData,
        });

        setUploadProgress(prev => ({ ...prev, [fileName]: 80 }));

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to upload");
        }
        
        setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        successfulUploads.push(fileName);
      } catch (error: any) {
        console.error(`Failed to upload ${fileName}:`, error);
        failedUploads.push(fileName);
        setUploadProgress(prev => ({ ...prev, [fileName]: -1 })); // -1 indicates error
      }
    }

    // Show success message
    if (successfulUploads.length > 0) {
      setUploadSuccess(successfulUploads);
      await loadSettings();
      
      // Clear success after 3 seconds
      setTimeout(() => {
        setUploadSuccess([]);
      }, 3000);
    }

    if (failedUploads.length > 0) {
      setUploadError(`Failed to upload: ${failedUploads.join(", ")}`);
    }

    // Clear uploading state after a brief delay
    setTimeout(() => {
      setUploadingFiles([]);
      setUploadProgress({});
    }, 1000);
  };

  const handleSetHero = async (imageId: string) => {
    try {
      const response = await fetch(`/api/venue/gallery/${imageId}/hero`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to set hero");
      await loadSettings();
    } catch (error) {
      console.error("Failed to set hero image:", error);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/venue/gallery/${imageId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      await loadSettings();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Failed to delete image:", error);
    }
  };

  const handleTagToggle = (type: VenueTag["tag_type"], value: string) => {
    if (!data) return;

    const existingTag = data.tags.find((t) => t.tag_type === type && t.tag_value === value);
    const newTags = existingTag
      ? data.tags.filter((t) => t.id !== existingTag.id)
      : [
          ...data.tags,
          {
            id: `temp-${Date.now()}`,
            venue_id: data.venue.id,
            tag_type: type,
            tag_value: value,
            created_at: new Date().toISOString(),
          },
        ];

    setData({ ...data, tags: newTags });
  };

  if (loading) {
    return (
      <div className="space-y-8 pt-4">
        <div className="text-center py-12">
          <p className="text-secondary">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-8 pt-4">
        <div className="text-center py-12">
          <p className="text-secondary">Failed to load settings</p>
        </div>
      </div>
    );
  }

  const publicVenueUrl = data?.venue?.slug 
    ? `${process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}/v/${data.venue.slug}`
    : null;

  return (
    <div className="space-y-8 pt-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-primary">Venue Settings</h1>
          <p className="mt-2 text-sm text-secondary">
            {venueId ? "Managing venue settings" : "Manage your venue profile and preferences"}
          </p>
          {data?.venue && (
            <p className="mt-1 text-sm font-medium text-primary">{data.venue.name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => setShowPreview(true)}
            className="hidden md:flex"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          {publicVenueUrl && (
            <Link href={publicVenueUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Live Page
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap gap-2 mb-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="defaults">Defaults</TabsTrigger>
          <TabsTrigger value="feedback">Venue Pulse</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-primary">Profile Information</h2>

              <Input
                label="Venue Name"
                value={data.venue.name || ""}
                onChange={(e) => updateVenueField("name", e.target.value)}
                required
              />

              <div className="flex gap-2">
                <Input
                  label="Slug"
                  value={data.venue.slug || ""}
                  onChange={(e) => updateVenueField("slug", e.target.value)}
                  helperText="URL-friendly identifier (e.g., 'my-venue')"
                  className="flex-1"
                />
                <Button variant="secondary" onClick={generateSlug} className="mt-8">
                  Generate
                </Button>
              </div>

              <Input
                label="Tagline"
                value={data.venue.tagline || ""}
                onChange={(e) => updateVenueField("tagline", e.target.value)}
                placeholder="Short description"
              />

              <Textarea
                label="Description"
                value={data.venue.description || ""}
                onChange={(e) => updateVenueField("description", e.target.value)}
                rows={6}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Website"
                  type="url"
                  value={data.venue.website || ""}
                  onChange={(e) => updateVenueField("website", e.target.value)}
                  placeholder="https://example.com"
                />
                <Input
                  label="Instagram"
                  type="text"
                  value={data.venue.instagram_url || ""}
                  onChange={(e) => updateVenueField("instagram_url", e.target.value)}
                  placeholder="username"
                  helperText="Just the handle (no @ needed) - we'll normalize it on save"
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={data.venue.phone || ""}
                  onChange={(e) => updateVenueField("phone", e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  value={data.venue.email || ""}
                  onChange={(e) => updateVenueField("email", e.target.value)}
                />
              </div>

              {/* Capacity */}
              <Input
                label="Capacity"
                type="number"
                value={data.venue.capacity || ""}
                onChange={(e) => updateVenueField("capacity", e.target.value ? parseInt(e.target.value) : null)}
                placeholder="500"
                helperText="Maximum venue capacity for guests"
              />

              {/* Currency Selection */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Base Currency
                </label>
                <p className="text-xs text-secondary mb-2">
                  Used for table pricing, minimum spends, and deposits. Events can override this.
                </p>
                <select
                  value={data.venue.currency || "USD"}
                  onChange={(e) => updateVenueField("currency", e.target.value)}
                  className="w-full md:w-64 px-3 py-2 bg-glass border border-border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} ({currency.symbol}) - {currency.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Appearance Settings */}
              <div className="border-t border-border-subtle pt-6">
                <h3 className="text-sm font-medium text-primary mb-4 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Appearance
                </h3>
                <div className="flex items-center justify-between p-4 bg-glass/5 rounded-xl">
                  <div>
                    <p className="text-primary font-medium">Theme</p>
                    <p className="text-sm text-muted">Choose between light and dark mode</p>
                  </div>
                  <ThemeToggle showLabel={false} />
                </div>
              </div>

              {errors.save && <p className="text-accent-error text-sm">{errors.save}</p>}

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => saveSettings("profile")}
                  disabled={saving}
                  loading={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Profile
                </Button>
                {savedTab === "profile" && (
                  <div className="flex items-center gap-2 text-accent-success animate-in fade-in duration-300">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Saved!</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Location Tab */}
        <TabsContent value="location">
          <Card>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-primary">Location</h2>

              {/* Setup Instructions */}
              {!(data.venue.latitude && data.venue.longitude) && (
                <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-4">
                  <h3 className="font-semibold text-primary mb-2">📍 How to set up your venue location</h3>
                  <ol className="text-sm text-secondary space-y-2 list-decimal list-inside">
                    <li>Open <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">Google Maps</a> and search for your venue</li>
                    <li>Copy the <strong>full URL</strong> from your browser&apos;s address bar (not a short link)</li>
                    <li>Paste it below and click <strong>&quot;Extract Address &amp; Coordinates&quot;</strong></li>
                    <li>Once coordinates are saved, you can replace the URL with a shorter link if you prefer</li>
                  </ol>
                </div>
              )}

              {/* Success state */}
              {data.venue.latitude && data.venue.longitude && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-sm text-green-400 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span><strong>Location configured!</strong> Map coordinates are saved. You can use any Google Maps URL format now.</span>
                  </p>
                </div>
              )}

              <Input
                label="Google Maps URL"
                type="url"
                value={data.venue.google_maps_url || ""}
                onChange={(e) => updateVenueField("google_maps_url", e.target.value)}
                placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/place/..."
                helperText={
                  data.venue.latitude && data.venue.longitude
                    ? "✓ Coordinates saved. You can use a short link now - it will be used for the 'Open in Maps' button."
                    : "Paste the full Google Maps URL first to extract coordinates, then you can replace with a short link."
                }
              />

              {/* Extract Address Button */}
              {data.venue.google_maps_url && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    onClick={extractAddressFromUrl}
                    disabled={extractingAddress}
                    loading={extractingAddress}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    {extractingAddress ? "Extracting..." : "Extract Address & Coordinates"}
                  </Button>
                  {extractSuccess && (
                    <span className="text-sm text-green-500 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      Address extracted!
                    </span>
                  )}
                  {extractError && (
                    <span className="text-sm text-red-500">{extractError}</span>
                  )}
                </div>
              )}

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

              {/* Address Fields - Manual Editing */}
              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Address</h3>
                <p className="text-sm text-secondary mb-4">
                  Enter the venue address manually below.
                </p>
                
                <div className="space-y-4">
                  <Input
                    label="Street Address"
                    value={data.venue.address || ""}
                    onChange={(e) => updateVenueField("address", e.target.value)}
                    placeholder="123 Main Street, 12345"
                    helperText="Street address with postal code if available"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="City"
                      value={data.venue.city || ""}
                      onChange={(e) => updateVenueField("city", e.target.value)}
                      placeholder="New York"
                    />

                    <Input
                      label="State/Province"
                      value={data.venue.state || ""}
                      onChange={(e) => updateVenueField("state", e.target.value)}
                      placeholder="NY"
                    />
                  </div>

                  <Input
                    label="Country"
                    value={data.venue.country || ""}
                    onChange={(e) => updateVenueField("country", e.target.value)}
                    placeholder="US"
                  />

                  {/* Manual Coordinates Entry */}
                  <div className="border-t border-border pt-4 mt-4">
                    <p className="text-sm text-secondary mb-3">
                      <strong>Map Coordinates</strong> - Required for map preview. Get these from Google Maps URL or enter manually.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Latitude"
                        type="number"
                        step="any"
                        value={data.venue.latitude || ""}
                        onChange={(e) => updateVenueField("latitude", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="-8.8123456"
                        helperText="e.g., -8.8123456"
                      />
                      <Input
                        label="Longitude"
                        type="number"
                        step="any"
                        value={data.venue.longitude || ""}
                        onChange={(e) => updateVenueField("longitude", e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="115.1234567"
                        helperText="e.g., 115.1234567"
                      />
                    </div>
                    <p className="text-xs text-secondary mt-2">
                      💡 Tip: In Google Maps, right-click on the location → "What&apos;s here?" to see coordinates
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => saveSettings("location")}
                  disabled={saving}
                  loading={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Location
                </Button>
                {savedTab === "location" && (
                  <div className="flex items-center gap-2 text-accent-success animate-in fade-in duration-300">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Saved!</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-primary">Branding</h2>

              {/* Image Upload Error */}
              {imageUploadError && (
                <div className="flex items-center gap-2 bg-accent-error/10 text-accent-error border border-accent-error/20 rounded-lg p-3">
                  <X className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm">{imageUploadError}</p>
                  <button
                    onClick={() => setImageUploadError(null)}
                    className="ml-auto p-1 hover:bg-accent-error/20 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Logo</label>
                <p className="text-xs text-secondary mb-3">
                  Recommended: 512×512px (square), PNG with transparent background. Max 5MB.
                </p>
                <div className="flex items-start gap-4">
                  {data.venue.logo_url ? (
                    <div className="relative w-32 h-32 border-2 border-border rounded-lg overflow-hidden flex-shrink-0">
                      <Image src={data.venue.logo_url} alt="Logo" fill sizes="128px" className="object-contain" />
                    </div>
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-secondary text-xs">No logo</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload("logo", file);
                      }}
                      className="hidden"
                      id="logo-upload"
                      disabled={uploadingImage === "logo"}
                    />
                    <label
                      htmlFor="logo-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 bg-glass border border-border rounded-lg text-sm cursor-pointer hover:bg-active transition-colors ${
                        uploadingImage === "logo" ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {uploadingImage === "logo" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Upload Logo
                        </>
                      )}
                    </label>
                    <p className="text-xs text-secondary">JPEG, PNG, or WebP</p>
                  </div>
                </div>
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">Cover Image</label>
                <p className="text-xs text-secondary mb-3">
                  Recommended: 1920×640px (3:1 aspect ratio), JPG or PNG. Max 5MB. This image appears at the top of your public venue page.
                </p>
                {data.venue.cover_image_url ? (
                  <div className="relative w-full h-48 border-2 border-border rounded-lg overflow-hidden mb-3">
                    <Image src={data.venue.cover_image_url} alt="Cover" fill sizes="100vw" className="object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-48 border-2 border-dashed border-border rounded-lg flex items-center justify-center mb-3">
                    <span className="text-secondary text-sm">No cover image</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload("cover", file);
                  }}
                  className="hidden"
                  id="cover-upload"
                  disabled={uploadingImage === "cover"}
                />
                <label
                  htmlFor="cover-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-glass border border-border rounded-lg text-sm cursor-pointer hover:bg-white/5 transition-colors ${
                    uploadingImage === "cover" ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {uploadingImage === "cover" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Cover
                    </>
                  )}
                </label>
              </div>

              <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-3">
                <p className="text-xs text-secondary">
                  <strong>Note:</strong> Images are uploaded immediately when selected and saved to the database. No need to click "Save Branding" for image changes.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media">
          <Card>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-primary">Gallery</h2>
              <p className="text-sm text-secondary">
                Upload photos to showcase your venue. You can select multiple images at once.
              </p>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleGalleryUpload(e.target.files)}
                  className="hidden"
                  id="gallery-upload"
                  disabled={uploadingFiles.length > 0}
                />
                <label 
                  htmlFor="gallery-upload" 
                  className={`cursor-pointer flex flex-col items-center gap-3 ${uploadingFiles.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploadingFiles.length > 0 ? (
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  ) : (
                    <ImagePlus className="h-10 w-10 text-secondary" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {uploadingFiles.length > 0 ? 'Uploading...' : 'Click to upload photos'}
                    </p>
                    <p className="text-xs text-secondary mt-1">
                      PNG, JPG, WEBP up to 10MB each
                    </p>
                  </div>
                </label>
              </div>

              {/* Upload Progress */}
              {uploadingFiles.length > 0 && (
                <div className="space-y-2 bg-raised rounded-lg p-4">
                  <p className="text-sm font-medium text-primary mb-3">
                    Uploading {uploadingFiles.length} {uploadingFiles.length === 1 ? 'file' : 'files'}...
                  </p>
                  {uploadingFiles.map((fileName) => {
                    const progress = uploadProgress[fileName] || 0;
                    const isError = progress === -1;
                    const isComplete = progress === 100;
                    
                    return (
                      <div key={fileName} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-primary truncate">{fileName}</p>
                          <div className="w-full bg-border rounded-full h-2 mt-1 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                isError ? 'bg-accent-error' : isComplete ? 'bg-accent-success' : 'bg-accent-secondary'
                              }`}
                              style={{ width: isError ? '100%' : `${progress}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-6">
                          {isComplete && <CheckCircle2 className="h-4 w-4 text-accent-success" />}
                          {isError && <X className="h-4 w-4 text-accent-error" />}
                          {!isComplete && !isError && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Success Message */}
              {uploadSuccess.length > 0 && (
                <div className="flex items-center gap-2 bg-accent-success/10 text-accent-success border border-accent-success/20 rounded-lg p-3">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm">
                    Successfully uploaded {uploadSuccess.length} {uploadSuccess.length === 1 ? 'image' : 'images'}!
                  </p>
                </div>
              )}

              {/* Error Message */}
              {uploadError && (
                <div className="flex items-center gap-2 bg-accent-error/10 text-accent-error border border-accent-error/20 rounded-lg p-3">
                  <X className="h-5 w-5 flex-shrink-0" />
                  <p className="text-sm">{uploadError}</p>
                  <button 
                    onClick={() => setUploadError(null)}
                    className="ml-auto p-1 hover:bg-accent-error/20 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Gallery Grid */}
              {(data.gallery || []).length === 0 ? (
                <div className="text-center py-12 text-secondary">
                  <ImagePlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No images yet. Upload some photos to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(data.gallery || []).map((image) => {
                    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
                    const supabaseProjectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
                    const imageUrl = image.storage_path.startsWith("http")
                      ? image.storage_path
                      : supabaseProjectRef
                      ? `https://${supabaseProjectRef}.supabase.co/storage/v1/object/public/venue-images/${image.storage_path}`
                      : image.storage_path;

                    return (
                      <div key={image.id} className="relative group border-2 border-border rounded-lg overflow-hidden">
                        <div className="relative aspect-square">
                          <Image
                            src={imageUrl}
                            alt={image.caption || "Gallery image"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {!image.is_hero && (
                            <button
                              onClick={() => handleSetHero(image.id)}
                              className="p-2 bg-accent-secondary text-void rounded-lg hover:bg-accent-secondary/80 transition-colors"
                              title="Set as hero image"
                            >
                              <Star className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm({ id: image.id, caption: image.caption || "this image" })}
                            className="p-2 bg-accent-error text-white rounded-lg hover:bg-accent-error/80 transition-colors"
                            title="Delete image"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {image.is_hero && (
                          <div className="absolute top-2 right-2 bg-accent-secondary text-void px-2 py-1 text-xs rounded-md flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Hero
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tags Tab */}
        <TabsContent value="tags">
          <Card>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-primary">Vibe Tags</h2>

              {Object.entries(TAG_OPTIONS).map(([type, options]) => {
                const typeTags = data.tags.filter((t) => t.tag_type === type);
                return (
                  <div key={type} className="space-y-2">
                    <label className="block text-sm font-medium text-primary capitalize">
                      {type.replace("_", " ")}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {options.map((option) => {
                        const isSelected = typeTags.some((t) => t.tag_value === option);
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => handleTagToggle(type as VenueTag["tag_type"], option)}
                            className={`px-3 py-1 text-sm border-2 transition-colors ${
                              isSelected
                                ? "bg-accent-secondary text-white border-accent-secondary"
                                : "bg-glass text-primary border-border hover:border-accent-secondary/50"
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => saveSettings("tags")}
                  disabled={saving}
                  loading={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Tags
                </Button>
                {savedTab === "tags" && (
                  <div className="flex items-center gap-2 text-accent-success animate-in fade-in duration-300">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Saved!</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies">
          <Card>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-primary">Policies</h2>

              <Input
                label="Dress Code"
                value={data.venue.dress_code || ""}
                onChange={(e) => updateVenueField("dress_code", e.target.value)}
                placeholder="e.g., Smart Casual, No Dress Code"
              />

              <Input
                label="Age Restriction"
                value={data.venue.age_restriction || ""}
                onChange={(e) => updateVenueField("age_restriction", e.target.value)}
                placeholder="e.g., 21+, 18+, All Ages"
              />

              <Textarea
                label="Entry Notes"
                value={data.venue.entry_notes || ""}
                onChange={(e) => updateVenueField("entry_notes", e.target.value)}
                rows={4}
                placeholder="Important information for attendees"
              />

              <Textarea
                label="Table & VIP Notes"
                value={data.venue.table_min_spend_notes || ""}
                onChange={(e) => updateVenueField("table_min_spend_notes", e.target.value)}
                rows={4}
                placeholder="Information about table reservations and VIP options"
              />

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => saveSettings("policies")}
                  disabled={saving}
                  loading={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Policies
                </Button>
                {savedTab === "policies" && (
                  <div className="flex items-center gap-2 text-accent-success animate-in fade-in duration-300">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Saved!</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults">
          <Card>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-primary">Default Settings</h2>

              <Textarea
                label="Default Registration Questions (JSON)"
                value={JSON.stringify(data.venue.default_registration_questions || [], null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    updateVenueField("default_registration_questions", parsed);
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                rows={8}
                className="font-mono text-xs"
              />

              <Textarea
                label="Default Commission Rules (JSON)"
                value={JSON.stringify(data.venue.default_commission_rules || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    updateVenueField("default_commission_rules", parsed);
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                rows={8}
                className="font-mono text-xs"
              />

              <Textarea
                label="Default Message Templates (JSON)"
                value={JSON.stringify(data.venue.default_message_templates || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    updateVenueField("default_message_templates", parsed);
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                rows={8}
                className="font-mono text-xs"
              />

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => saveSettings("defaults")}
                  disabled={saving}
                  loading={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Defaults
                </Button>
                {savedTab === "defaults" && (
                  <div className="flex items-center gap-2 text-accent-success animate-in fade-in duration-300">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Saved!</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Venue Pulse (Feedback) Tab */}
        <TabsContent value="feedback">
          <FeedbackSettingsTab venueId={data?.venue?.id} />
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      {data && (
        <Modal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title="Preview Public Venue Page"
          size="xl"
        >
          <div className="max-h-[80vh] overflow-y-auto bg-void">
            <div className="space-y-6">
              {/* Preview Header */}
              {data.venue.cover_image_url && (
                <div className="relative h-48 w-full overflow-hidden border-2 border-border">
                  <Image
                    src={data.venue.cover_image_url}
                    alt={data.venue.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <h2 className="text-2xl font-bold text-primary mb-2">{data.venue.name}</h2>
                {data.venue.description && (
                  <p className="text-primary mb-4">{data.venue.description}</p>
                )}
                {data.venue.address && (
                  <div className="flex items-center gap-2 text-secondary mb-4">
                    <MapPin className="h-4 w-4" />
                    <span>{data.venue.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { if (deleteConfirm) handleDeleteImage(deleteConfirm.id); }}
        title="Delete Image"
        message={`Are you sure you want to delete ${deleteConfirm?.caption || "this image"}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}


