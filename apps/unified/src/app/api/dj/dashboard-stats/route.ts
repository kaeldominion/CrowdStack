import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserDJId, getUserDJIds, getUserPromoterId } from "@/lib/data/get-user-entity";
import { getPromoterDashboardStats } from "@/lib/data/dashboard-stats";

/**
 * GET /api/dj/dashboard-stats
 * Get DJ dashboard statistics including earnings and referrals from promoter profile
 * Stats are for the selected DJ profile, but gig invitations show all profiles
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const selectedDJId = await getUserDJId();
    if (!selectedDJId) {
      return NextResponse.json({ error: "DJ profile not found" }, { status: 404 });
    }

    const allDJIds = await getUserDJIds();
    const serviceSupabase = createServiceRoleClient();

    // Get mix counts for selected DJ profile
    const { data: mixes } = await serviceSupabase
      .from("mixes")
      .select("id, status, is_featured, plays_count")
      .eq("dj_id", selectedDJId);

    const publishedMixes = mixes?.filter((m) => m.status === "published") || [];
    const draftMixes = mixes?.filter((m) => m.status === "draft") || [];
    const featuredMixes = mixes?.filter((m) => m.is_featured) || [];
    const totalPlays = mixes?.reduce((sum, m) => sum + (m.plays_count || 0), 0) || 0;

    // Get follower count for selected DJ profile
    const { data: follows } = await serviceSupabase
      .from("dj_follows")
      .select("id")
      .eq("dj_id", selectedDJId);

    const followerCount = follows?.length || 0;

    // Get upcoming events count (where selected DJ is on lineup)
    const { data: upcomingLineups } = await serviceSupabase
      .from("event_lineups")
      .select("event_id, events!inner(id, start_time, status)")
      .eq("dj_id", selectedDJId);

    const upcomingEvents = upcomingLineups?.filter(
      (lineup: any) =>
        lineup.events &&
        new Date(lineup.events.start_time) > new Date() &&
        lineup.events.status === "published"
    ) || [];

    // Get past events count for selected DJ
    const pastEvents = upcomingLineups?.filter(
      (lineup: any) =>
        lineup.events &&
        new Date(lineup.events.start_time) <= new Date()
    ) || [];

    // Get gig invitations count for ALL DJ profiles (unviewed)
    const { count: gigInvitationsCount } = await serviceSupabase
      .from("dj_gig_invitations")
      .select("*", { count: "exact", head: true })
      .in("dj_id", allDJIds)
      .is("viewed_at", null);

    // Get promoter stats (earnings, referrals, etc.) since DJs have promoter profiles
    let promoterStats = null;
    try {
      promoterStats = await getPromoterDashboardStats();
    } catch (error) {
      console.error("Error fetching promoter stats for DJ:", error);
      // Continue without promoter stats if there's an error
    }

    const stats = {
      mixesCount: publishedMixes.length,
      draftMixesCount: draftMixes.length,
      featuredMixesCount: featuredMixes.length,
      totalPlays,
      followerCount,
      upcomingEventsCount: upcomingEvents.length,
      pastEventsCount: pastEvents.length,
      gigInvitationsCount: gigInvitationsCount || 0,
      // Promoter stats (earnings, referrals, etc.)
      earnings: promoterStats?.earnings || { confirmed: 0, pending: 0, estimated: 0, total: 0 },
      totalEarnings: promoterStats?.totalEarnings || 0,
      referrals: promoterStats?.referrals || 0,
      totalCheckIns: promoterStats?.totalCheckIns || 0,
      conversionRate: promoterStats?.conversionRate || 0,
      eventsPromotedCount: promoterStats?.eventsCount || 0,
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



