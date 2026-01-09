import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/promoters/by-slug/[slug]
 * Get public promoter profile with their upcoming events
 */
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createServiceRoleClient();
    const { slug } = params;

    // Get promoter by slug
    const { data: promoter, error: promoterError } = await supabase
      .from("promoters")
      .select(`
        id,
        name,
        slug,
        bio,
        profile_image_url,
        instagram_handle,
        is_public
      `)
      .eq("slug", slug)
      .single();

    if (promoterError || !promoter) {
      return NextResponse.json(
        { error: "Promoter not found" },
        { status: 404 }
      );
    }

    // Check if profile is public
    if (!promoter.is_public) {
      return NextResponse.json(
        { error: "This profile is private" },
        { status: 403 }
      );
    }

    // Get upcoming events this promoter is assigned to
    const now = new Date().toISOString();
    const { data: eventPromotions, error: eventsError } = await supabase
      .from("event_promoters")
      .select(`
        id,
        events!inner(
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
      .eq("promoter_id", promoter.id)
      .eq("events.status", "published")
      .gte("events.start_time", now)
      .order("events.start_time", { ascending: true });

    if (eventsError) {
      console.error("[Promoter Profile API] Error fetching events:", eventsError);
    }

    // Transform events and add registration counts
    const events = await Promise.all(
      (eventPromotions || []).map(async (ep: any) => {
        const event = ep.events;

        // Get registration count
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

    // Also get past events (last 30 days) for social proof
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: pastEventPromotions } = await supabase
      .from("event_promoters")
      .select(`
        events!inner(
          id,
          name,
          slug,
          start_time,
          flier_url,
          venue:venues(name, city)
        )
      `)
      .eq("promoter_id", promoter.id)
      .eq("events.status", "published")
      .lt("events.start_time", now)
      .gte("events.start_time", thirtyDaysAgo.toISOString())
      .order("events.start_time", { ascending: false })
      .limit(6);

    const pastEvents = (pastEventPromotions || []).map((ep: any) => ep.events);

    // Get total stats
    const { count: totalEventsPromoted } = await supabase
      .from("event_promoters")
      .select("*", { count: "exact", head: true })
      .eq("promoter_id", promoter.id);

    // Get total check-ins attributed to this promoter
    const { data: checkinsData } = await supabase
      .from("registrations")
      .select(`
        checkins!inner(id)
      `)
      .eq("referral_promoter_id", promoter.id);

    const totalCheckins = checkinsData?.length || 0;

    return NextResponse.json({
      promoter: {
        id: promoter.id,
        name: promoter.name,
        slug: promoter.slug,
        bio: promoter.bio,
        profile_image_url: promoter.profile_image_url,
        instagram_handle: promoter.instagram_handle,
      },
      upcoming_events: events,
      past_events: pastEvents,
      stats: {
        total_events_promoted: totalEventsPromoted || 0,
        total_checkins: totalCheckins,
      },
    });
  } catch (error: any) {
    console.error("[Promoter Profile API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch promoter profile" },
      { status: 500 }
    );
  }
}
