import { notFound } from "next/navigation";
import { Container, Section, Button } from "@crowdstack/ui";
import { Calendar, MapPin, Share2 } from "lucide-react";
import { VenueHeader } from "@/components/venue/VenueHeader";
import { VenueGallery } from "@/components/venue/VenueGallery";
import { VenueMapCard } from "@/components/venue/VenueMapCard";
import { VenueTags } from "@/components/venue/VenueTags";
import { VenuePolicies } from "@/components/venue/VenuePolicies";
import { UpcomingEventsList } from "@/components/venue/UpcomingEventsList";
import { ShareButton } from "@/components/ShareButton";
import type { Venue, VenueGallery as VenueGalleryType, VenueTag } from "@crowdstack/shared/types";

async function getVenue(slug: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000"}/api/venues/by-slug/${slug}`, {
      cache: "no-store",
    });

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

export default async function VenuePage({
  params,
}: {
  params: { venueSlug: string };
}) {
  const venueData = await getVenue(params.venueSlug);

  if (!venueData) {
    notFound();
  }

  const venue: Venue = venueData;
  const gallery: VenueGalleryType[] = venueData.gallery || [];
  const tags: VenueTag[] = venueData.tags || [];
  const upcomingEvents = venueData.upcoming_events || [];

  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";
  const shareUrl = `${baseUrl}/v/${params.venueSlug}`;

  return (
    <div className="min-h-screen bg-background">
      <Section spacing="xl">
        <Container size="lg">
          <div className="space-y-8">
            {/* Venue Header */}
            <VenueHeader venue={venue} />

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              {upcomingEvents.length > 0 && (
                <Button
                  variant="primary"
                  size="lg"
                  href={`#upcoming-events`}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  View Events
                </Button>
              )}
              <ShareButton
                title={`${venue.name} - ${venue.tagline || "Venue"}`}
                text={venue.description || undefined}
                url={shareUrl}
                label="Share Venue"
              />
            </div>

            {/* Gallery */}
            {gallery.length > 0 && (
              <VenueGallery gallery={gallery} venueId={venue.id} />
            )}

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Map */}
              <VenueMapCard venue={venue} />

              {/* Tags */}
              {tags.length > 0 && <VenueTags tags={tags} />}
            </div>

            {/* Policies */}
            <VenuePolicies venue={venue} />

            {/* Upcoming Events */}
            <div id="upcoming-events">
              <UpcomingEventsList events={upcomingEvents} />
            </div>
          </div>
        </Container>
      </Section>
    </div>
  );
}

