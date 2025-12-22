"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Badge, LoadingSpinner, Card } from "@crowdstack/ui";
import { Plus, Calendar, AlertCircle, Radio, Clock, History, Users, CheckCircle2, ArrowUpRight, MapPin } from "lucide-react";
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

  // Categorize events
  const { liveEvents, upcomingEvents, pastEvents, pendingEvents, rejectedEvents } = useMemo(() => {
    const now = new Date();
    const live: Event[] = [];
    const upcoming: Event[] = [];
    const past: Event[] = [];
    const pending: Event[] = [];
    const rejected: Event[] = [];

    events.forEach((event) => {
      const startTime = new Date(event.start_time);
      const endTime = event.end_time ? new Date(event.end_time) : null;

      // Track pending/rejected separately for alerts
      if (event.venue_approval_status === "pending") {
        pending.push(event);
      }
      if (event.venue_approval_status === "rejected") {
        rejected.push(event);
      }

      // Categorize by time
      if (startTime <= now && (!endTime || endTime >= now) && event.status === "published") {
        live.push(event);
      } else if (startTime > now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    });

    // Sort upcoming by start time ascending
    upcoming.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    // Sort past by start time descending
    past.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return { liveEvents: live, upcomingEvents: upcoming, pastEvents: past, pendingEvents: pending, rejectedEvents: rejected };
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner text="Loading events..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Your Events</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Manage and track all events you've created
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
        <div className="space-y-8">
          {/* Live Events Section */}
          {liveEvents.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                <h2 className="text-xl font-semibold text-foreground">Live Now</h2>
                <Badge variant="danger" className="text-xs">{liveEvents.length} Active</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveEvents.map((event) => (
                  <div key={event.id} className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl blur opacity-30 animate-pulse" />
                    <div className="relative">
                      <EventCard
                        event={event}
                        onClick={() => router.push(`/app/organizer/events/${event.id}`)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Events Section */}
          {upcomingEvents.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-indigo-400" />
                <h2 className="text-xl font-semibold text-foreground">Upcoming Events</h2>
                <span className="text-sm text-foreground-muted">({upcomingEvents.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => router.push(`/app/organizer/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past Events Section - Row View */}
          {pastEvents.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-foreground-muted" />
                <h2 className="text-xl font-semibold text-foreground">Event History</h2>
                <span className="text-sm text-foreground-muted">({pastEvents.length})</span>
              </div>
              <Card className="divide-y divide-border">
                {pastEvents.map((event) => {
                  const eventDate = new Date(event.start_time);
                  const conversionRate = event.registrations > 0 
                    ? Math.round((event.checkins / event.registrations) * 100) 
                    : 0;

                  return (
                    <Link 
                      key={event.id} 
                      href={`/app/organizer/events/${event.id}`}
                      className="flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {event.flier_url && (
                          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                            <img src={event.flier_url} alt="" className="w-full h-full object-cover opacity-80" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {event.name}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-foreground-muted mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            {event.venue && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3" />
                                {event.venue.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center min-w-[60px]">
                          <p className="font-semibold text-foreground">{event.registrations}</p>
                          <p className="text-xs text-foreground-muted">Registered</p>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className="font-semibold text-foreground">{event.checkins}</p>
                          <p className="text-xs text-foreground-muted">Checked In</p>
                        </div>
                        <div className="text-center min-w-[60px]">
                          <p className={`font-semibold ${conversionRate >= 70 ? 'text-success' : conversionRate >= 40 ? 'text-warning' : 'text-foreground-muted'}`}>
                            {conversionRate}%
                          </p>
                          <p className="text-xs text-foreground-muted">Conversion</p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-foreground-muted group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
