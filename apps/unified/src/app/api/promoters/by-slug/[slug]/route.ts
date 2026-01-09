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
        whatsapp_number,
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

    // Get events this promoter is assigned to
    const now = new Date().toISOString();

    // Query all event assignments, then filter in JS to avoid Supabase nested filter issues
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

    if (eventsError) {
      console.error("[Promoter Profile API] Error fetching events:", eventsError);
    }

    // Filter and transform events
    // Filter for published events that haven't ended yet
    const filteredPromotions = (eventPromotions || []).filter((ep: any) => {
      const event = ep.events;
      if (!event) return false;

      const isPublished = event.status === "published";

      // Calculate if event has ended
      // If end_time is set, use it; otherwise assume 6 hours after start
      const startTime = new Date(event.start_time);
      const endTime = event.end_time
        ? new Date(event.end_time)
        : new Date(startTime.getTime() + 6 * 60 * 60 * 1000); // 6 hours default
      const hasNotEnded = endTime >= new Date(now);

      return isPublished && hasNotEnded;
    });

    // Sort by start_time ascending
    filteredPromotions.sort((a: any, b: any) => {
      return new Date(a.events.start_time).getTime() - new Date(b.events.start_time).getTime();
    });

    // Transform events and add registration counts
    const events = await Promise.all(
      filteredPromotions.map(async (ep: any) => {
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

    // Filter from all promotions to get past events
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
      .slice(0, 6);

    const pastEvents = pastEventsFiltered.map((ep: any) => ep.events);

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
        whatsapp_number: promoter.whatsapp_number,
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
