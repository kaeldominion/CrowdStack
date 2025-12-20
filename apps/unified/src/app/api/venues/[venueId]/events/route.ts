import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/venues/[venueId]/events
 * Get upcoming events for a venue (public route)
 * Returns published events in the next 30 days
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  try {
    const supabase = createServiceRoleClient();

    // Verify venue exists
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("id")
      .eq("id", params.venueId)
      .single();

    if (venueError || !venue) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    // Get upcoming events (next 30 days, published only)
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const { data: events, error: eventsError } = await supabase
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
      .eq("venue_id", params.venueId)
      .eq("status", "published")
      .gte("start_time", now.toISOString())
      .lte("start_time", thirtyDaysFromNow.toISOString())
      .order("start_time", { ascending: true });

    if (eventsError) {
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      );
    }

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
      events: eventsWithCounts,
    });
  } catch (error: any) {
    console.error("Failed to fetch venue events:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

