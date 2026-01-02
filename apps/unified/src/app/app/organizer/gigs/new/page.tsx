"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Textarea, Card, Select, Checkbox } from "@crowdstack/ui";
import { ArrowLeft, Search, X } from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
}

interface DJ {
  id: string;
  handle: string;
  name: string;
  profile_image_url: string | null;
}

export default function NewGigPostingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [formData, setFormData] = useState({
    event_id: "",
    title: "",
    description: "",
    requirements: "",
    payment_amount: "",
    payment_currency: "USD",
    show_payment: true,
    posting_type: "invite_only" as "invite_only" | "open",
    deadline: "",
  });

  const [djSearchQuery, setDjSearchQuery] = useState("");
  const [djSearchResults, setDjSearchResults] = useState<DJ[]>([]);
  const [selectedDJs, setSelectedDJs] = useState<DJ[]>([]);
  const [searchingDJs, setSearchingDJs] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (djSearchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchDJs(djSearchQuery);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDjSearchResults([]);
    }
  }, [djSearchQuery]);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/organizer/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const searchDJs = async (query: string) => {
    try {
      setSearchingDJs(true);
      const response = await fetch(`/api/djs/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Filter out already selected DJs
        const filtered = (data.djs || []).filter(
          (dj: DJ) => !selectedDJs.find((s) => s.id === dj.id)
        );
        setDjSearchResults(filtered);
      }
    } catch (error) {
      console.error("Error searching DJs:", error);
    } finally {
      setSearchingDJs(false);
    }
  };

  const addDJ = (dj: DJ) => {
    if (!selectedDJs.find((s) => s.id === dj.id)) {
      setSelectedDJs([...selectedDJs, dj]);
      setDjSearchQuery("");
      setDjSearchResults([]);
    }
  };

  const removeDJ = (djId: string) => {
    setSelectedDJs(selectedDJs.filter((d) => d.id !== djId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.event_id || !formData.title) {
      alert("Event and title are required");
      return;
    }

    if (formData.show_payment && !formData.payment_amount) {
      alert("Payment amount is required when showing payment");
      return;
    }

    if (formData.posting_type === "invite_only" && selectedDJs.length === 0) {
      alert("Please select at least one DJ for invite-only postings");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/organizer/gigs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          payment_amount: formData.show_payment ? parseFloat(formData.payment_amount) : null,
          dj_ids: formData.posting_type === "invite_only" ? selectedDJs.map((d) => d.id) : [],
          deadline: formData.deadline || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create gig posting");
      }

      const data = await response.json();
      router.push(`/app/organizer/gigs/${data.gig.id}`);
    } catch (error: any) {
      alert(error.message || "Failed to create gig posting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/app/organizer/gigs">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Gigs
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Post New Gig</h1>
        <p className="text-secondary">Create a gig posting to book DJs for your event</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Select
            label="Event"
            required
            value={formData.event_id}
            onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
            options={[
              { value: "", label: "Select an event" },
              ...events.map((event) => ({
                value: event.id,
                label: `${event.name} - ${new Date(event.start_time).toLocaleDateString()}`,
              })),
            ]}
          />

          <Input
            label="Gig Title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Main Stage DJ Set"
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the gig, set times, requirements..."
            rows={4}
          />

          <Textarea
            label="Requirements (Optional)"
            value={formData.requirements}
            onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
            placeholder="Equipment needed, genre preferences, etc."
            rows={3}
          />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.show_payment}
                onChange={(checked) => setFormData({ ...formData, show_payment: checked })}
              />
              <label className="text-sm text-primary">Show payment amount to DJs</label>
            </div>

            {formData.show_payment && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Payment Amount"
                  type="number"
                  step="0.01"
                  required={formData.show_payment}
                  value={formData.payment_amount}
                  onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                  placeholder="0.00"
                />
                <Select
                  label="Currency"
                  value={formData.payment_currency}
                  onChange={(e) => setFormData({ ...formData, payment_currency: e.target.value })}
                  options={[
                    { value: "USD", label: "USD" },
                    { value: "IDR", label: "IDR" },
                    { value: "EUR", label: "EUR" },
                    { value: "GBP", label: "GBP" },
                  ]}
                />
              </div>
            )}
          </div>

          <Select
            label="Posting Type"
            required
            value={formData.posting_type}
            onChange={(e) =>
              setFormData({ ...formData, posting_type: e.target.value as "invite_only" | "open" })
            }
            options={[
              { value: "invite_only", label: "Invite Only (Select specific DJs)" },
              { value: "open", label: "Open (All DJs can see and apply)" },
            ]}
          />

          {formData.posting_type === "invite_only" && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-primary">Select DJs to Invite</label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" />
                <Input
                  placeholder="Search DJs by name or handle..."
                  value={djSearchQuery}
                  onChange={(e) => setDjSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {djSearchResults.length > 0 && (
                <div className="border border-border-subtle rounded-lg p-2 max-h-48 overflow-y-auto">
                  {djSearchResults.map((dj) => (
                    <div
                      key={dj.id}
                      className="flex items-center justify-between p-2 hover:bg-surface-hover rounded cursor-pointer"
                      onClick={() => addDJ(dj)}
                    >
                      <div className="flex items-center gap-3">
                        {dj.profile_image_url && (
                          <img
                            src={dj.profile_image_url}
                            alt={dj.name}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div>
                          <div className="font-medium text-primary">{dj.name}</div>
                          <div className="text-sm text-secondary">@{dj.handle}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedDJs.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-primary">
                    Selected DJs ({selectedDJs.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedDJs.map((dj) => (
                      <div
                        key={dj.id}
                        className="flex items-center gap-2 bg-surface-hover px-3 py-1 rounded-full"
                      >
                        <span className="text-sm text-primary">{dj.name}</span>
                        <button
                          type="button"
                          onClick={() => removeDJ(dj.id)}
                          className="text-secondary hover:text-primary"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Input
            label="Response Deadline (Optional)"
            type="datetime-local"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
          />

          <div className="flex items-center gap-4">
            <Button type="submit" loading={loading}>
              Create Gig Posting
            </Button>
            <Link href="/app/organizer/gigs">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}

