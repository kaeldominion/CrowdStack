"use client";

import { useState, useEffect } from "react";
import { LoadingSpinner } from "@crowdstack/ui";
import { OrganizerEventsPageClient } from "./OrganizerEventsPageClient";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  closed_at: string | null;
  venue_approval_status: string;
  venue_rejection_reason: string | null;
  registrations: number;
  checkins: number;
  payouts_pending: number;
  payouts_paid: number;
  flier_url: string | null;
  cover_image_url: string | null;
  capacity: number | null;
  venue: any | null;
  organizer: any | null;
}

export default function OrganizerEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/organizer/events");

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load events");
      }

      const data = await response.json();
      console.log("[OrganizerEventsPage] Loaded events:", data.events?.length || 0);
      setEvents(data.events || []);
    } catch (err: any) {
      console.error("[OrganizerEventsPage] Error loading events:", err);
      setError(err.message || "Failed to load events");
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-accent-error mb-4">{error}</p>
          <button
            onClick={loadEvents}
            className="text-accent-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return <OrganizerEventsPageClient initialEvents={events} />;
}
