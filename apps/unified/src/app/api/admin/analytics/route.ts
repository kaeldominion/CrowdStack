import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // SECURITY: Only allow localhost fallback in non-production environments
    let userId = user?.id;
    if (!userId && process.env.NODE_ENV !== "production") {
      const localhostUser = cookieStore.get("localhost_user_id")?.value;
      if (localhostUser) {
        console.warn("[Admin Analytics] Using localhost_user_id fallback - DEV ONLY");
        userId = localhostUser;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const serviceClient = createServiceRoleClient();
    const { data: roles } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isSuperadmin = roles?.some((r) => r.role === "superadmin");

    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all analytics data in parallel
    const [
      totalUsersResult,
      totalAttendeesResult,
      totalEventsResult,
      totalRegistrationsResult,
      totalCheckinsResult,
      totalVenuesResult,
      totalOrganizersResult,
      totalPromotersResult,
      totalDJsResult,
      roleDistributionResult,
      recentRegistrationsResult,
      eventsByStatusResult,
      registrationsByMonthResult,
      topEventsResult,
      topPromotersResult,
      recentEventsResult,
      topOrganizersResult,
      topReferrersResult,
      topDJsResult,
    ] = await Promise.all([
      // Total auth users
      serviceClient.from("user_roles").select("user_id", { count: "exact", head: true }),
      // Total attendees
      serviceClient.from("attendees").select("*", { count: "exact", head: true }),
      // Total events
      serviceClient.from("events").select("*", { count: "exact", head: true }),
      // Total registrations
      serviceClient.from("registrations").select("*", { count: "exact", head: true }),
      // Total checkins
      serviceClient.from("checkins").select("*", { count: "exact", head: true }).is("undo_at", null),
      // Total venues
      serviceClient.from("venues").select("*", { count: "exact", head: true }),
      // Total organizers
      serviceClient.from("organizers").select("*", { count: "exact", head: true }),
      // Total promoters
      serviceClient.from("promoters").select("*", { count: "exact", head: true }),
      // Total DJs (using djs table, not dj_profiles)
      serviceClient.from("djs").select("*", { count: "exact", head: true }),
      // Role distribution
      serviceClient.from("user_roles").select("role"),
      // Recent registrations (last 30 days, grouped by day)
      serviceClient
        .from("registrations")
        .select("registered_at")
        .gte("registered_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("registered_at", { ascending: true }),
      // Events by status
      serviceClient.from("events").select("status"),
      // Registrations by month (last 12 months)
      serviceClient
        .from("registrations")
        .select("registered_at")
        .gte("registered_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .order("registered_at", { ascending: true }),
      // Top events by registration count
      serviceClient
        .from("events")
        .select(`
          id,
          name,
          slug,
          start_time,
          status,
          registrations:registrations(count)
        `)
        .eq("status", "published")
        .order("start_time", { ascending: false })
        .limit(10),
      // Top promoters by referrals
      serviceClient
        .from("promoters")
        .select(`
          id,
          name,
          registrations:registrations(count)
        `)
        .limit(10),
      // Recent events
      serviceClient
        .from("events")
        .select(`
          id,
          name,
          slug,
          start_time,
          status,
          created_at
        `)
        .order("created_at", { ascending: false })
        .limit(10),
      // Top organizers by event count
      serviceClient
        .from("organizers")
        .select(`
          id,
          name,
          events:events(count)
        `)
        .limit(10),
      // Top referrers (all users, not just promoters) by referred_by_user_id
      serviceClient
        .from("registrations")
        .select(`
          referred_by_user_id,
          id
        `)
        .not("referred_by_user_id", "is", null),
      // Top DJs by event appearances (using djs table, not dj_profiles)
      serviceClient
        .from("djs")
        .select(`
          id,
          name,
          handle,
          profile_image_url,
          verified,
          event_djs:event_djs(count)
        `)
        .limit(10),
    ]);

    // Process role distribution
    const roleDistribution = (roleDistributionResult.data || []).reduce((acc: Record<string, number>, row) => {
      const role = row.role as string;
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {});

    // Process registrations by day (last 30 days)
    const registrationsByDay: Record<string, number> = {};
    const last30Days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      last30Days.push(dateStr);
      registrationsByDay[dateStr] = 0;
    }
    (recentRegistrationsResult.data || []).forEach((reg) => {
      const dateStr = new Date(reg.registered_at).toISOString().split("T")[0];
      if (registrationsByDay[dateStr] !== undefined) {
        registrationsByDay[dateStr]++;
      }
    });
    const registrationsTrend = last30Days.map((date) => ({
      date,
      count: registrationsByDay[date] || 0,
    }));

    // Process events by status
    const eventsByStatus = (eventsByStatusResult.data || []).reduce((acc: Record<string, number>, row) => {
      const status = row.status as string;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Process registrations by month (last 12 months)
    const registrationsByMonth: Record<string, number> = {};
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      last12Months.push(monthStr);
      registrationsByMonth[monthStr] = 0;
    }
    (registrationsByMonthResult.data || []).forEach((reg) => {
      const date = new Date(reg.registered_at);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (registrationsByMonth[monthStr] !== undefined) {
        registrationsByMonth[monthStr]++;
      }
    });
    const monthlyTrend = last12Months.map((month) => ({
      month,
      count: registrationsByMonth[month] || 0,
    }));

    // Process top events
    const topEvents = (topEventsResult.data || [])
      .map((event: any) => ({
        id: event.id,
        name: event.name,
        slug: event.slug,
        startTime: event.start_time,
        registrations: event.registrations?.[0]?.count || 0,
      }))
      .sort((a: any, b: any) => b.registrations - a.registrations)
      .slice(0, 5);

    // Process top promoters
    const topPromoters = (topPromotersResult.data || [])
      .map((promoter: any) => ({
        id: promoter.id,
        name: promoter.name,
        referrals: promoter.registrations?.[0]?.count || 0,
      }))
      .sort((a: any, b: any) => b.referrals - a.referrals)
      .slice(0, 5);

    // Process top organizers
    const topOrganizers = (topOrganizersResult.data || [])
      .map((organizer: any) => ({
        id: organizer.id,
        name: organizer.name,
        eventCount: organizer.events?.[0]?.count || 0,
      }))
      .sort((a: any, b: any) => b.eventCount - a.eventCount)
      .slice(0, 5);

    // Process top DJs
    const topDJs = (topDJsResult.data || [])
      .map((dj: any) => ({
        id: dj.id,
        name: dj.name,
        handle: dj.handle,
        profileImageUrl: dj.profile_image_url,
        verified: dj.verified,
        eventCount: dj.event_djs?.[0]?.count || 0,
      }))
      .sort((a: any, b: any) => b.eventCount - a.eventCount)
      .slice(0, 5);

    // Process top referrers - aggregate by referred_by_user_id
    const referrerCounts: Record<string, number> = {};
    (topReferrersResult.data || []).forEach((reg: any) => {
      if (reg.referred_by_user_id) {
        referrerCounts[reg.referred_by_user_id] = (referrerCounts[reg.referred_by_user_id] || 0) + 1;
      }
    });

    // Get user details for top referrers - BATCH QUERY OPTIMIZATION
    const topReferrerUserIds = Object.entries(referrerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId]) => userId);

    // Batch fetch all attendee names in a single query
    const { data: attendeeNames } = topReferrerUserIds.length > 0
      ? await serviceClient
          .from("attendees")
          .select("user_id, name")
          .in("user_id", topReferrerUserIds)
      : { data: [] };

    // Build name lookup map for O(1) access
    const nameByUserId = new Map<string, string>(
      (attendeeNames || []).map((a) => [a.user_id, a.name])
    );

    // Map top referrers with pre-fetched names (no N+1 queries)
    const topReferrers = topReferrerUserIds.map((userId) => ({
      userId,
      name: nameByUserId.get(userId) || "Unknown",
      referrals: referrerCounts[userId],
    }));

    // Calculate growth metrics
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [currentPeriodRegs, previousPeriodRegs] = await Promise.all([
      serviceClient
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .gte("registered_at", thirtyDaysAgo.toISOString()),
      serviceClient
        .from("registrations")
        .select("*", { count: "exact", head: true })
        .gte("registered_at", sixtyDaysAgo.toISOString())
        .lt("registered_at", thirtyDaysAgo.toISOString()),
    ]);

    const currentCount = currentPeriodRegs.count || 0;
    const previousCount = previousPeriodRegs.count || 0;
    const registrationGrowth = previousCount === 0 ? 100 : Math.round(((currentCount - previousCount) / previousCount) * 100);

    return NextResponse.json({
      overview: {
        totalUsers: totalUsersResult.count || 0,
        totalAttendees: totalAttendeesResult.count || 0,
        totalEvents: totalEventsResult.count || 0,
        totalRegistrations: totalRegistrationsResult.count || 0,
        totalCheckins: totalCheckinsResult.count || 0,
        totalVenues: totalVenuesResult.count || 0,
        totalOrganizers: totalOrganizersResult.count || 0,
        totalPromoters: totalPromotersResult.count || 0,
        totalDJs: totalDJsResult.count || 0,
        registrationGrowth,
      },
      roleDistribution: Object.entries(roleDistribution).map(([role, count]) => ({
        role: role.replace(/_/g, " "),
        count,
      })),
      eventsByStatus: Object.entries(eventsByStatus).map(([status, count]) => ({
        status,
        count,
      })),
      registrationsTrend,
      monthlyTrend,
      topEvents,
      topPromoters,
      topOrganizers,
      topDJs,
      topReferrers,
      recentEvents: (recentEventsResult.data || []).map((event: any) => ({
        id: event.id,
        name: event.name,
        slug: event.slug,
        startTime: event.start_time,
        status: event.status,
        createdAt: event.created_at,
      })),
    });
  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

