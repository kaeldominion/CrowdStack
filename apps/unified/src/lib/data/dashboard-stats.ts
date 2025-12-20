import "server-only";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId, getUserVenueId, getUserPromoterId } from "./get-user-entity";

export interface DashboardStats {
  totalEvents: number;
  registrations: number;
  checkIns: number;
  promoters: number;
  conversionRate: number;
  revenue: number;
}

export interface ChartDataPoint {
  date: string;
  registrations: number;
  checkins: number;
}

/**
 * Get organizer dashboard stats
 */
export async function getOrganizerDashboardStats(): Promise<DashboardStats> {
  const organizerId = await getUserOrganizerId();
  if (!organizerId) {
    return {
      totalEvents: 0,
      registrations: 0,
      checkIns: 0,
      promoters: 0,
      conversionRate: 0,
      revenue: 0,
    };
  }

  const supabase = createServiceRoleClient();

  // Get event count
  const { count: eventCount } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("organizer_id", organizerId);

  // Get event IDs first
  const { data: organizerEvents } = await supabase
    .from("events")
    .select("id")
    .eq("organizer_id", organizerId);

  const eventIds = organizerEvents?.map((e) => e.id) || [];

  if (eventIds.length === 0) {
    return {
      totalEvents: eventCount || 0,
      registrations: 0,
      checkIns: 0,
      promoters: 0,
      conversionRate: 0,
      revenue: 0,
    };
  }

  // Get registration count
  const { count: regCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .in("event_id", eventIds);

  // Get check-in count
  const { data: registrations } = await supabase
    .from("registrations")
    .select("id")
    .in("event_id", eventIds);

  const regIds = registrations?.map((r) => r.id) || [];
  let checkinCount = 0;
  if (regIds.length > 0) {
    const { count } = await supabase
      .from("checkins")
      .select("*", { count: "exact", head: true })
      .in("registration_id", regIds)
      .is("undo_at", null);
    checkinCount = count || 0;
  }

  // Get promoter count
  const { count: promoterCount } = await supabase
    .from("event_promoters")
    .select("*", { count: "exact", head: true })
    .in("event_id", eventIds);

  const conversionRate = regCount && regCount > 0 ? Math.round((checkinCount / regCount) * 100) : 0;

  return {
    totalEvents: eventCount || 0,
    registrations: regCount || 0,
    checkIns: checkinCount,
    promoters: promoterCount || 0,
    conversionRate,
    revenue: 0, // TODO: Calculate from payouts
  };
}

/**
 * Get organizer chart data (registrations vs check-ins over time)
 */
export async function getOrganizerChartData(): Promise<ChartDataPoint[]> {
  const organizerId = await getUserOrganizerId();
  if (!organizerId) return [];

  const supabase = createServiceRoleClient();

  // Get events
  const { data: events } = await supabase
    .from("events")
    .select("id, start_time")
    .eq("organizer_id", organizerId)
    .order("start_time", { ascending: true });

  if (!events || events.length === 0) return [];

  // Get registrations and check-ins per event
  const chartData: ChartDataPoint[] = [];

  for (const event of events) {
    const { count: regCount } = await supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);

    const { data: regs } = await supabase
      .from("registrations")
      .select("id")
      .eq("event_id", event.id);

    const regIds = regs?.map((r) => r.id) || [];
    let checkinCount = 0;
    if (regIds.length > 0) {
      const { count } = await supabase
        .from("checkins")
        .select("*", { count: "exact", head: true })
        .in("registration_id", regIds)
        .is("undo_at", null);
      checkinCount = count || 0;
    }

    chartData.push({
      date: new Date(event.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      registrations: regCount || 0,
      checkins: checkinCount,
    });
  }

  return chartData;
}

/**
 * Get promoter dashboard stats
 */
export async function getPromoterDashboardStats(): Promise<{
  totalCheckIns: number;
  conversionRate: number;
  totalEarnings: number;
  rank: number;
  referrals: number;
  avgPerEvent: number;
}> {
  const promoterId = await getUserPromoterId();
  if (!promoterId) {
    return {
      totalCheckIns: 0,
      conversionRate: 0,
      totalEarnings: 0,
      rank: 0,
      referrals: 0,
      avgPerEvent: 0,
    };
  }

  const supabase = createServiceRoleClient();

  // Get referrals
  const { count: referralCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("referral_promoter_id", promoterId);

  // Get check-ins through referrals
  const { data: regs } = await supabase
    .from("registrations")
    .select("id")
    .eq("referral_promoter_id", promoterId);

  const regIds = regs?.map((r) => r.id) || [];
  let checkinCount = 0;
  if (regIds.length > 0) {
    const { count } = await supabase
      .from("checkins")
      .select("*", { count: "exact", head: true })
      .in("registration_id", regIds)
      .is("undo_at", null);
    checkinCount = count || 0;
  }

  // Get events promoted
  const { data: eventPromoters } = await supabase
    .from("event_promoters")
    .select("event_id")
    .eq("promoter_id", promoterId);

  const conversionRate = referralCount && referralCount > 0 ? Math.round((checkinCount / referralCount) * 100) : 0;
  const avgPerEvent = eventPromoters && eventPromoters.length > 0 ? Math.round(checkinCount / eventPromoters.length) : 0;

  // TODO: Calculate earnings from payout_lines
  // TODO: Calculate rank

  return {
    totalCheckIns: checkinCount,
    conversionRate,
    totalEarnings: 0,
    rank: 0,
    referrals: referralCount || 0,
    avgPerEvent,
  };
}

/**
 * Get promoter earnings chart data
 */
export async function getPromoterEarningsChartData(): Promise<Array<{ date: string; earnings: number }>> {
  const promoterId = await getUserPromoterId();
  if (!promoterId) return [];

  const supabase = createServiceRoleClient();

  // Get payout lines for this promoter
  const { data: payoutLines } = await supabase
    .from("payout_lines")
    .select(`
      commission_amount,
      created_at,
      payout_run:payout_runs(
        generated_at
      )
    `)
    .eq("promoter_id", promoterId)
    .order("created_at", { ascending: true });

  if (!payoutLines) return [];

  return payoutLines.map((line: any) => ({
    date: new Date(line.payout_run?.generated_at || line.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    earnings: parseFloat(line.commission_amount || 0),
  }));
}

/**
 * Get venue dashboard stats
 */
export async function getVenueDashboardStats(): Promise<{
  totalEvents: number;
  thisMonth: number;
  totalCheckIns: number;
  repeatRate: number;
  avgAttendance: number;
  topEvent: string;
}> {
  const venueId = await getUserVenueId();
  if (!venueId) {
    return {
      totalEvents: 0,
      thisMonth: 0,
      totalCheckIns: 0,
      repeatRate: 0,
      avgAttendance: 0,
      topEvent: "N/A",
    };
  }

  const supabase = createServiceRoleClient();

  // Get all events
  const { count: totalEvents } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("venue_id", venueId);

  // Get this month's events
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const { count: thisMonth } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("venue_id", venueId)
    .gte("start_time", startOfMonth.toISOString());

  // Get check-ins
  const { data: events } = await supabase.from("events").select("id").eq("venue_id", venueId);
  const eventIds = events?.map((e) => e.id) || [];

  let totalCheckIns = 0;
  if (eventIds.length > 0) {
    const { data: regs } = await supabase
      .from("registrations")
      .select("id")
      .in("event_id", eventIds);

    const regIds = regs?.map((r) => r.id) || [];
    if (regIds.length > 0) {
      const { count } = await supabase
        .from("checkins")
        .select("*", { count: "exact", head: true })
        .in("registration_id", regIds)
        .is("undo_at", null);
      totalCheckIns = count || 0;
    }
  }

  // Calculate average attendance
  const avgAttendance = totalEvents && totalEvents > 0 ? Math.round(totalCheckIns / totalEvents) : 0;

  // Get top event
  const { data: topEvent } = await supabase
    .from("events")
    .select("name")
    .eq("venue_id", venueId)
    .order("start_time", { ascending: false })
    .limit(1)
    .single();

  // Get venue info
  const { data: venue } = await supabase
    .from("venues")
    .select("id, name, slug, logo_url, cover_image_url")
    .eq("id", venueId)
    .single();

  return {
    totalEvents: totalEvents || 0,
    thisMonth: thisMonth || 0,
    totalCheckIns,
    repeatRate: 0, // TODO: Calculate repeat rate
    avgAttendance,
    topEvent: topEvent?.name || "N/A",
    venue: venue ? {
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      logo_url: venue.logo_url,
      cover_image_url: venue.cover_image_url,
    } : null,
  };
}

