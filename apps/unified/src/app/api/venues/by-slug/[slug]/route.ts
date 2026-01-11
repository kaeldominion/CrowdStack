import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { createTimer } from "@/lib/perf";

// Force dynamic to ensure fresh data - venue settings need to update immediately
export const dynamic = 'force-dynamic';

/**
 * GET /api/venues/by-slug/[slug]
 * Get venue by slug (public route)
 * Returns venue data with gallery, tags, and upcoming events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const timer = createTimer(`venue-by-slug:${params.slug}`);
  
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

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // Get all relevant events for this venue
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
        registration_type,
        external_ticket_url,
        organizer:organizers(id, name)
      `)
      .eq("venue_id", venue.id)
      .eq("status", "published")
      .order("start_time", { ascending: false })
      .limit(50);

    // Get registration counts for all events
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

    // Get favorite count (followers)
    const { count: favoriteCount } = await supabase
      .from("venue_favorites")
      .select("*", { count: "exact", head: true })
      .eq("venue_id", venue.id);

    // Get total published event count
    const { count: totalEventCount } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("venue_id", venue.id)
      .eq("status", "published");

    const duration = timer.end();

    const headers: HeadersInit = {
      // No CDN caching - venue data needs to update immediately when settings change
      'Cache-Control': 'no-store, must-revalidate',
    };

    // Add timing header in development
    if (process.env.NODE_ENV === 'development') {
      headers['X-Response-Time'] = `${duration}ms`;
    }

    return NextResponse.json(
      {
        venue: {
          ...venue,
          gallery: gallery || [],
          tags: tags || [],
          live_events: liveEvents,
          upcoming_events: upcomingEvents.slice(0, 20),
          past_events: pastEvents.slice(0, 50), // Return more for client-side pagination
          follower_count: favoriteCount || 0,
          total_event_count: totalEventCount || 0,
        },
      },
      { headers }
    );
  } catch (error: any) {
    timer.end(); // Log timing even on error
    // Log to Sentry in production, console in development
    if (process.env.NODE_ENV === "production") {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(error);
    } else {
      console.error("Failed to fetch venue:", error);
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch venue" },
      { status: 500 }
    );
  }
}

