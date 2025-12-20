"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Badge, LoadingSpinner } from "@crowdstack/ui";
import { Plus, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import type { Organizer, Venue } from "@crowdstack/shared/types";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  venue_approval_status: string;
  venue_rejection_reason: string | null;
  registrations: number;
  checkins: number;
  flier_url: string | null;
  cover_image_url: string | null;
  venue: Venue | null;
  organizer: Organizer | null;
}

export default function OrganizerEventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await fetch("/api/organizer/events");
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading events..." />
      </div>
    );
  }

  // Check if there are any pending events
  const pendingEvents = events.filter((e) => e.venue_approval_status === "pending");
  const rejectedEvents = events.filter((e) => e.venue_approval_status === "rejected");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Events</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Manage your events and track performance
          </p>
        </div>
        <Link href="/app/organizer/events/new">
          <Button variant="primary" size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </Link>
      </div>

      {/* Pending Approval Alert */}
      {pendingEvents.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-warning">
              {pendingEvents.length} event{pendingEvents.length > 1 ? "s" : ""} pending venue approval
            </p>
            <p className="text-sm text-foreground-muted mt-1">
              These events are waiting to be approved by their respective venues before they can go live.
            </p>
          </div>
        </div>
      )}

      {/* Rejected Events Alert */}
      {rejectedEvents.length > 0 && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-danger">
              {rejectedEvents.length} event{rejectedEvents.length > 1 ? "s" : ""} rejected
            </p>
            <p className="text-sm text-foreground-muted mt-1">
              These events were not approved by the venue. You can edit and try a different venue.
            </p>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12 text-foreground-muted" />}
          title="No events yet"
          description="Create your first event to start tracking attendance and managing promoters."
          action={{
            label: "Create Event",
            href: "/app/organizer/events/new"
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onClick={() => router.push(`/app/organizer/events/${event.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
