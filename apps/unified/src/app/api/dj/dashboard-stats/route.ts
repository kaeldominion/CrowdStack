import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId } from "@/lib/data/get-user-entity";

/**
 * GET /api/dj/dashboard-stats
 * Get DJ dashboard statistics
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const djId = await getUserDJId();
    if (!djId) {
      return NextResponse.json({ error: "DJ profile not found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get mix counts
    const { data: mixes } = await serviceSupabase
      .from("mixes")
      .select("id, status, is_featured, plays_count")
      .eq("dj_id", djId);

    const publishedMixes = mixes?.filter((m) => m.status === "published") || [];
    const draftMixes = mixes?.filter((m) => m.status === "draft") || [];
    const featuredMixes = mixes?.filter((m) => m.is_featured) || [];
    const totalPlays = mixes?.reduce((sum, m) => sum + (m.plays_count || 0), 0) || 0;

    // Get follower count
    const { data: follows } = await serviceSupabase
      .from("dj_follows")
      .select("id")
      .eq("dj_id", djId);

    const followerCount = follows?.length || 0;

    // Get upcoming events count (where DJ is on lineup)
    const { data: upcomingLineups } = await serviceSupabase
      .from("event_lineups")
      .select("event_id, events!inner(id, start_time, status)")
      .eq("dj_id", djId);

    const upcomingEvents = upcomingLineups?.filter(
      (lineup: any) =>
        lineup.events &&
        new Date(lineup.events.start_time) > new Date() &&
        lineup.events.status === "published"
    ) || [];

    // Get past events count
    const pastEvents = upcomingLineups?.filter(
      (lineup: any) =>
        lineup.events &&
        new Date(lineup.events.start_time) <= new Date()
    ) || [];

    const stats = {
      mixesCount: publishedMixes.length,
      draftMixesCount: draftMixes.length,
      featuredMixesCount: featuredMixes.length,
      totalPlays,
      followerCount,
      upcomingEventsCount: upcomingEvents.length,
      pastEventsCount: pastEvents.length,
    };

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error("Error fetching DJ dashboard stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}



