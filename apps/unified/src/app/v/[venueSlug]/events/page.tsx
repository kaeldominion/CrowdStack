import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Container, Section } from "@crowdstack/ui";
import { Calendar, ArrowLeft } from "lucide-react";
import type { Venue } from "@crowdstack/shared/types";
import { EventRow } from "@/components/venue/EventRow";

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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background">
      <Section>
        <Container>
          <div className="py-8 md:py-12">
            {/* Back button */}
            <Link 
              href={`/v/${params.venueSlug}`}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to {venue.name}</span>
            </Link>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                All Events at {venue.name}
              </h1>
              <p className="text-white/60">
                {totalEvents} {totalEvents === 1 ? 'event' : 'events'}
              </p>
            </div>

            {/* Live Events */}
            {liveEvents.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">Happening Now</h2>
                </div>
                <div className="space-y-2">
                  {liveEvents.map((event) => (
                    <EventRow key={event.id} event={event} isLive />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Upcoming Events</h2>
                <div className="space-y-2">
                  {upcomingEvents.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-white/60 mb-4">Past Events</h2>
                <div className="space-y-2">
                  {pastEvents.map((event) => (
                    <EventRow key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}

            {/* No Events State */}
            {totalEvents === 0 && (
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
                <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Events</h3>
                <p className="text-white/60">
                  There are no events at {venue.name} yet.
                </p>
              </div>
            )}
          </div>
        </Container>
      </Section>
    </div>
  );
}

