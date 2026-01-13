"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Card, Select, Checkbox } from "@crowdstack/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EventImageUpload } from "@/components/EventImageUpload";
import { VENUE_EVENT_GENRES } from "@/lib/constants/genres";
import { TIMEZONE_GROUPS, getLocalTimezone } from "@/lib/constants/timezones";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    venue_id: "",
    start_time: "",
    end_time: "",
    max_guestlist_size: "",
    timezone: getLocalTimezone(),
    promoter_access_type: "public" as "public" | "invite_only",
    self_promote: true,
    selected_promoters: [] as string[],
    show_photo_email_notice: false,
    has_guestlist: true,
    ticket_sale_mode: "none" as "none" | "external" | "internal",
    is_public: true,
    external_ticket_url: "",
    music_tags: [] as string[],
  });
  const [flierImageFile, setFlierImageFile] = useState<File | null>(null);
  const [flierVideoFile, setFlierVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadVenues();
    loadPromoters();
  }, []);

  const loadVenues = async () => {
    try {
      const response = await fetch("/api/organizer/venues");
      if (response.ok) {
        const data = await response.json();
        setVenues(data.venues || []);
      }
    } catch (error) {
      console.error("Error loading venues:", error);
    }
  };

  const loadPromoters = async () => {
    try {
      const response = await fetch("/api/organizer/promoters");
      if (response.ok) {
        const data = await response.json();
        setPromoters(data.promoters || []);
      }
    } catch (error) {
      console.error("Error loading promoters:", error);
    }
  };

  const generateSlugFromName = (name: string, startDate?: string) => {
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    
    // Append date if provided
    if (startDate) {
      try {
        const date = new Date(startDate);
        if (!isNaN(date.getTime())) {
          const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
          const month = months[date.getMonth()];
          const day = date.getDate();
          const year = date.getFullYear();
          slug = `${slug}-${month}-${day}-${year}`;
        }
      } catch {}
    }
    
    return slug;
  };

  const generateUniqueSlug = async (name: string, startDate?: string) => {
    try {
      const response = await fetch("/api/events/generate-slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, startDate }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate unique slug");
      }

      const data = await response.json();
      return data.slug;
    } catch (error) {
      console.error("Error generating unique slug:", error);
      // Fallback to basic slug generation
      return generateSlugFromName(name, startDate);
    }
  };

  const handleNameChange = (name: string) => {
    // Update name immediately (synchronously) to prevent input lag
    const baseSlug = generateSlugFromName(name, formData.start_time);
    setFormData((prev) => ({
      ...prev,
      name,
      slug: baseSlug, // Use base slug immediately
    }));
    
    // Generate unique slug asynchronously and update only the slug
    generateUniqueSlug(name, formData.start_time).then((uniqueSlug) => {
      setFormData((prev) => {
        // Only update slug if the name hasn't changed since we started
        if (prev.name === name) {
          return { ...prev, slug: uniqueSlug };
        }
        return prev;
      });
    });
  };

  const handleStartTimeChange = (startTime: string) => {
    setFormData((prev) => ({ ...prev, start_time: startTime }));
    
    // Regenerate slug with new date if name exists
    if (formData.name) {
      const baseSlug = generateSlugFromName(formData.name, startTime);
      setFormData((prev) => ({ ...prev, slug: baseSlug }));
      
      generateUniqueSlug(formData.name, startTime).then((uniqueSlug) => {
        setFormData((prev) => {
          if (prev.start_time === startTime && prev.name === formData.name) {
            return { ...prev, slug: uniqueSlug };
          }
          return prev;
        });
      });
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate max_guestlist_size when guestlist is enabled
    if (formData.has_guestlist && !formData.max_guestlist_size) {
      alert("Max guestlist size is required when guestlist registration is enabled");
      return;
    }
    
    setLoading(true);

    try {
      const eventData: any = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        venue_id: formData.venue_id || undefined,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : undefined,
        max_guestlist_size: formData.max_guestlist_size ? parseInt(formData.max_guestlist_size) : undefined,
        timezone: formData.timezone,
        promoter_access_type: formData.promoter_access_type,
        self_promote: formData.self_promote,
        show_photo_email_notice: formData.show_photo_email_notice,
        has_guestlist: formData.has_guestlist,
        ticket_sale_mode: formData.ticket_sale_mode,
        is_public: formData.is_public,
        external_ticket_url: formData.ticket_sale_mode === "external" ? formData.external_ticket_url : undefined,
      };

      // Add promoters if selected
      if (formData.selected_promoters.length > 0) {
        eventData.promoters = formData.selected_promoters.map((promoterId) => ({
          promoter_id: promoterId,
          commission_type: "flat_per_head",
          commission_config: { amount_per_head: 0 }, // Default, should be configurable
        }));
      }

      // Add self-promotion if enabled
      if (formData.self_promote) {
        // This would need to get the organizer's promoter_id
        // For now, we'll handle this in the API
      }

      const response = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create event");
      }

      const data = await response.json();
      const eventId = data.event.id;

      // Add music tags if selected
      if (formData.music_tags.length > 0) {
        try {
          await Promise.all(
            formData.music_tags.map((tag) =>
              fetch(`/api/events/${eventId}/tags`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tag_type: "music", tag_value: tag }),
              })
            )
          );
        } catch (error) {
          console.error("Failed to add music tags:", error);
          // Continue even if tag creation fails
        }
      }

      // Upload flier image if provided
      if (flierImageFile) {
        try {
          const flierFormData = new FormData();
          flierFormData.append("file", flierImageFile);
          await fetch(`/api/organizer/events/${eventId}/flier`, {
            method: "POST",
            body: flierFormData,
          });
        } catch (error) {
          console.error("Failed to upload flier:", error);
          // Continue even if image upload fails
        }
      }

      // Upload video flier if provided
      if (flierVideoFile) {
        try {
          const videoFormData = new FormData();
          videoFormData.append("file", flierVideoFile);
          await fetch(`/api/organizer/events/${eventId}/video-flier`, {
            method: "POST",
            body: videoFormData,
          });
        } catch (error) {
          console.error("Failed to upload video flier:", error);
          // Continue even if video upload fails
        }
      }

      router.push(`/app/organizer/events/${eventId}`);
    } catch (error: any) {
      alert(error.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Link href="/app/organizer/events">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-primary">Create New Event</h1>
        <p className="mt-2 text-sm text-secondary">
          Set up a new event and start tracking attendance
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <Input
            label="Event Name"
            required
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Summer Music Festival 2024"
          />

          <Input
            label="URL Slug"
            required
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="summer-music-festival-2024"
            helperText="Used in the event URL (e.g., /e/summer-music-festival-2024)"
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your event..."
            rows={4}
          />

          {/* Music Tags */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-primary">Music Genres</label>
            <div className="flex flex-wrap gap-2">
              {VENUE_EVENT_GENRES.map((genre) => {
                const isSelected = formData.music_tags.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setFormData({
                          ...formData,
                          music_tags: formData.music_tags.filter((g) => g !== genre),
                        });
                      } else {
                        setFormData({
                          ...formData,
                          music_tags: [...formData.music_tags, genre],
                        });
                      }
                    }}
                    className={`px-3 py-1 text-sm border-2 transition-colors ${
                      isSelected
                        ? "bg-accent-secondary text-white border-accent-secondary"
                        : "bg-glass text-primary border-border hover:border-accent-secondary/50"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-secondary">
              Select the music genres for this event
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              label="Start Date & Time"
              type="datetime-local"
              required
              value={formData.start_time}
              onChange={(e) => handleStartTimeChange(e.target.value)}
            />

            <Input
              label="End Date & Time"
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full rounded-md bg-void border border-border px-3 py-2 text-sm text-primary"
            >
              {Object.entries(TIMEZONE_GROUPS).map(([region, timezones]) => (
                <optgroup key={region} label={region}>
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label} ({tz.offset})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1 text-xs text-secondary">
              Timezone for event times
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Venue (Optional)</label>
              <select
                value={formData.venue_id}
                onChange={(e) => setFormData({ ...formData, venue_id: e.target.value })}
                className="w-full rounded-md bg-void border border-border px-3 py-2 text-sm text-primary"
              >
                <option value="">Select a venue</option>
                {venues.map((venue) => (
                  <option key={venue.id} value={venue.id}>
                    {venue.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label={formData.has_guestlist ? "Max Guestlist Size (Required)" : "Max Guestlist Size (Optional)"}
              type="number"
              required={formData.has_guestlist}
              value={formData.max_guestlist_size}
              onChange={(e) => setFormData({ ...formData, max_guestlist_size: e.target.value })}
              placeholder="500"
              helperText={formData.has_guestlist 
                ? "Maximum number of guestlist registrations allowed for this event" 
                : "Maximum number of guestlist registrations. Leave empty if this event has no limit."}
            />
          </div>

          {/* Registration Settings */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-lg font-semibold text-primary">Registration Settings</h3>
            
            {/* Guestlist Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Enable Guestlist Registration</label>
                <p className="text-xs text-secondary">Attendees can register directly through CrowdStack with QR check-in</p>
              </div>
              <input
                type="checkbox"
                checked={formData.has_guestlist}
                onChange={(e) => setFormData({ ...formData, has_guestlist: e.target.checked })}
                className="w-5 h-5 rounded border-border text-accent-primary focus:ring-accent-primary"
              />
            </div>

            {/* Ticket Sales Mode */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Ticket Sales</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ticket_sale_mode"
                    value="none"
                    checked={formData.ticket_sale_mode === "none"}
                    onChange={(e) => setFormData({ ...formData, ticket_sale_mode: e.target.value as "none" | "external" | "internal" })}
                    className="w-4 h-4 text-accent-primary focus:ring-accent-primary"
                  />
                  <span className="text-sm text-primary">None - No ticket sales</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="ticket_sale_mode"
                    value="external"
                    checked={formData.ticket_sale_mode === "external"}
                    onChange={(e) => setFormData({ ...formData, ticket_sale_mode: e.target.value as "none" | "external" | "internal" })}
                    className="w-4 h-4 text-accent-primary focus:ring-accent-primary"
                  />
                  <span className="text-sm text-primary">External - Link to external ticketing (RA, Eventbrite, etc.)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer opacity-50">
                  <input
                    type="radio"
                    name="ticket_sale_mode"
                    value="internal"
                    checked={formData.ticket_sale_mode === "internal"}
                    onChange={(e) => setFormData({ ...formData, ticket_sale_mode: e.target.value as "none" | "external" | "internal" })}
                    disabled
                    className="w-4 h-4 text-accent-primary focus:ring-accent-primary"
                  />
                  <span className="text-sm text-primary">Internal - CrowdStack ticketing (coming soon)</span>
                </label>
              </div>
            </div>

            {formData.ticket_sale_mode === "external" && (
              <Input
                label="External Ticket URL"
                type="url"
                required
                value={formData.external_ticket_url}
                onChange={(e) => setFormData({ ...formData, external_ticket_url: e.target.value })}
                placeholder="https://ra.co/events/..."
                helperText="Full URL to your external ticketing page"
              />
            )}

            {/* Public Event Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Public Event</label>
                <p className="text-xs text-secondary">Event will be visible in public listings</p>
              </div>
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-5 h-5 rounded border-border text-accent-primary focus:ring-accent-primary"
              />
            </div>
          </div>

          {/* Flier Upload */}
          <div className="border-t border-border pt-6 space-y-6">
            <EventImageUpload
              label="Event Flier (Image)"
              aspectRatio="9:16"
              onUpload={async (file) => {
                setFlierImageFile(file);
                // Return a preview URL for display
                return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(file);
                });
              }}
              helperText="Digital flier/poster for the event (9:16 portrait format recommended)"
            />

            {/* Video Flier Upload */}
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Video Flier (Optional)
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Check file size (max 50MB - Supabase Storage limit)
                      const maxSizeBytes = 50 * 1024 * 1024;
                      if (file.size > maxSizeBytes) {
                        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
                        alert(`Video file (${fileSizeMB}MB) too large. Maximum size is 50MB. Please compress your video or use a smaller file.`);
                        return;
                      }
                      setFlierVideoFile(file);
                      setVideoPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                  className="hidden"
                  id="video-flier-upload"
                />
                <label htmlFor="video-flier-upload" className="cursor-pointer">
                  {videoPreviewUrl ? (
                    <div className="relative mx-auto w-32 aspect-[9/16] rounded-lg overflow-hidden bg-black">
                      <video
                        src={videoPreviewUrl}
                        className="w-full h-full object-contain"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFlierVideoFile(null);
                          setVideoPreviewUrl(null);
                        }}
                        className="absolute top-1 right-1 p-1 bg-void/80 rounded-full text-primary hover:bg-void/90"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="py-6">
                      <svg className="mx-auto h-12 w-12 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-primary">Click to upload video</p>
                      <p className="mt-1 text-xs text-secondary">MP4, WebM, MOV · Max 50MB · 9:16 format recommended</p>
                    </div>
                  )}
                </label>
              </div>
              <p className="mt-1 text-xs text-secondary">
                Short video flier for enhanced promotion (max 30 seconds recommended)
              </p>
            </div>
          </div>

          {/* Promoter Settings */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-lg font-semibold text-primary">Promoter Settings</h3>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">Promoter Access</label>
              <select
                value={formData.promoter_access_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    promoter_access_type: e.target.value as "public" | "invite_only",
                  })
                }
                className="w-full rounded-md bg-void border border-border px-3 py-2 text-sm text-primary"
              >
                <option value="invite_only">Invite Only - Only invited promoters can promote</option>
                <option value="public">Public - Promoters can be added manually (request feature disabled)</option>
              </select>
              <p className="mt-1 text-xs text-secondary">
                Promoters must be added manually with payment terms defined. Request feature is currently disabled.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="self_promote"
                checked={formData.self_promote}
                onChange={(e) => setFormData({ ...formData, self_promote: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="self_promote" className="text-sm text-primary">
                Promote as yourself (add yourself as a promoter)
              </label>
            </div>
          </div>

          {/* Photo Email Notice Setting */}
          <div className="space-y-2 border-t border-border pt-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show_photo_email_notice"
                checked={formData.show_photo_email_notice}
                onChange={(e) => setFormData({ ...formData, show_photo_email_notice: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="show_photo_email_notice" className="text-sm text-primary">
                Show photo email notice on registration success
              </label>
            </div>
            <p className="text-xs text-secondary ml-6">
              If enabled, attendees will see a message on the registration success page that event photos will be sent to their email in a few days.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Link href="/app/organizer/events">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" loading={loading}>
              Create Event
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
