import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/djs/by-handle/[handle]
 * Get DJ profile by handle (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { handle: string } }
) {
  try {
    const serviceSupabase = createServiceRoleClient();

    // Get DJ profile
    const { data: dj, error: djError } = await serviceSupabase
      .from("djs")
      .select("*")
      .eq("handle", params.handle)
      .single();

    if (djError || !dj) {
      return NextResponse.json({ error: "DJ not found" }, { status: 404 });
    }

    // Get published mixes (ordered by featured first, then display_order)
    const { data: mixes } = await serviceSupabase
      .from("mixes")
      .select("*")
      .eq("dj_id", dj.id)
      .eq("status", "published")
      .order("is_featured", { ascending: false })
      .order("display_order", { ascending: true })
      .order("published_at", { ascending: false });

    // Get follower count
    const { data: follows } = await serviceSupabase
      .from("dj_follows")
      .select("id")
      .eq("dj_id", dj.id);

    const followerCount = follows?.length || 0;

    // Get upcoming events (where DJ is on lineup)
    const { data: upcomingLineups } = await serviceSupabase
      .from("event_lineups")
      .select(`
        display_order,
        set_time,
        events!inner(
          id,
          slug,
          name,
          start_time,
          end_time,
          cover_image_url,
          flier_url,
          venue_id,
          venues(name, city)
        )
      `)
      .eq("dj_id", dj.id)
      .order("display_order", { ascending: true });

    const upcomingEvents = upcomingLineups
      ?.filter((lineup: any) => {
        const event = lineup.events;
        return event && new Date(event.start_time) > new Date();
      })
      .map((lineup: any) => ({
        ...lineup.events,
        display_order: lineup.display_order,
        set_time: lineup.set_time,
      })) || [];

    return NextResponse.json({
      dj,
      mixes: mixes || [],
      followerCount,
      upcomingEvents,
    });
  } catch (error: any) {
    console.error("Error fetching DJ by handle:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



