import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
};

/**
 * OPTIONS preflight handler for CORS
 */
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * GET /api/widget/venue/[slug]/events
 * Public widget API - returns upcoming events for a venue with CORS headers
 *
 * Query params:
 * - limit: number (1-20, default 5)
 * - upcoming_only: boolean (default true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);

    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "5", 10), 1), 20);
    const upcomingOnly = searchParams.get("upcoming_only") !== "false";

    const supabase = createServiceRoleClient();

    // Get venue by slug
    const { data: venue, error: venueError } = await supabase
      .from("venues")
      .select("id, name, slug, logo_url, accent_color")
      .eq("slug", slug)
      .single();

    if (venueError || !venue) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const now = new Date().toISOString();

    // Build query
    let query = supabase
      .from("events")
      .select(`
        id,
        slug,
        name,
        start_time,
        end_time,
        cover_image_url,
        flier_url,
        organizer:organizers(id, name)
      `)
      .eq("venue_id", venue.id)
      .eq("status", "published")
      .order("start_time", { ascending: true })
      .limit(limit);

    // Filter to upcoming events only (default behavior)
    if (upcomingOnly) {
      query = query.gte("start_time", now);
    }

    const { data: events, error: eventsError } = await query;

    if (eventsError) {
      console.error("Widget API: Failed to fetch events:", eventsError);
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Get registration counts for the events
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

    // Format response
    const formattedEvents = (events || []).map((event) => {
      // Handle Supabase's array return type for relations
      const organizer = Array.isArray(event.organizer) ? event.organizer[0] : event.organizer;
      return {
        id: event.id,
        slug: event.slug,
        name: event.name,
        start_time: event.start_time,
        end_time: event.end_time,
        cover_image_url: event.cover_image_url || event.flier_url,
        organizer_name: organizer?.name || null,
        registration_count: registrationCounts[event.id] || 0,
      };
    });

    return NextResponse.json(
      {
        venue: {
          name: venue.name,
          slug: venue.slug,
          logo_url: venue.logo_url,
          accent_color: venue.accent_color,
        },
        events: formattedEvents,
        base_url: process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app",
      },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    console.error("Widget API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
