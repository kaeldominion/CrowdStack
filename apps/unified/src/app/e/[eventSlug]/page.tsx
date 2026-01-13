import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import { MobileScrollExperience } from "@/components/MobileScrollExperience";
import { EventPageContent } from "./EventPageContent";
import { ReferralTracker } from "@/components/ReferralTracker";
import { MobileStickyCTAWrapper } from "./MobileStickyCTAWrapper";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

// ISR: Revalidate event pages every 30 seconds (more aggressive caching for performance)
// Events change more frequently than venues (registration counts, status updates)
export const revalidate = 30;

// Force static generation with ISR - without this, dynamic routes may be treated as
// server-side rendered and not cached
export const dynamic = 'force-static';

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

// Fetch event data - wrapped with unstable_cache for proper ISR caching
async function getEventData(slug: string) {
  try {
    const supabase = createServiceRoleClient();

    // Get published event by slug
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select(`
        *,
        organizer:organizers(id, name),
        venue:venues(
          id,
          name,
          slug,
          address,
          city,
          state,
          country,
          google_maps_url,
          cover_image_url,
          logo_url
        )
      `)
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (eventError || !event) {
      return null;
    }

    // Fetch venue tags separately if venue exists
    let venueTags: { tag_type: string; tag_value: string }[] = [];
    if (event.venue?.id) {
      const { data: tags } = await supabase
        .from("venue_tags")
        .select("tag_type, tag_value")
        .eq("venue_id", event.venue.id);
      venueTags = tags || [];
    }

    // Get registration count
    const { count: registrationCount } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);

    // Get recent attendees with profile pics (limit 5)
    const { data: recentAttendees } = await supabase
      .from("registrations")
      .select(`
        id,
        attendee:attendees(
          id,
          name,
          profile_picture_url
        )
      `)
      .eq("event_id", event.id)
      .order("created_at", { ascending: false })
      .limit(5);

    return {
      ...event,
      registration_count: registrationCount || 0,
      recent_attendees: recentAttendees?.map(r => r.attendee).filter(Boolean) || [],
      venue: event.venue ? {
        ...event.venue,
        venue_tags: venueTags,
      } : null,
    };
  } catch (error) {
    console.error("Failed to fetch event:", error);
    return null;
  }
}

// Cache the event data fetching - enables proper ISR caching
// Key is per-event-slug, revalidates every 30 seconds to keep data fresh
// Registration counts and attendee lists will be up to 30s stale, which is acceptable
// for display purposes. Real-time registration status is handled client-side.
function getCachedEvent(slug: string) {
  return unstable_cache(
    () => getEventData(slug),
    ['event-page', slug],
    { revalidate: 30, tags: ['events', `event-${slug}`] }
  )();
}

export async function generateMetadata({
  params,
}: {
  params: { eventSlug: string };
}): Promise<Metadata> {
  const event = await getCachedEvent(params.eventSlug);

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
  const event = await getCachedEvent(params.eventSlug);

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

  // For events with fliers, show mobile scroll experience on mobile and regular content on desktop
  // For events without fliers, show regular content everywhere
  if (event.flier_url) {
    // Always use scroll parallax experience for mobile
    const MobileExperience = MobileScrollExperience;
    
    return (
      <Suspense fallback={null}>
        <ReferralTracker eventId={event.id}>
          <>
            {/* Blurred Background - Fixed, fills entire viewport (desktop only) */}
            <div 
              className="hidden lg:block fixed inset-0 z-0 overflow-hidden pointer-events-none bg-void"
              aria-hidden="true"
            >
              {event.flier_video_url ? (
                <video
                  src={event.flier_video_url}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    filter: 'blur(80px)',
                    transform: 'scale(1.3)',
                    opacity: 0.15,
                  }}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.flier_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    filter: 'blur(80px)',
                    transform: 'scale(1.3)',
                    opacity: 0.15,
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-void/40 via-void/70 to-void" />
            </div>

            {/* Mobile: Scroll parallax flier experience */}
            <MobileExperience
              flierUrl={event.flier_url}
              videoUrl={event.flier_video_url || undefined}
              eventName={event.name}
              venueName={event.venue?.name}
              venueCity={event.venue?.city}
              startDate={startDate}
            >
              <Suspense fallback={null}>
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
              </Suspense>
            </MobileExperience>

            {/* Desktop: Standard layout - hidden on mobile since MobileExperience handles it */}
            <div className="hidden lg:block min-h-screen relative z-10 pt-20">
              <Suspense fallback={null}>
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
              </Suspense>
            </div>
            {/* Mobile CTA is now integrated into the pull-up sheet */}
          </>
        </ReferralTracker>
      </Suspense>
    );
  }

  // No flier - standard layout for all devices
  return (
    <Suspense fallback={null}>
      <ReferralTracker eventId={event.id}>
          <>
          <div className="min-h-screen pt-20">
            <Suspense fallback={null}>
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
            </Suspense>
          </div>

          {/* Mobile Sticky CTA */}
          <Suspense fallback={null}>
            <MobileStickyCTAWrapper
              eventSlug={params.eventSlug}
              eventName={event.name}
              shareUrl={shareUrl}
              startDate={startDate}
              endDate={endDate}
              venue={event.venue}
              description={event.description}
              flierUrl={event.flier_url}
              flierVideoUrl={event.flier_video_url}
              externalTicketUrl={event.external_ticket_url}
            />
          </Suspense>
        </>
      </ReferralTracker>
    </Suspense>
  );
}

