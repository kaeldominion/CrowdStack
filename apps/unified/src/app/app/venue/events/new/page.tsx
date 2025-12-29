"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Card } from "@crowdstack/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function VenueNewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    organizer_id: "",
    start_time: "",
    end_time: "",
    capacity: "",
    selected_promoters: [] as string[],
    create_new_organizer: false,
    new_organizer_name: "",
    show_photo_email_notice: false,
    registration_type: "guestlist" as "guestlist" | "display_only" | "external_link",
    external_ticket_url: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const eventData: any = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : undefined,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
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
      router.push(`/app/venue/events/${data.event.id}`);
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

          <Input
            label="Capacity (Optional)"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            placeholder="500"
          />

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
