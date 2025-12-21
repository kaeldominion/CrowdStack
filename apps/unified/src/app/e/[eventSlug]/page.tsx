import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MobileFlierExperience } from "@/components/MobileFlierExperience";
import { EventPageContent } from "./EventPageContent";
import { MobileStickyCTA } from "@/components/MobileStickyCTA";
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
  // In production on Vercel, always use the custom domain
  if (process.env.VERCEL_ENV === "production") {
    return "https://crowdstack.app";
  }
  // For preview deployments, use VERCEL_URL
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
        venue:venues(id, name, slug, address, city, state, country, google_maps_url)
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

  // For events with fliers, show mobile flier experience on mobile and regular content on desktop
  // For events without fliers, show regular content everywhere
  if (event.flier_url) {
    return (
      <>
        {/* Blurred Flier Background - Fixed, fills entire viewport */}
        <div 
          className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.flier_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: 'blur(60px)',
              transform: 'scale(1.3)',
              opacity: 0.4,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/70" />
        </div>

        {/* Mobile: Flier-first flip experience - renders as fixed overlay */}
        <MobileFlierExperience
          flierUrl={event.flier_url}
          eventName={event.name}
        >
          <EventPageContent
            event={event}
            params={params}
            shareUrl={shareUrl}
            startDate={startDate}
            endDate={endDate}
            isUpcoming={isUpcoming}
            isLive={isLive}
            isMobileFlierView={true}
          />
        </MobileFlierExperience>

        {/* Desktop: Standard layout - hidden on mobile since MobileFlierExperience handles it */}
        <div className="hidden lg:block min-h-screen relative z-10 pt-20">
          <EventPageContent
            event={event}
            params={params}
            shareUrl={shareUrl}
            startDate={startDate}
            endDate={endDate}
            isUpcoming={isUpcoming}
            isLive={isLive}
            isMobileFlierView={false}
          />
        </div>

        {/* Mobile Sticky CTA - Always visible on mobile, even during flier view */}
        <MobileStickyCTA
          href={`/e/${params.eventSlug}/register`}
          label="Register Now"
          eventName={event.name}
        />
      </>
    );
  }

  // No flier - standard layout for all devices
  return (
    <>
      <div className="min-h-screen pt-20">
        <EventPageContent
          event={event}
          params={params}
          shareUrl={shareUrl}
          startDate={startDate}
          endDate={endDate}
          isUpcoming={isUpcoming}
          isLive={isLive}
          isMobileFlierView={false}
        />
      </div>

      {/* Mobile Sticky CTA */}
      <MobileStickyCTA
        href={`/e/${params.eventSlug}/register`}
        label="Register Now"
        eventName={event.name}
      />
    </>
  );
}

