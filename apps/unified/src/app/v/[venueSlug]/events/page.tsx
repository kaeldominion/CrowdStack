import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, Badge } from "@crowdstack/ui";
import { Calendar, ArrowLeft } from "lucide-react";
import type { Venue } from "@crowdstack/shared/types";
import { EventCardRow } from "@/components/EventCardRow";
import { AttendeeEventCard } from "@/components/AttendeeEventCard";

interface VenueEvent {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  cover_image_url: string | null;
  flier_url: string | null;
  capacity: number | null;
  registration_count: number;
}

async function getVenue(slug: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}/api/venues/by-slug/${slug}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.venue;
  } catch (error) {
    console.error("Failed to fetch venue:", error);
    return null;
  }
}

export default async function AllEventsPage({
  params,
}: {
  params: { venueSlug: string };
}) {
  const venueData = await getVenue(params.venueSlug);

  if (!venueData) {
    notFound();
  }

  const venue: Venue = venueData;
  
  // Fetch all events (not limited)
  const eventsResponse = await fetch(
    `${process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}/api/venues/by-slug/${params.venueSlug}/all-events`,
    { cache: "no-store" }
  );

  let liveEvents: VenueEvent[] = [];
  let upcomingEvents: VenueEvent[] = [];
  let pastEvents: VenueEvent[] = [];

  if (eventsResponse.ok) {
    const eventsData = await eventsResponse.json();
    liveEvents = eventsData.live_events || [];
    upcomingEvents = eventsData.upcoming_events || [];
    pastEvents = eventsData.past_events || [];
  }

  const totalEvents = liveEvents.length + upcomingEvents.length + pastEvents.length;

  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Back button */}
        <Link 
          href={`/v/${params.venueSlug}`}
          className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to {venue.name}</span>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="page-title mb-2">
            All Events
          </h1>
          <p className="text-secondary">
            {totalEvents} {totalEvents === 1 ? 'event' : 'events'} at {venue.name}
          </p>
        </div>

        {/* Live Events */}
        {liveEvents.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Badge color="green" variant="solid" className="!rounded-full !px-3 !py-1">
                <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                LIVE
              </Badge>
              <h2 className="text-xl font-bold text-primary">Happening Now</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveEvents.map((event) => (
                <AttendeeEventCard 
                  key={event.id} 
                  event={{
                    id: event.id,
                    name: event.name,
                    slug: event.slug,
                    start_time: event.start_time,
                    flier_url: event.flier_url,
                    cover_image_url: event.cover_image_url,
                  }}
                  variant="live"
                  showShare={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="section-header mb-4">Upcoming Events</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.map((event) => (
                <AttendeeEventCard 
                  key={event.id} 
                  event={{
                    id: event.id,
                    name: event.name,
                    slug: event.slug,
                    start_time: event.start_time,
                    flier_url: event.flier_url,
                    cover_image_url: event.cover_image_url,
                  }}
                  showShare={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past Events */}
        {pastEvents.length > 0 && (
          <div className="mb-8">
            <h2 className="section-header text-secondary mb-4">Past Events</h2>
            <div className="space-y-3">
              {pastEvents.map((event) => (
                <EventCardRow 
                  key={event.id} 
                  event={event}
                  isPast
                />
              ))}
            </div>
          </div>
        )}

        {/* No Events State */}
        {totalEvents === 0 && (
          <Card className="!p-8 text-center border-dashed">
            <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">No Events</h3>
            <p className="text-secondary">
              There are no events at {venue.name} yet.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
