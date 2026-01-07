"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Badge, Card } from "@crowdstack/ui";
import { Plus, Calendar, AlertCircle, Clock, History, MapPin, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";

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
  venue: any | null;
  organizer: any | null;
}

interface OrganizerEventsPageClientProps {
  initialEvents: Event[];
}

export function OrganizerEventsPageClient({ initialEvents }: OrganizerEventsPageClientProps) {
  const router = useRouter();

  // Categorize events
  const { liveEvents, upcomingEvents, pastEvents, pendingEvents, rejectedEvents } = useMemo(() => {
    const now = new Date();
    const live: Event[] = [];
    const upcoming: Event[] = [];
    const past: Event[] = [];
    const pending: Event[] = [];
    const rejected: Event[] = [];

    initialEvents.forEach((event) => {
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
  }, [initialEvents]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary uppercase tracking-tight mb-2">Your Events</h1>
          <p className="text-sm text-secondary">
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
        <Card className="border-accent-warning/30 bg-accent-warning/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-accent-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-accent-warning">
                {pendingEvents.length} event{pendingEvents.length > 1 ? "s" : ""} pending venue approval
              </p>
              <p className="text-sm text-secondary mt-1">
                These events are waiting to be approved by their respective venues before they can go live.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Rejected Events Alert */}
      {rejectedEvents.length > 0 && (
        <Card className="border-accent-error/30 bg-accent-error/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-accent-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-accent-error">
                {rejectedEvents.length} event{rejectedEvents.length > 1 ? "s" : ""} rejected
              </p>
              <p className="text-sm text-secondary mt-1">
                These events were not approved by the venue. You can edit and try a different venue.
              </p>
            </div>
          </div>
        </Card>
      )}

      {initialEvents.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12 text-secondary" />}
          title="No events yet"
          description="Create your first event to start tracking attendance and managing promoters."
          action={{
            label: "Create Event",
            href: "/app/organizer/events/new"
          }}
        />
      ) : (
        <div className="space-y-4">
          {/* Live Events Section */}
          {liveEvents.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-accent-error rounded-full animate-pulse flex-shrink-0 mt-0.5" />
                  <h2 className="section-header !mb-0">Live Now</h2>
                </div>
                <Badge variant="danger" className="!text-[10px]">{liveEvents.length} Active</Badge>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {liveEvents.map((event) => (
                  <div key={event.id} className="relative">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-accent-error via-accent-warning to-accent-error rounded-2xl blur opacity-30 animate-pulse" />
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
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-accent-secondary flex-shrink-0 mt-0.5" />
                  <h2 className="section-header !mb-0">Upcoming Events</h2>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                  ({upcomingEvents.length})
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                  <h2 className="section-header !mb-0">Event History</h2>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-secondary">
                  ({pastEvents.length})
                </span>
              </div>
              <div className="space-y-2">
                {pastEvents.map((event) => {
                  const eventDate = new Date(event.start_time);
                  const conversionRate = event.registrations > 0 
                    ? Math.round((event.checkins / event.registrations) * 100) 
                    : 0;

                  return (
                    <Link 
                      key={event.id} 
                      href={`/app/organizer/events/${event.id}`}
                      className="block"
                    >
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-glass border border-border-subtle hover:border-accent-primary/30 hover:bg-active/50 transition-all cursor-pointer group">
                        {/* Thumbnail */}
                        {event.flier_url && (
                          <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-border-subtle bg-raised">
                            <img src={event.flier_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        
                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-primary line-clamp-1 group-hover:text-accent-secondary transition-colors">
                            {event.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 text-sm text-secondary">
                            <Calendar className="h-3 w-3 text-muted flex-shrink-0" />
                            <span>{eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                            <span className="text-muted">•</span>
                            <span>{eventDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                          </div>
                          {event.venue && (
                            <div className="flex items-center gap-1.5 mt-0.5 text-sm text-secondary">
                              <MapPin className="h-3 w-3 text-muted flex-shrink-0" />
                              <span className="line-clamp-1">{event.venue.name}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Stats */}
                        <div className="hidden sm:flex items-center gap-4 lg:gap-6">
                          <div className="text-center min-w-[45px]">
                            <span className="text-sm font-bold text-primary">{event.registrations}</span>
                            <p className="font-mono text-[8px] uppercase tracking-widest text-muted">Reg.</p>
                          </div>
                          <div className="text-center min-w-[45px]">
                            <span className="text-sm font-bold text-accent-success">{event.checkins}</span>
                            <p className="font-mono text-[8px] uppercase tracking-widest text-muted">In</p>
                          </div>
                          <div className="text-center min-w-[45px]">
                            <span className={`text-sm font-bold ${conversionRate >= 70 ? "text-accent-success" : conversionRate >= 40 ? "text-accent-warning" : "text-secondary"}`}>
                              {conversionRate}%
                            </span>
                            <p className="font-mono text-[8px] uppercase tracking-widest text-muted">Conv.</p>
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        <ArrowUpRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

