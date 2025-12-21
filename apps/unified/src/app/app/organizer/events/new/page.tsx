"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Card, Select, Checkbox } from "@crowdstack/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EventImageUpload } from "@/components/EventImageUpload";

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
    capacity: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    promoter_access_type: "public" as "public" | "invite_only",
    self_promote: true,
    selected_promoters: [] as string[],
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [flierImageFile, setFlierImageFile] = useState<File | null>(null);

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

  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const generateUniqueSlug = async (name: string) => {
    try {
      const response = await fetch("/api/events/generate-slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate unique slug");
      }

      const data = await response.json();
      return data.slug;
    } catch (error) {
      console.error("Error generating unique slug:", error);
      // Fallback to basic slug generation
      return generateSlugFromName(name);
    }
  };

  const handleNameChange = async (name: string) => {
    const baseSlug = generateSlugFromName(name);
    
    // Generate unique slug asynchronously
    const uniqueSlug = await generateUniqueSlug(name);
    
    setFormData({
      ...formData,
      name,
      slug: uniqueSlug,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const eventData: any = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        venue_id: formData.venue_id || undefined,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : undefined,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        timezone: formData.timezone,
        promoter_access_type: formData.promoter_access_type,
        self_promote: formData.self_promote,
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

      // Upload images if provided
      if (coverImageFile) {
        try {
          const coverFormData = new FormData();
          coverFormData.append("file", coverImageFile);
          await fetch(`/api/organizer/events/${eventId}/cover`, {
            method: "POST",
            body: coverFormData,
          });
        } catch (error) {
          console.error("Failed to upload cover image:", error);
          // Continue even if image upload fails
        }
      }

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
        <h1 className="text-3xl font-bold tracking-tighter text-white">Create New Event</h1>
        <p className="mt-2 text-sm text-white/60">
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

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              label="Start Date & Time"
              type="datetime-local"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />

            <Input
              label="End Date & Time"
              type="datetime-local"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full rounded-md bg-background border border-border px-3 py-2 text-sm text-foreground"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="America/Anchorage">Alaska Time (AKT)</option>
              <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
              <option value="America/Toronto">Toronto (ET)</option>
              <option value="America/Vancouver">Vancouver (PT)</option>
              <option value="Europe/London">London (GMT/BST)</option>
              <option value="Europe/Paris">Paris (CET/CEST)</option>
              <option value="Europe/Berlin">Berlin (CET/CEST)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Asia/Shanghai">Shanghai (CST)</option>
              <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
            </select>
            <p className="mt-1 text-xs text-foreground-muted">
              Timezone for event times
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Venue (Optional)</label>
              <select
                value={formData.venue_id}
                onChange={(e) => setFormData({ ...formData, venue_id: e.target.value })}
                className="w-full rounded-md bg-background border border-border px-3 py-2 text-sm text-foreground"
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
              label="Capacity (Optional)"
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              placeholder="500"
            />
          </div>

          {/* Image Uploads */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 border-t border-border pt-6">
            <EventImageUpload
              label="Cover Image"
              onUpload={async (file) => {
                setCoverImageFile(file);
                // Return a preview URL for display
                return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(file);
                });
              }}
              helperText="Main hero image for the event page (recommended: 16:9 aspect ratio)"
            />
            <EventImageUpload
              label="Event Flier"
              onUpload={async (file) => {
                setFlierImageFile(file);
                // Return a preview URL for display
                return new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.readAsDataURL(file);
                });
              }}
              helperText="Digital flier/poster for the event (optional)"
            />
          </div>

          {/* Promoter Settings */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-lg font-semibold text-white">Promoter Settings</h3>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Promoter Access</label>
              <select
                value={formData.promoter_access_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    promoter_access_type: e.target.value as "public" | "invite_only",
                  })
                }
                className="w-full rounded-md bg-background border border-border px-3 py-2 text-sm text-foreground"
              >
                <option value="public">Public - All promoters can request to promote</option>
                <option value="invite_only">Invite Only - Only invited promoters can promote</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="self_promote"
                checked={formData.self_promote}
                onChange={(e) => setFormData({ ...formData, self_promote: e.target.checked })}
                className="rounded border-border"
              />
              <label htmlFor="self_promote" className="text-sm text-foreground">
                Promote as yourself (add yourself as a promoter)
              </label>
            </div>

            {formData.promoter_access_type === "invite_only" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Invite Promoters
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-md p-3">
                  {promoters.map((promoter) => (
                    <div key={promoter.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`promoter-${promoter.id}`}
                        checked={formData.selected_promoters.includes(promoter.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              selected_promoters: [...formData.selected_promoters, promoter.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              selected_promoters: formData.selected_promoters.filter(
                                (id) => id !== promoter.id
                              ),
                            });
                          }
                        }}
                        className="rounded border-border"
                      />
                      <label
                        htmlFor={`promoter-${promoter.id}`}
                        className="text-sm text-foreground"
                      >
                        {promoter.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
