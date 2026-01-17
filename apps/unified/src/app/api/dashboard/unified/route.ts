import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import {
  getOrganizerDashboardStats,
  getOrganizerChartData,
  getVenueDashboardStats,
  getPromoterDashboardStats,
  getPromoterEarningsChartData
} from "@/lib/data/dashboard-stats";
import { getUserOrganizerId, getUserDJId, getUserDJIds, getUserPromoterId } from "@/lib/data/get-user-entity";
import { getUserRoles, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { CACHE, getCacheControl } from "@/lib/cache";

/**
 * GET /api/dashboard/unified
 *
 * Fetches all dashboard data in a single request based on user's roles.
 * This reduces API calls from 4-8 down to 1 for the initial dashboard load.
 *
 * Response shape:
 * {
 *   userRoles: string[],
 *   organizer?: { stats, chartData, events },
 *   venue?: { stats, venue, attendeeStats },
 *   promoter?: { stats, chartData, events, profile },
 *   dj?: { stats, handle },
 *   liveEvents: LiveEvent[]
 * }
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

    const serviceSupabase = createServiceRoleClient();
    const userRoles = await getUserRoles();

    const isVenue = userRoles.includes("venue_admin");
    const isOrganizer = userRoles.includes("event_organizer");
    const isPromoter = userRoles.includes("promoter");
    const isDJ = userRoles.includes("dj");

    // Build response object based on user roles
    const response: Record<string, any> = { userRoles };
    const promises: Promise<void>[] = [];
    let liveEventsEndpoint = "";

    // Fetch organizer data
    if (isOrganizer) {
      promises.push((async () => {
        const organizerId = await getUserOrganizerId();
        const [stats, chartData, eventsRes] = await Promise.all([
          getOrganizerDashboardStats(organizerId),
          getOrganizerChartData(organizerId),
          fetchOrganizerEvents(serviceSupabase, organizerId),
        ]);
        response.organizer = { stats, chartData, events: eventsRes };
      })());
      if (!liveEventsEndpoint) liveEventsEndpoint = "organizer";
    }

    // Fetch venue data
    if (isVenue) {
      const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
      if (hasAccess) {
        promises.push((async () => {
          const [venueResult, attendeeStats] = await Promise.all([
            getVenueDashboardStats(),
            fetchVenueAttendeeStats(serviceSupabase, user.id),
          ]);
          const { venue, ...stats } = venueResult as any;
          response.venue = { stats, venue, attendeeStats };
        })());
        if (!liveEventsEndpoint) liveEventsEndpoint = "venue";
      }
    }

    // Fetch promoter data
    if (isPromoter) {
      promises.push((async () => {
        const [stats, chartData, eventsRes] = await Promise.all([
          getPromoterDashboardStats(),
          getPromoterEarningsChartData(),
          fetchPromoterEvents(serviceSupabase, user.id),
        ]);

        // Get promoter profile
        const { data: promoter } = await serviceSupabase
          .from("promoters")
          .select("id, name, slug, bio, profile_image_url, instagram_handle, is_public")
          .eq("created_by", user.id)
          .single();

        response.promoter = { stats, chartData, events: eventsRes, profile: promoter };
      })());
      if (!liveEventsEndpoint) liveEventsEndpoint = "promoter";
    }

    // Fetch DJ data
    if (isDJ) {
      promises.push((async () => {
        const selectedDJId = await getUserDJId();
        if (!selectedDJId) return;

        const allDJIds = await getUserDJIds();
        const djData = await fetchDJStats(serviceSupabase, selectedDJId, allDJIds);

        // Get DJ handle
        const { data: djProfile } = await serviceSupabase
          .from("djs")
          .select("handle")
          .eq("id", selectedDJId)
          .single();

        response.dj = { stats: djData, handle: djProfile?.handle || null };
      })());
    }

    // Fetch live events based on primary role
    if (liveEventsEndpoint) {
      promises.push((async () => {
        const liveEvents = await fetchLiveEvents(serviceSupabase, user.id, liveEventsEndpoint);
        response.liveEvents = liveEvents;
      })());
    } else {
      response.liveEvents = [];
    }

    await Promise.all(promises);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': getCacheControl(CACHE.dashboardStats),
      },
    });
  } catch (error: any) {
    console.error("[Unified Dashboard API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

// Helper functions

async function fetchOrganizerEvents(supabase: any, organizerId: string | null) {
  if (!organizerId) return { liveEvents: [], upcomingEvents: [], pastEvents: [] };

  const now = new Date().toISOString();

  const { data: events } = await supabase
    .from("events")
    .select(`
      id, name, slug, start_time, end_time, status,
      max_guestlist_size, flier_url, venue_approval_status,
      venues(name)
    `)
    .eq("organizer_id", organizerId)
    .order("start_time", { ascending: false });

  if (!events) return { liveEvents: [], upcomingEvents: [], pastEvents: [] };

  // Get registration and check-in counts
  const eventIds = events.map((e: any) => e.id);
  const { data: regCounts } = await supabase
    .from("registrations")
    .select("event_id")
    .in("event_id", eventIds);

  const { data: checkinCounts } = await supabase
    .from("registrations")
    .select("event_id")
    .in("event_id", eventIds)
    .not("checked_in_at", "is", null);

  const regCountMap: Record<string, number> = {};
  const checkinCountMap: Record<string, number> = {};

  regCounts?.forEach((r: any) => {
    regCountMap[r.event_id] = (regCountMap[r.event_id] || 0) + 1;
  });
  checkinCounts?.forEach((r: any) => {
    checkinCountMap[r.event_id] = (checkinCountMap[r.event_id] || 0) + 1;
  });

  const processedEvents = events.map((e: any) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    start_time: e.start_time,
    end_time: e.end_time,
    venue_name: e.venues?.name || null,
    registrations: regCountMap[e.id] || 0,
    checkins: checkinCountMap[e.id] || 0,
    max_guestlist_size: e.max_guestlist_size,
    flier_url: e.flier_url,
    status: e.status,
    venue_approval_status: e.venue_approval_status,
  }));

  const liveEvents = processedEvents.filter((e: any) => {
    const startTime = new Date(e.start_time);
    const endTime = e.end_time ? new Date(e.end_time) : new Date(startTime.getTime() + 6 * 60 * 60 * 1000);
    const nowDate = new Date(now);
    return startTime <= nowDate && endTime >= nowDate && e.status === "published";
  });

  const upcomingEvents = processedEvents.filter((e: any) => {
    const startTime = new Date(e.start_time);
    return startTime > new Date(now) && e.status !== "cancelled";
  }).slice(0, 10);

  const pastEvents = processedEvents.filter((e: any) => {
    const endTime = e.end_time ? new Date(e.end_time) : new Date(new Date(e.start_time).getTime() + 6 * 60 * 60 * 1000);
    return endTime < new Date(now);
  }).slice(0, 10);

  return { liveEvents, upcomingEvents, pastEvents };
}

async function fetchVenueAttendeeStats(supabase: any, userId: string) {
  // Get venue ID from selected venue cookie or user's first venue
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  let venueId = cookieStore.get("selected_venue_id")?.value;

  if (!venueId) {
    // Get first venue for user
    const { data: venueAdmin } = await supabase
      .from("venue_admins")
      .select("venue_id")
      .eq("user_id", userId)
      .limit(1)
      .single();
    venueId = venueAdmin?.venue_id;
  }

  if (!venueId) {
    return {
      totalAttendees: 0,
      totalCheckins: 0,
      newThisMonth: 0,
      repeatVisitors: 0,
      flaggedCount: 0,
      topAttendees: [],
    };
  }

  // Fetch attendee stats for venue
  const { data: attendees } = await supabase
    .from("venue_guests")
    .select(`
      id, created_at, xp_points, is_flagged, is_blocked,
      guest:guests!inner(id, name),
      registrations:venue_guest_registrations(id, checked_in_at)
    `)
    .eq("venue_id", venueId);

  if (!attendees) {
    return {
      totalAttendees: 0,
      totalCheckins: 0,
      newThisMonth: 0,
      repeatVisitors: 0,
      flaggedCount: 0,
      topAttendees: [],
    };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalAttendees = attendees.length;
  const totalCheckins = attendees.reduce((sum: number, a: any) =>
    sum + (a.registrations?.filter((r: any) => r.checked_in_at).length || 0), 0);
  const newThisMonth = attendees.filter((a: any) =>
    new Date(a.created_at) >= startOfMonth).length;
  const repeatVisitors = attendees.filter((a: any) =>
    (a.registrations?.filter((r: any) => r.checked_in_at).length || 0) > 1).length;
  const flaggedCount = attendees.filter((a: any) => a.is_flagged || a.is_blocked).length;

  // Get top attendees by check-ins
  const topAttendees = attendees
    .map((a: any) => ({
      id: a.guest?.id || a.id,
      name: a.guest?.name || "Unknown",
      checkins: a.registrations?.filter((r: any) => r.checked_in_at).length || 0,
      events: a.registrations?.length || 0,
      xp_points: a.xp_points || 0,
    }))
    .sort((a: any, b: any) => b.checkins - a.checkins)
    .slice(0, 5);

  return {
    totalAttendees,
    totalCheckins,
    newThisMonth,
    repeatVisitors,
    flaggedCount,
    topAttendees,
  };
}

async function fetchPromoterEvents(supabase: any, userId: string) {
  // Get promoter ID
  const { data: promoter } = await supabase
    .from("promoters")
    .select("id")
    .eq("created_by", userId)
    .single();

  if (!promoter) return { liveEvents: [], upcomingEvents: [], pastEvents: [] };

  const now = new Date().toISOString();

  // Get events the promoter is assigned to
  const { data: assignments } = await supabase
    .from("promoter_event_assignments")
    .select(`
      event_id, referral_code,
      events!inner(
        id, name, slug, start_time, end_time, status, flier_url,
        venues(name)
      )
    `)
    .eq("promoter_id", promoter.id);

  if (!assignments) return { liveEvents: [], upcomingEvents: [], pastEvents: [] };

  // Get referral counts
  const eventIds = assignments.map((a: any) => a.event_id);
  const { data: referrals } = await supabase
    .from("registrations")
    .select("event_id, checked_in_at")
    .eq("promoter_id", promoter.id)
    .in("event_id", eventIds);

  const referralCountMap: Record<string, { registrations: number; checkins: number }> = {};
  referrals?.forEach((r: any) => {
    if (!referralCountMap[r.event_id]) {
      referralCountMap[r.event_id] = { registrations: 0, checkins: 0 };
    }
    referralCountMap[r.event_id].registrations++;
    if (r.checked_in_at) {
      referralCountMap[r.event_id].checkins++;
    }
  });

  const processedEvents = assignments.map((a: any) => {
    const regs = referralCountMap[a.event_id]?.registrations || 0;
    const checks = referralCountMap[a.event_id]?.checkins || 0;
    return {
      id: a.events.id,
      name: a.events.name,
      slug: a.events.slug,
      start_time: a.events.start_time,
      end_time: a.events.end_time,
      status: a.events.status,
      flier_url: a.events.flier_url,
      venue_name: a.events.venues?.name || null,
      referral_link: `${process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app"}/e/${a.events.slug}?ref=${a.referral_code}`,
      registrations: regs,
      checkins: checks,
      conversionRate: regs > 0 ? Math.round((checks / regs) * 100) : 0,
      isLive: false,
      isUpcoming: false,
      isPast: false,
    };
  });

  const liveEvents = processedEvents.filter((e: any) => {
    const startTime = new Date(e.start_time);
    const endTime = e.end_time ? new Date(e.end_time) : new Date(startTime.getTime() + 6 * 60 * 60 * 1000);
    const nowDate = new Date(now);
    e.isLive = startTime <= nowDate && endTime >= nowDate && e.status === "published";
    return e.isLive;
  });

  const upcomingEvents = processedEvents.filter((e: any) => {
    const startTime = new Date(e.start_time);
    e.isUpcoming = startTime > new Date(now) && e.status !== "cancelled";
    return e.isUpcoming;
  }).slice(0, 10);

  const pastEvents = processedEvents.filter((e: any) => {
    const endTime = e.end_time ? new Date(e.end_time) : new Date(new Date(e.start_time).getTime() + 6 * 60 * 60 * 1000);
    e.isPast = endTime < new Date(now);
    return e.isPast;
  }).slice(0, 10);

  return { liveEvents, upcomingEvents, pastEvents };
}

async function fetchDJStats(supabase: any, selectedDJId: string, allDJIds: string[]) {
  // Get mix counts for selected DJ profile
  const { data: mixes } = await supabase
    .from("mixes")
    .select("id, status, is_featured, plays_count")
    .eq("dj_id", selectedDJId);

  const publishedMixes = mixes?.filter((m: any) => m.status === "published") || [];
  const totalPlays = mixes?.reduce((sum: number, m: any) => sum + (m.plays_count || 0), 0) || 0;

  // Get follower count for selected DJ profile
  const { data: follows } = await supabase
    .from("dj_follows")
    .select("id")
    .eq("dj_id", selectedDJId);

  const followerCount = follows?.length || 0;

  // Get upcoming events count (where selected DJ is on lineup)
  const { data: upcomingLineups } = await supabase
    .from("event_lineups")
    .select("event_id, events!inner(id, start_time, status)")
    .eq("dj_id", selectedDJId);

  const upcomingEvents = upcomingLineups?.filter(
    (lineup: any) =>
      lineup.events &&
      new Date(lineup.events.start_time) > new Date() &&
      lineup.events.status === "published"
  ) || [];

  // Get gig invitations count for ALL DJ profiles (unviewed)
  const { count: gigInvitationsCount } = await supabase
    .from("dj_gig_invitations")
    .select("*", { count: "exact", head: true })
    .in("dj_id", allDJIds)
    .is("viewed_at", null);

  // Get promoter stats (earnings, referrals, etc.) since DJs have promoter profiles
  let promoterStats = null;
  try {
    promoterStats = await getPromoterDashboardStats();
  } catch (error) {
    // Continue without promoter stats if there's an error
  }

  return {
    mixesCount: publishedMixes.length,
    totalPlays,
    followerCount,
    upcomingEventsCount: upcomingEvents.length,
    gigInvitationsCount: gigInvitationsCount || 0,
    earnings: promoterStats?.earnings || { confirmed: 0, pending: 0, estimated: 0, total: 0 },
    totalEarnings: promoterStats?.totalEarnings || 0,
    referrals: promoterStats?.referrals || 0,
    totalCheckIns: promoterStats?.totalCheckIns || 0,
    conversionRate: promoterStats?.conversionRate || 0,
    eventsPromotedCount: promoterStats?.eventsCount || 0,
  };
}

async function fetchLiveEvents(supabase: any, userId: string, roleType: string) {
  const now = new Date().toISOString();
  let query;

  if (roleType === "organizer") {
    const organizerId = await getUserOrganizerId();
    if (!organizerId) return [];

    const { data: events } = await supabase
      .from("events")
      .select(`
        id, name, slug, start_time, end_time, status, max_guestlist_size,
        venues(id, name),
        organizers(id, name)
      `)
      .eq("organizer_id", organizerId)
      .eq("status", "published")
      .lte("start_time", now);

    return processLiveEvents(events, supabase, now);
  }

  if (roleType === "venue") {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    let venueId = cookieStore.get("selected_venue_id")?.value;

    if (!venueId) {
      const { data: venueAdmin } = await supabase
        .from("venue_admins")
        .select("venue_id")
        .eq("user_id", userId)
        .limit(1)
        .single();
      venueId = venueAdmin?.venue_id;
    }

    if (!venueId) return [];

    const { data: events } = await supabase
      .from("events")
      .select(`
        id, name, slug, start_time, end_time, status, max_guestlist_size,
        venues(id, name),
        organizers(id, name)
      `)
      .eq("venue_id", venueId)
      .eq("status", "published")
      .lte("start_time", now);

    return processLiveEvents(events, supabase, now);
  }

  if (roleType === "promoter") {
    const { data: promoter } = await supabase
      .from("promoters")
      .select("id")
      .eq("created_by", userId)
      .single();

    if (!promoter) return [];

    const { data: assignments } = await supabase
      .from("promoter_event_assignments")
      .select(`
        event_id,
        events!inner(
          id, name, slug, start_time, end_time, status, max_guestlist_size,
          venues(id, name),
          organizers(id, name)
        )
      `)
      .eq("promoter_id", promoter.id);

    const events = assignments?.map((a: any) => a.events).filter(Boolean) || [];
    return processLiveEvents(events, supabase, now);
  }

  return [];
}

async function processLiveEvents(events: any[] | null, supabase: any, now: string) {
  if (!events || events.length === 0) return [];

  // Filter to only live events
  const liveEvents = events.filter((e: any) => {
    const startTime = new Date(e.start_time);
    const endTime = e.end_time ? new Date(e.end_time) : new Date(startTime.getTime() + 6 * 60 * 60 * 1000);
    const nowDate = new Date(now);
    return startTime <= nowDate && endTime >= nowDate;
  });

  if (liveEvents.length === 0) return [];

  // Get registration and check-in counts
  const eventIds = liveEvents.map((e: any) => e.id);
  const { data: regCounts } = await supabase
    .from("registrations")
    .select("event_id")
    .in("event_id", eventIds);

  const { data: checkinCounts } = await supabase
    .from("registrations")
    .select("event_id")
    .in("event_id", eventIds)
    .not("checked_in_at", "is", null);

  const regCountMap: Record<string, number> = {};
  const checkinCountMap: Record<string, number> = {};

  regCounts?.forEach((r: any) => {
    regCountMap[r.event_id] = (regCountMap[r.event_id] || 0) + 1;
  });
  checkinCounts?.forEach((r: any) => {
    checkinCountMap[r.event_id] = (checkinCountMap[r.event_id] || 0) + 1;
  });

  return liveEvents.map((e: any) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    start_time: e.start_time,
    end_time: e.end_time,
    status: e.status,
    max_guestlist_size: e.max_guestlist_size,
    venue: e.venues || null,
    organizer: e.organizers || null,
    registrations: regCountMap[e.id] || 0,
    checkins: checkinCountMap[e.id] || 0,
  }));
}
