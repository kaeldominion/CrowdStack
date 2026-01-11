"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Card } from "@crowdstack/ui";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { VENUE_EVENT_GENRES } from "@/lib/constants/genres";
import { TIMEZONE_GROUPS, getLocalTimezone } from "@/lib/constants/timezones";

export default function VenueNewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [flierFile, setFlierFile] = useState<File | null>(null);
  const [flierPreview, setFlierPreview] = useState<string | null>(null);
  const [uploadingFlier, setUploadingFlier] = useState(false);
  const flierInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    organizer_id: "",
    start_time: "",
    end_time: "",
    capacity: "",
    timezone: getLocalTimezone(),
    selected_promoters: [] as string[],
    create_new_organizer: false,
    new_organizer_name: "",
    show_photo_email_notice: false,
    registration_type: "guestlist" as "guestlist" | "display_only" | "external_link",
    external_ticket_url: "",
    music_tags: [] as string[],
  });

  useEffect(() => {
    loadOrganizers();
    loadPromoters();
  }, []);

  const loadOrganizers = async () => {
    try {
      const response = await fetch("/api/venue/organizers");
      if (response.ok) {
        const data = await response.json();
        setOrganizers(data.organizers || []);
      }
    } catch (error) {
      console.error("Error loading organizers:", error);
    }
  };

  const loadPromoters = async () => {
    try {
      const response = await fetch("/api/venue/promoters");
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

  const handleFlierSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Please select a JPEG, PNG, or WebP image");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Image must be less than 10MB");
      return;
    }

    setFlierFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFlierPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeFlier = () => {
    setFlierFile(null);
    setFlierPreview(null);
    if (flierInputRef.current) {
      flierInputRef.current.value = "";
    }
  };

  const uploadFlier = async (eventId: string): Promise<string | null> => {
    if (!flierFile) return null;

    setUploadingFlier(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", flierFile);
      formDataUpload.append("eventId", eventId);
      formDataUpload.append("type", "flier");

      const response = await fetch("/api/events/upload-image", {
        method: "POST",
        body: formDataUpload,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload flier");
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error("Error uploading flier:", error);
      return null;
    } finally {
      setUploadingFlier(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First upload flier if selected (we need to create event first to get ID)
      // So we'll create with flier_url: null, then update after upload
      const eventData: any = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : undefined,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        timezone: formData.timezone,
        organizer_id: formData.organizer_id || undefined,
        create_new_organizer: formData.create_new_organizer,
        new_organizer_name: formData.new_organizer_name || undefined,
        show_photo_email_notice: formData.show_photo_email_notice,
        registration_type: formData.registration_type,
        external_ticket_url: formData.registration_type === "external_link" ? formData.external_ticket_url : undefined,
        promoters: formData.selected_promoters.map((promoterId) => ({
          promoter_id: promoterId,
          commission_type: "flat_per_head",
          commission_config: { amount_per_head: 0 },
        })),
      };

      const response = await fetch("/api/venue/events/create", {
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

      // Upload flier if selected
      if (flierFile) {
        const flierUrl = await uploadFlier(eventId);
        if (flierUrl) {
          // Update event with flier URL
          await fetch(`/api/venue/events/${eventId}/edit`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ flier_url: flierUrl }),
          });
        }
      }

      router.push(`/app/venue/events/${eventId}`);
    } catch (error: any) {
      alert(error.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Link href="/app/venue/events">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tighter text-primary">Create New Event</h1>
        <p className="mt-2 text-sm text-secondary">
          Create an event at your venue
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

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">Timezone</label>
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
              Event times will be displayed in this timezone
            </p>
          </div>

          <Input
            label="Capacity (Optional)"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            placeholder="500"
          />

          {/* Flier Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-primary">Event Flier</label>
            <input
              ref={flierInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFlierSelect}
              className="hidden"
            />

            {flierPreview ? (
              <div className="relative w-full max-w-xs">
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-border">
                  <Image
                    src={flierPreview}
                    alt="Flier preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={removeFlier}
                  className="absolute -top-2 -right-2 p-1 bg-accent-error rounded-full text-white hover:opacity-80"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => flierInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg hover:border-accent-secondary/50 transition-colors text-secondary hover:text-primary"
              >
                <Upload className="h-5 w-5" />
                <span>Upload flier image</span>
              </button>
            )}
            <p className="text-xs text-secondary">
              JPEG, PNG or WebP, max 10MB. Recommended aspect ratio 3:4
            </p>
          </div>

          {/* Registration Type */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-lg font-semibold text-primary">Registration Settings</h3>
            
            <div>
              <label className="block text-sm font-medium text-primary mb-2">Registration Type</label>
              <select
                value={formData.registration_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    registration_type: e.target.value as "guestlist" | "display_only" | "external_link",
                  })
                }
                className="w-full rounded-md bg-void border border-border px-3 py-2 text-sm text-primary"
              >
                <option value="guestlist">Guestlist - Attendees register through CrowdStack</option>
                <option value="display_only">Display Only - Show event info, no registration</option>
                <option value="external_link">External Tickets - Link to external ticketing (RA, Eventbrite, etc.)</option>
              </select>
              <p className="mt-1 text-xs text-secondary">
                {formData.registration_type === "guestlist" && "Attendees can register directly through CrowdStack with QR check-in."}
                {formData.registration_type === "display_only" && "Event will be visible but no registration button will be shown."}
                {formData.registration_type === "external_link" && "A \"Get Tickets\" button will link to your external ticketing page."}
              </p>
            </div>

            {formData.registration_type === "external_link" && (
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
          </div>

          {/* Organizer Selection */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-lg font-semibold text-primary">Organizer</h3>

            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                id="create_new_organizer"
                checked={formData.create_new_organizer}
                onChange={(e) =>
                  setFormData({ ...formData, create_new_organizer: e.target.checked })
                }
                className="rounded border-border"
              />
              <label htmlFor="create_new_organizer" className="text-sm text-primary">
                Create new organizer
              </label>
            </div>

            {formData.create_new_organizer ? (
              <Input
                label="Organizer Name"
                required
                value={formData.new_organizer_name}
                onChange={(e) =>
                  setFormData({ ...formData, new_organizer_name: e.target.value })
                }
                placeholder="Event Organizer Name"
              />
            ) : (
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Select Organizer
                </label>
                <select
                  value={formData.organizer_id}
                  onChange={(e) => setFormData({ ...formData, organizer_id: e.target.value })}
                  className="w-full rounded-md bg-void border border-border px-3 py-2 text-sm text-primary"
                >
                  <option value="">Select an organizer</option>
                  {organizers.map((organizer) => (
                    <option key={organizer.id} value={organizer.id}>
                      {organizer.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Direct Promoter Assignment */}
          <div className="space-y-4 border-t border-border pt-6">
            <h3 className="text-lg font-semibold text-primary">Assign Promoters (Optional)</h3>
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
                  <label htmlFor={`promoter-${promoter.id}`} className="text-sm text-primary">
                    {promoter.name}
                  </label>
                </div>
              ))}
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
            <Link href="/app/venue/events">
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
