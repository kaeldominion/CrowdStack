import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/venues/by-slug/[slug]/all-events
 * Get all events for a venue (public route)
 * Returns all published events (live, upcoming, and past) without limits
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
      .select("id")
      .eq("slug", params.slug)
      .single();

    if (venueError || !venue) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    const now = new Date();

    // Get all events for this venue (no limit)
    const { data: allEvents } = await supabase
      .from("events")
      .select(`
        id,
        slug,
        name,
        description,
        start_time,
        end_time,
        cover_image_url,
        flier_url,
        capacity,
        organizer:organizers(id, name)
      `)
      .eq("venue_id", venue.id)
      .eq("status", "published")
      .order("start_time", { ascending: false });

    const eventIds = allEvents?.map((e) => e.id) || [];
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

    // Categorize events
    const liveEvents: any[] = [];
    const upcomingEvents: any[] = [];
    const pastEvents: any[] = [];

    (allEvents || []).forEach((event) => {
      const eventWithCount = {
        ...event,
        registration_count: registrationCounts[event.id] || 0,
      };
      
      const startTime = new Date(event.start_time);
      const endTime = event.end_time ? new Date(event.end_time) : null;
      
      // Event is live if started but not ended (or no end time and started within last 8 hours)
      const isLive = startTime <= now && (
        (endTime && endTime >= now) || 
        (!endTime && now.getTime() - startTime.getTime() < 8 * 60 * 60 * 1000)
      );
      
      if (isLive) {
        liveEvents.push(eventWithCount);
      } else if (startTime > now) {
        upcomingEvents.push(eventWithCount);
      } else {
        pastEvents.push(eventWithCount);
      }
    });

    // Sort upcoming by start time ascending, past by start time descending
    upcomingEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    pastEvents.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return NextResponse.json({
      live_events: liveEvents,
      upcoming_events: upcomingEvents,
      past_events: pastEvents,
    });
  } catch (error: any) {
    console.error("Failed to fetch all events:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

