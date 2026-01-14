import "server-only";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId, getUserVenueId, getUserPromoterId } from "./get-user-entity";
import { calculatePromoterPayout, type BonusTier } from "@crowdstack/shared/utils/payout-calculator";

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
 * Optionally accepts an organizerId to avoid redundant lookups
 */
export async function getOrganizerDashboardStats(passedOrganizerId?: string | null): Promise<DashboardStats> {
  const organizerId = passedOrganizerId ?? await getUserOrganizerId();
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

  // Get registration and check-in counts in one query
  const { data: allRegs } = await supabase
    .from("registrations")
    .select("id, checked_in")
    .in("event_id", eventIds);

  const regCount = allRegs?.length || 0;
  const checkinCount = allRegs?.filter((r) => r.checked_in).length || 0;

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
 * Optionally accepts an organizerId to avoid redundant lookups when called with stats
 */
export async function getOrganizerChartData(passedOrganizerId?: string | null): Promise<ChartDataPoint[]> {
  const organizerId = passedOrganizerId ?? await getUserOrganizerId();
  if (!organizerId) return [];

  const supabase = createServiceRoleClient();

  // Get events for this organizer
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("id, start_time")
    .eq("organizer_id", organizerId)
    .order("start_time", { ascending: true });

  if (eventsError) {
    console.error("[getOrganizerChartData] Error fetching events:", eventsError);
    return [];
  }

  if (!events || events.length === 0) return [];

  // BATCH QUERY OPTIMIZATION: Get all counts in bulk instead of per-event
  const eventIds = events.map((e) => e.id);

  // Batch fetch all registrations for these events
  const { data: allRegs, error: regsError } = await supabase
    .from("registrations")
    .select("event_id, checked_in")
    .in("event_id", eventIds);

  if (regsError) {
    console.error("[getOrganizerChartData] Error fetching registrations:", regsError);
  }

  // Build counts maps for O(1) lookups
  const regsByEvent = new Map<string, number>();
  const checkinsByEvent = new Map<string, number>();

  (allRegs || []).forEach((reg) => {
    regsByEvent.set(reg.event_id, (regsByEvent.get(reg.event_id) || 0) + 1);
    if (reg.checked_in) {
      checkinsByEvent.set(reg.event_id, (checkinsByEvent.get(reg.event_id) || 0) + 1);
    }
  });

  // Build chart data from pre-computed maps (no additional queries)
  const chartData: ChartDataPoint[] = events.map((event) => ({
    date: new Date(event.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    registrations: regsByEvent.get(event.id) || 0,
    checkins: checkinsByEvent.get(event.id) || 0,
  }));

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
      per_head_min,
      per_head_max,
      fixed_fee,
      minimum_guests,
      below_minimum_percent,
      bonus_threshold,
      bonus_amount,
      bonus_tiers,
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

  if (activeEventPromoters && activeEventPromoters.length > 0) {
    // BATCH QUERY OPTIMIZATION: Get all registrations for active events at once
    const activeEventIds = activeEventPromoters.map((ep) => ep.event_id);

    const { data: allActiveRegs } = await supabase
      .from("registrations")
      .select("event_id, checked_in")
      .in("event_id", activeEventIds)
      .eq("referral_promoter_id", promoterId);

    // Build check-in counts map for O(1) lookups
    const checkinsByActiveEvent = new Map<string, number>();
    (allActiveRegs || []).forEach((reg) => {
      if (reg.checked_in) {
        checkinsByActiveEvent.set(reg.event_id, (checkinsByActiveEvent.get(reg.event_id) || 0) + 1);
      }
    });

    // Calculate estimated earnings using pre-computed map
    for (const ep of activeEventPromoters) {
      const event = Array.isArray(ep.events) ? ep.events[0] : ep.events;
      const currency = (ep as any).currency || event?.currency || "USD";
      const checkinsCount = checkinsByActiveEvent.get(ep.event_id) || 0;

      // Parse bonus_tiers if present
      let bonusTiers: BonusTier[] | null = null;
      if ((ep as any).bonus_tiers) {
        try {
          bonusTiers = typeof (ep as any).bonus_tiers === 'string'
            ? JSON.parse((ep as any).bonus_tiers)
            : (ep as any).bonus_tiers;
        } catch {
          bonusTiers = null;
        }
      }

      // Calculate estimated earnings using shared calculation function
      const breakdown = calculatePromoterPayout(
        {
          per_head_rate: ep.per_head_rate ? parseFloat(ep.per_head_rate) : null,
          per_head_min: (ep as any).per_head_min,
          per_head_max: (ep as any).per_head_max,
          fixed_fee: (ep as any).fixed_fee ? parseFloat((ep as any).fixed_fee) : null,
          minimum_guests: (ep as any).minimum_guests,
          below_minimum_percent: (ep as any).below_minimum_percent ? parseFloat((ep as any).below_minimum_percent) : null,
          bonus_threshold: (ep as any).bonus_threshold,
          bonus_amount: (ep as any).bonus_amount ? parseFloat((ep as any).bonus_amount) : null,
          bonus_tiers: bonusTiers,
          manual_adjustment_amount: null, // No manual adjustments for estimates
        },
        checkinsCount
      );

      const estimatedAmount = breakdown.calculated_payout;

      if (estimatedAmount > 0) {
        ensureCurrency(currency);
        earningsByCurrency[currency].estimated += estimatedAmount;
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

  // OPTIMIZED: Calculate rank using database aggregation instead of full table scan
  // This uses a subquery to count registrations per promoter and find this promoter's rank
  let rank = 0;

  // Get count of promoters with more referrals than this one (rank = count + 1)
  const { count: promotersAhead } = await supabase.rpc("count_promoters_ahead", {
    target_promoter_id: promoterId,
  }).single();

  if (promotersAhead !== null) {
    rank = (promotersAhead as number) + 1;
  } else {
    // Fallback: If RPC doesn't exist, use a simpler approach
    // Get this promoter's count and count how many have more
    const myCount = referralCount || 0;
    if (myCount > 0) {
      const { count: ahead } = await supabase
        .from("registrations")
        .select("referral_promoter_id", { count: "exact", head: true })
        .not("referral_promoter_id", "is", null)
        .neq("referral_promoter_id", promoterId);

      // Simplified: assume rank 1 if we have referrals (actual ranking would need GROUP BY)
      rank = 1; // Basic fallback - proper ranking requires the RPC function
    }
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

  // Get check-ins using checked_in boolean field
  const { data: events } = await supabase.from("events").select("id").eq("venue_id", venueId);
  const eventIds = events?.map((e) => e.id) || [];

  let totalCheckIns = 0;
  if (eventIds.length > 0) {
    const { data: allRegs } = await supabase
      .from("registrations")
      .select("id, checked_in")
      .in("event_id", eventIds);

    totalCheckIns = allRegs?.filter((r) => r.checked_in).length || 0;
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
    // BATCH QUERY OPTIMIZATION: Get all data in bulk instead of per-event
    const { data: allEvents } = await supabase
      .from("events")
      .select("id, name, start_time")
      .eq("venue_id", venueId);

    if (allEvents && allEvents.length > 0) {
      const allEventIds = allEvents.map((e) => e.id);

      // Batch fetch all registrations for all venue events
      const { data: allRegs } = await supabase
        .from("registrations")
        .select("event_id, checked_in")
        .in("event_id", allEventIds);

      // Build counts maps for O(1) lookups
      const regsByEvent = new Map<string, number>();
      const checkinsByEvent = new Map<string, number>();

      (allRegs || []).forEach((reg) => {
        regsByEvent.set(reg.event_id, (regsByEvent.get(reg.event_id) || 0) + 1);
        if (reg.checked_in) {
          checkinsByEvent.set(reg.event_id, (checkinsByEvent.get(reg.event_id) || 0) + 1);
        }
      });

      // Build event stats from pre-computed maps
      const eventStats = allEvents.map((event) => ({
        id: event.id,
        name: event.name,
        date: event.start_time,
        registrations: regsByEvent.get(event.id) || 0,
        checkins: checkinsByEvent.get(event.id) || 0,
      }));

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


