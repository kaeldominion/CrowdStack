import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/venues/by-slug/[slug]
 * Get venue by slug (public route)
 * Returns venue data with gallery, tags, and upcoming events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createServiceRoleClient();

    // Get venue by slug
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("*")
      .eq("slug", params.slug)
      .single();

    if (venueError || !venue) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    // Get gallery images (ordered by display_order, hero first)
    const { data: gallery } = await supabase
      .from("venue_gallery")
      .select("*")
      .eq("venue_id", venue.id)
      .order("is_hero", { ascending: false })
      .order("display_order", { ascending: true });

    // Get tags
    const { data: tags } = await supabase
      .from("venue_tags")
      .select("*")
      .eq("venue_id", venue.id)
      .order("tag_type", { ascending: true })
      .order("tag_value", { ascending: true });

    // Get upcoming events (next 30 days, published only)
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const { data: events } = await supabase
      .from("events")
      .select(`
        id,
        slug,
        name,
        description,
        start_time,
        end_time,
        cover_image_url,
        capacity,
        organizer:organizers(id, name)
      `)
      .eq("venue_id", venue.id)
      .eq("status", "published")
      .gte("start_time", now.toISOString())
      .lte("start_time", thirtyDaysFromNow.toISOString())
      .order("start_time", { ascending: true })
      .limit(10);

    // Get registration counts for events
    const eventIds = events?.map((e) => e.id) || [];
    let registrationCounts: Record<string, number> = {};

    if (eventIds.length > 0) {
      const { data: registrations } = await supabase
        .from("registrations")
        .select("event_id")
        .in("event_id", eventIds);

      registrationCounts = (registrations || []).reduce(
        (acc, reg) => {
          acc[reg.event_id] = (acc[reg.event_id] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
    }

    // Add registration counts to events
    const eventsWithCounts = (events || []).map((event) => ({
      ...event,
      registration_count: registrationCounts[event.id] || 0,
    }));

    return NextResponse.json({
      venue: {
        ...venue,
        gallery: gallery || [],
        tags: tags || [],
        upcoming_events: eventsWithCounts,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch venue:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch venue" },
      { status: 500 }
    );
  }
}

