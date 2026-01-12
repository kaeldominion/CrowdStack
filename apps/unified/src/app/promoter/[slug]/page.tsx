import { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { PromoterProfileClient } from "./PromoterProfileClient";

// Force dynamic to ensure fresh data when promoter profiles are updated
export const dynamic = 'force-dynamic';
// Disable all caching - this is critical for profile pages
export const revalidate = 0;

interface Props {
  params: { slug: string };
}

async function getPromoter(slug: string) {
  // Opt out of ALL caching - Next.js Data Cache, Full Route Cache, etc.
  noStore();
  
  const supabase = createServiceRoleClient();

  // Get promoter by slug
  const { data: promoter, error } = await supabase
    .from("promoters")
    .select(`
      id,
      name,
      slug,
      bio,
      profile_image_url,
      instagram_handle,
      whatsapp_number,
      is_public
    `)
    .eq("slug", slug)
    .single();

  if (error || !promoter || !promoter.is_public) {
    return null;
  }

  // Get events this promoter is assigned to
  const now = new Date().toISOString();

  // Query all event assignments
  const { data: eventPromotions, error: eventsError } = await supabase
    .from("event_promoters")
    .select(`
      id,
      events(
        id,
        name,
        slug,
        description,
        start_time,
        end_time,
        flier_url,
        status,
        capacity,
        venue:venues(
          id,
          name,
          city,
          state
        ),
        organizer:organizers(
          id,
          name
        )
      )
    `)
    .eq("promoter_id", promoter.id);

  // Filter and transform events
  const filteredPromotions = (eventPromotions || []).filter((ep: any) => {
    const event = ep.events;
    if (!event) return false;
    const isPublished = event.status === "published";
    const startTime = new Date(event.start_time);
    const endTime = event.end_time
      ? new Date(event.end_time)
      : new Date(startTime.getTime() + 6 * 60 * 60 * 1000);
    const hasNotEnded = endTime >= new Date(now);
    return isPublished && hasNotEnded;
  });

  filteredPromotions.sort((a: any, b: any) => {
    return new Date(a.events.start_time).getTime() - new Date(b.events.start_time).getTime();
  });

  // Get registration counts for events
  const events = await Promise.all(
    filteredPromotions.map(async (ep: any) => {
      const event = ep.events;
      const { count: registrationCount } = await supabase
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);

      return {
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        start_time: event.start_time,
        end_time: event.end_time,
        flier_url: event.flier_url,
        capacity: event.capacity,
        registration_count: registrationCount || 0,
        venue: event.venue,
        organizer: event.organizer,
      };
    })
  );

  // Get past events (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const pastEventsFiltered = (eventPromotions || [])
    .filter((ep: any) => {
      const event = ep.events;
      if (!event) return false;
      const isPublished = event.status === "published";
      const startTime = new Date(event.start_time);
      const endTime = event.end_time
        ? new Date(event.end_time)
        : new Date(startTime.getTime() + 6 * 60 * 60 * 1000);
      const hasEnded = endTime < new Date(now);
      const isRecent = startTime >= thirtyDaysAgo;
      return isPublished && hasEnded && isRecent;
    })
    .sort((a: any, b: any) => {
      return new Date(b.events.start_time).getTime() - new Date(a.events.start_time).getTime();
    })
    .slice(0, 6)
    .map((ep: any) => ep.events);

  // Get total stats
  const { count: totalEventsPromoted } = await supabase
    .from("event_promoters")
    .select("*", { count: "exact", head: true })
    .eq("promoter_id", promoter.id);

  const { data: checkinsData } = await supabase
    .from("registrations")
    .select(`
      checkins!inner(id)
    `)
    .eq("referral_promoter_id", promoter.id);

  const totalCheckins = checkinsData?.length || 0;

  return {
    promoter: {
      id: promoter.id,
      name: promoter.name,
      slug: promoter.slug,
      bio: promoter.bio,
      profile_image_url: promoter.profile_image_url,
      instagram_handle: promoter.instagram_handle,
      whatsapp_number: promoter.whatsapp_number,
    },
    upcoming_events: events,
    past_events: pastEventsFiltered,
    stats: {
      total_events_promoted: totalEventsPromoted || 0,
      total_checkins: totalCheckins,
    },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getPromoter(params.slug);

  if (!data || !data.promoter) {
    return {
      title: "Promoter Not Found | CrowdStack",
    };
  }

  const promoter = data.promoter;
  const description = promoter.bio || `Check out events promoted by ${promoter.name} on CrowdStack`;

  return {
    title: `${promoter.name} | CrowdStack`,
    description,
    openGraph: {
      title: promoter.name,
      description,
      type: "profile",
      images: promoter.profile_image_url ? [promoter.profile_image_url] : [],
    },
    twitter: {
      card: "summary",
      title: promoter.name,
      description,
    },
  };
}

export default async function PromoterProfilePage({ params }: Props) {
  // Add timestamp to force cache invalidation - this ensures each request is unique
  const timestamp = Date.now();
  const data = await getPromoter(params.slug);

  if (!data || !data.promoter) {
    notFound();
  }

  // Pass timestamp to client to ensure fresh data
  return <PromoterProfileClient slug={params.slug} promoterId={data.promoter.id} initialData={data} cacheBuster={timestamp} />;
}
