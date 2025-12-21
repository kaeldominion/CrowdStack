import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MobileFlierExperience } from "@/components/MobileFlierExperience";
import { EventPageContent } from "./EventPageContent";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

// Force dynamic rendering to prevent caching stale organizer data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

async function getEvent(slug: string) {
  try {
    const supabase = createServiceRoleClient();

    // Get published event by slug
    // Explicitly specify foreign key to ensure correct organizer join
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(`
        *,
        organizer:organizers!events_organizer_id_fkey(id, name),
        venue:venues(id, name, slug, address, city, state, country)
      `)
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (eventError || !event) {
      return null;
    }

    // Get registration count
    const { count: registrationCount } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);

    return {
      ...event,
      registration_count: registrationCount || 0,
    };
  } catch (error) {
    console.error("Failed to fetch event:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { eventSlug: string };
}): Promise<Metadata> {
  const event = await getEvent(params.eventSlug);

  if (!event) {
    return {
      title: "Event Not Found",
    };
  }

  const baseUrl = getBaseUrl();
  const eventUrl = `${baseUrl}/e/${params.eventSlug}`;
  const startDate = new Date(event.start_time);
  const venueLocation = event.venue
    ? [
        event.venue.name,
        event.venue.city,
        event.venue.state,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  const description = event.description
    ? event.description.slice(0, 160)
    : `${event.name} - ${startDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}${venueLocation ? ` at ${venueLocation}` : ""}`;

  const imageUrl = event.flier_url || `${baseUrl}/og-default.png`;

  return {
    title: `${event.name} | CrowdStack`,
    description,
    openGraph: {
      title: event.name,
      description,
      url: eventUrl,
      siteName: "CrowdStack",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: event.name,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: event.name,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: eventUrl,
    },
  };
}

export default async function EventPage({
  params,
}: {
  params: { eventSlug: string };
}) {
  const event = await getEvent(params.eventSlug);

  if (!event) {
    notFound();
  }

  const startDate = new Date(event.start_time);
  const endDate = event.end_time ? new Date(event.end_time) : null;

  const baseUrl = getBaseUrl();
  const shareUrl = `${baseUrl}/e/${params.eventSlug}`;

  // Determine if event is upcoming, live, or past
  const now = new Date();
  const isUpcoming = now < startDate;
  const isLive = now >= startDate && (!endDate || now < endDate);

  // If flier exists on mobile, wrap in flier experience
  if (event.flier_url) {
  return (
      <>
        {/* Mobile: Flier-first experience */}
        <MobileFlierExperience
          flierUrl={event.flier_url}
          eventName={event.name}
        >
    <div className="min-h-screen bg-background">
            <EventPageContent
              event={event}
              params={params}
              shareUrl={shareUrl}
              startDate={startDate}
              endDate={endDate}
              isUpcoming={isUpcoming}
              isLive={isLive}
            />
          </div>
        </MobileFlierExperience>

        {/* Desktop: Normal layout */}
        <div className="hidden lg:block min-h-screen bg-background">
          <EventPageContent
            event={event}
            params={params}
            shareUrl={shareUrl}
            startDate={startDate}
            endDate={endDate}
            isUpcoming={isUpcoming}
            isLive={isLive}
          />
        </div>
      </>
    );
  }

  // No flier - normal layout for all devices
  return (
    <div className="min-h-screen bg-background">
      <EventPageContent
        event={event}
        params={params}
        shareUrl={shareUrl}
        startDate={startDate}
        endDate={endDate}
        isUpcoming={isUpcoming}
        isLive={isLive}
      />
    </div>
  );
}

