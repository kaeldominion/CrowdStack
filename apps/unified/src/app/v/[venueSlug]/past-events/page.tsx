import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Container, Section } from "@crowdstack/ui";
import { Calendar, ArrowLeft } from "lucide-react";
import type { Venue } from "@crowdstack/shared/types";
import { PastEventRow } from "@/components/venue/PastEventRow";

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

// Helper to construct image URLs
function getImageUrl(storagePath: string): string {
  if (storagePath.startsWith("http")) {
    return storagePath;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || "";
  const result = projectRef
    ? `https://${projectRef}.supabase.co/storage/v1/object/public/venue-images/${storagePath}`
    : storagePath;
  return result;
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
                Past Events at {venue.name}
              </h1>
              <p className="text-white/60">
                {pastEvents.length} {pastEvents.length === 1 ? 'event' : 'events'}
              </p>
            </div>

            {/* Past Events List */}
            {pastEvents.length > 0 ? (
              <div className="space-y-2">
                {pastEvents.map((event) => (
                  <PastEventRow key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 sm:p-12 text-center">
                <Calendar className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Past Events</h3>
                <p className="text-white/60">
                  There are no past events at {venue.name} yet.
                </p>
              </div>
            )}
          </div>
        </Container>
      </Section>
    </div>
  );
}

