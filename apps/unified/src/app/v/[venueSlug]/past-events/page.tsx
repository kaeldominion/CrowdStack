import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@crowdstack/ui";
import { Calendar, ArrowLeft } from "lucide-react";
import type { Venue } from "@crowdstack/shared/types";
import { EventCardRow } from "@/components/EventCardRow";

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

export default async function PastEventsPage({
  params,
}: {
  params: { venueSlug: string };
}) {
  const venueData = await getVenue(params.venueSlug);

  if (!venueData) {
    notFound();
  }

  const venue: Venue = venueData;
  const pastEvents: VenueEvent[] = venueData.past_events || [];

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
            Past Events
          </h1>
          <p className="text-secondary">
            {pastEvents.length} {pastEvents.length === 1 ? 'event' : 'events'} at {venue.name}
          </p>
        </div>

        {/* Past Events List */}
        {pastEvents.length > 0 ? (
          <div className="space-y-3">
            {pastEvents.map((event) => (
              <EventCardRow 
                key={event.id} 
                event={event} 
                isPast
                registrationCount={event.registration_count}
              />
            ))}
          </div>
        ) : (
          <Card className="!p-8 text-center border-dashed">
            <Calendar className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">No Past Events</h3>
            <p className="text-secondary">
              There are no past events at {venue.name} yet.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
