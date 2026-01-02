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

interface CurrencyEarnings {
  confirmed: number;
  pending: number;
  estimated: number;
  total: number;
}

/**
 * Get promoter dashboard stats with earnings breakdown by currency
 */
export async function getPromoterDashboardStats(): Promise<{
  totalCheckIns: number;
  conversionRate: number;
  totalEarnings: number;
  earnings: {
    confirmed: number;      // Paid or confirmed by organizer
    pending: number;        // Awaiting payment from organizer
    estimated: number;      // From active/unclosed events
    total: number;          // Sum of all
  };
  earningsByCurrency: Record<string, CurrencyEarnings>;
  rank: number;
  referrals: number;
  avgPerEvent: number;
  eventsCount: number;
}> {
  const promoterId = await getUserPromoterId();
  if (!promoterId) {
    return {
      totalCheckIns: 0,
      conversionRate: 0,
      totalEarnings: 0,
      earnings: { confirmed: 0, pending: 0, estimated: 0, total: 0 },
      earningsByCurrency: {},
      rank: 0,
      referrals: 0,
      avgPerEvent: 0,
      eventsCount: 0,
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

  // Track earnings by currency
  const earningsByCurrency: Record<string, CurrencyEarnings> = {};

  const ensureCurrency = (currency: string) => {
    if (!earningsByCurrency[currency]) {
      earningsByCurrency[currency] = { confirmed: 0, pending: 0, estimated: 0, total: 0 };
    }
  };

  // Calculate earnings from payout_lines with payment status breakdown
  // Include currency from the event via payout_runs
  const { data: payoutLines } = await supabase
    .from("payout_lines")
    .select(`
      commission_amount,
      payment_status,
      payout_runs(
        events(
          currency
        )
      )
    `)
    .eq("promoter_id", promoterId);

  if (payoutLines) {
    for (const line of payoutLines) {
      const amount = parseFloat(line.commission_amount || "0");
      // Get currency from event, default to USD
      const payoutRun = line.payout_runs as any;
      const event = Array.isArray(payoutRun?.events) ? payoutRun.events[0] : payoutRun?.events;
      const currency = event?.currency || "USD";
      
      ensureCurrency(currency);
      
      if (line.payment_status === "paid" || line.payment_status === "confirmed") {
        earningsByCurrency[currency].confirmed += amount;
      } else {
        earningsByCurrency[currency].pending += amount;
      }
    }
  }

  // Calculate estimated earnings from active/unclosed events
  // Get events this promoter is assigned to that haven't been closed yet
  const { data: activeEventPromoters } = await supabase
    .from("event_promoters")
    .select(`
      event_id,
      commission_type,
      commission_config,
      per_head_rate,
      currency,
      events!inner(
        id,
        status,
        closed_at,
        currency
      )
    `)
    .eq("promoter_id", promoterId)
    .is("events.closed_at", null);

  if (activeEventPromoters) {
    for (const ep of activeEventPromoters) {
      const event = Array.isArray(ep.events) ? ep.events[0] : ep.events;
      const currency = (ep as any).currency || event?.currency || "USD";
      
      // Get check-ins for this event from this promoter's referrals
      const { data: eventRegs } = await supabase
        .from("registrations")
        .select("id")
        .eq("event_id", ep.event_id)
        .eq("referral_promoter_id", promoterId);

      if (eventRegs && eventRegs.length > 0) {
        const eventRegIds = eventRegs.map((r) => r.id);
        const { count: eventCheckins } = await supabase
          .from("checkins")
          .select("*", { count: "exact", head: true })
          .in("registration_id", eventRegIds)
          .is("undo_at", null);

        const checkinsCount = eventCheckins || 0;
        let estimatedAmount = 0;

        // Calculate based on commission type
        if (ep.per_head_rate) {
          // New enhanced payout model
          estimatedAmount = checkinsCount * parseFloat(ep.per_head_rate);
        } else if (ep.commission_type === "flat_per_head" && ep.commission_config) {
          const perHead = ep.commission_config.amount_per_head || ep.commission_config.flat_per_head || 0;
          estimatedAmount = checkinsCount * perHead;
        }

        if (estimatedAmount > 0) {
          ensureCurrency(currency);
          earningsByCurrency[currency].estimated += estimatedAmount;
        }
      }
    }
  }

  // Calculate totals for each currency
  for (const currency of Object.keys(earningsByCurrency)) {
    const c = earningsByCurrency[currency];
    c.total = c.confirmed + c.pending + c.estimated;
  }

  // Calculate aggregate totals (for backwards compatibility, but note these mix currencies!)
  let totalConfirmed = 0;
  let totalPending = 0;
  let totalEstimated = 0;
  for (const c of Object.values(earningsByCurrency)) {
    totalConfirmed += c.confirmed;
    totalPending += c.pending;
    totalEstimated += c.estimated;
  }
  const totalEarnings = totalConfirmed + totalPending + totalEstimated;

  // Calculate rank among all promoters (based on total check-ins)
  const { data: allPromoterStats } = await supabase
    .from("registrations")
    .select("referral_promoter_id")
    .not("referral_promoter_id", "is", null);

  let rank = 0;
  if (allPromoterStats) {
    // Count check-ins per promoter
    const promoterCounts: Record<string, number> = {};
    for (const reg of allPromoterStats) {
      if (reg.referral_promoter_id) {
        promoterCounts[reg.referral_promoter_id] = (promoterCounts[reg.referral_promoter_id] || 0) + 1;
      }
    }
    
    // Sort by count and find rank
    const sortedPromoters = Object.entries(promoterCounts)
      .sort(([, a], [, b]) => b - a);
    
    const myIndex = sortedPromoters.findIndex(([id]) => id === promoterId);
    rank = myIndex >= 0 ? myIndex + 1 : 0;
  }

  return {
    totalCheckIns: checkinCount,
    conversionRate,
    totalEarnings,
    earnings: {
      confirmed: totalConfirmed,
      pending: totalPending,
      estimated: totalEstimated,
      total: totalEarnings,
    },
    earningsByCurrency,
    rank,
    referrals: referralCount || 0,
    avgPerEvent,
    eventsCount: eventPromoters?.length || 0,
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
  topEventDetails: {
    id: string;
    name: string;
    registrations: number;
    checkins: number;
    date: string;
  } | null;
  venue: {
    id: string;
    name: string;
    slug: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
  } | null;
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
      topEventDetails: null,
      venue: null,
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

  // Get top event by check-in count
  let topEventDetails: {
    id: string;
    name: string;
    registrations: number;
    checkins: number;
    date: string;
  } | null = null;

  if (eventIds.length > 0) {
    // Get registration and check-in counts per event
    const eventStats: Array<{ id: string; name: string; date: string; registrations: number; checkins: number }> = [];
    
    const { data: allEvents } = await supabase
      .from("events")
      .select("id, name, start_time")
      .eq("venue_id", venueId);

    if (allEvents) {
      for (const event of allEvents) {
        const { count: regCount } = await supabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id);

        const { data: eventRegs } = await supabase
          .from("registrations")
          .select("id")
          .eq("event_id", event.id);

        let checkinCount = 0;
        if (eventRegs && eventRegs.length > 0) {
          const { count } = await supabase
            .from("checkins")
            .select("*", { count: "exact", head: true })
            .in("registration_id", eventRegs.map((r) => r.id))
            .is("undo_at", null);
          checkinCount = count || 0;
        }

        eventStats.push({
          id: event.id,
          name: event.name,
          date: event.start_time,
          registrations: regCount || 0,
          checkins: checkinCount,
        });
      }

      // Sort by check-ins (descending) to find top event
      eventStats.sort((a, b) => b.checkins - a.checkins);
      if (eventStats.length > 0) {
        topEventDetails = eventStats[0];
      }
    }
  }

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
    topEvent: topEventDetails?.name || "N/A",
    topEventDetails,
    venue: venue ? {
      id: venue.id,
      name: venue.name,
      slug: venue.slug,
      logo_url: venue.logo_url,
      cover_image_url: venue.cover_image_url,
    } : null,
  };
}


