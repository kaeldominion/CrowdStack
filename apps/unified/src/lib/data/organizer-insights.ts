import "server-only";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "./get-user-entity";

export interface PromoterPerformance {
  rank: number;
  name: string;
  checkins: number;
  referrals: number;
  conversion_rate: number;
}

export interface MonthlyTrend {
  month: string;
  registrations: number;
  checkins: number;
}

export interface OrganizerInsights {
  total_registrations: number;
  total_checkins: number;
  show_rate: number;
  events_count: number;
  avg_checkins_per_event: number;
  promoter_performance: {
    total_promoters: number;
    total_referrals: number;
    avg_conversion_rate: number;
    top_promoters: PromoterPerformance[];
  };
  monthly_trends: MonthlyTrend[];
}

/**
 * Get aggregated insights for an organizer
 * This returns only aggregated data - no individual attendee contact info
 */
export async function getOrganizerInsights(): Promise<OrganizerInsights> {
  const organizerId = await getUserOrganizerId();

  if (!organizerId) {
    return getEmptyInsights();
  }

  const supabase = createServiceRoleClient();

  // Get all events for the organizer
  const { data: events } = await supabase
    .from("events")
    .select("id, start_time")
    .eq("organizer_id", organizerId);

  const eventIds = events?.map(e => e.id) || [];
  const eventsCount = events?.length || 0;

  if (eventIds.length === 0) {
    return getEmptyInsights();
  }

  // Fetch all registrations for organizer events
  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, event_id, referral_promoter_id, registered_at")
    .in("event_id", eventIds);

  const registrationIds = registrations?.map(r => r.id) || [];
  const totalRegistrations = registrations?.length || 0;

  // Fetch all check-ins
  let totalCheckins = 0;
  const checkinsByRegistration = new Map<string, boolean>();

  if (registrationIds.length > 0) {
    const { data: checkins } = await supabase
      .from("checkins")
      .select("registration_id")
      .in("registration_id", registrationIds)
      .is("undo_at", null);

    totalCheckins = checkins?.length || 0;
    checkins?.forEach(c => {
      checkinsByRegistration.set(c.registration_id, true);
    });
  }

  // Calculate show rate
  const showRate = totalRegistrations > 0
    ? Math.round((totalCheckins / totalRegistrations) * 100 * 10) / 10
    : 0;

  // Calculate avg check-ins per event
  const avgCheckinsPerEvent = eventsCount > 0
    ? Math.round(totalCheckins / eventsCount)
    : 0;

  // Build promoter performance data (aggregated - names only, no contact info)
  const promoterStats = await getPromoterPerformance(
    registrations || [],
    checkinsByRegistration,
    supabase
  );

  // Build monthly trends (last 12 months)
  const monthlyTrends = buildMonthlyTrends(
    registrations || [],
    checkinsByRegistration
  );

  return {
    total_registrations: totalRegistrations,
    total_checkins: totalCheckins,
    show_rate: showRate,
    events_count: eventsCount,
    avg_checkins_per_event: avgCheckinsPerEvent,
    promoter_performance: promoterStats,
    monthly_trends: monthlyTrends,
  };
}

function getEmptyInsights(): OrganizerInsights {
  return {
    total_registrations: 0,
    total_checkins: 0,
    show_rate: 0,
    events_count: 0,
    avg_checkins_per_event: 0,
    promoter_performance: {
      total_promoters: 0,
      total_referrals: 0,
      avg_conversion_rate: 0,
      top_promoters: [],
    },
    monthly_trends: [],
  };
}

async function getPromoterPerformance(
  registrations: Array<{ id: string; referral_promoter_id: string | null }>,
  checkinsByRegistration: Map<string, boolean>,
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<OrganizerInsights["promoter_performance"]> {
  // Count referrals and check-ins per promoter
  const promoterReferrals = new Map<string, number>();
  const promoterCheckins = new Map<string, number>();

  registrations.forEach(reg => {
    if (reg.referral_promoter_id) {
      promoterReferrals.set(
        reg.referral_promoter_id,
        (promoterReferrals.get(reg.referral_promoter_id) || 0) + 1
      );

      if (checkinsByRegistration.get(reg.id)) {
        promoterCheckins.set(
          reg.referral_promoter_id,
          (promoterCheckins.get(reg.referral_promoter_id) || 0) + 1
        );
      }
    }
  });

  const promoterIds = [...promoterReferrals.keys()];
  const totalPromoters = promoterIds.length;
  const totalReferrals = [...promoterReferrals.values()].reduce((a, b) => a + b, 0);
  const totalPromoterCheckins = [...promoterCheckins.values()].reduce((a, b) => a + b, 0);

  // Calculate average conversion rate
  const avgConversionRate = totalReferrals > 0
    ? Math.round((totalPromoterCheckins / totalReferrals) * 100 * 10) / 10
    : 0;

  // Fetch promoter names (no contact info - privacy protection)
  const promoterNames = new Map<string, string>();

  if (promoterIds.length > 0) {
    const { data: promoters } = await supabase
      .from("promoters")
      .select("id, name")
      .in("id", promoterIds);

    promoters?.forEach(p => {
      // Use name or "Promoter" as fallback - never expose email
      const displayName = p.name && p.name.length > 0 && !p.name.match(/^[0-9a-f]{8}-[0-9a-f]{4}/i)
        ? p.name
        : "Promoter";
      promoterNames.set(p.id, displayName);
    });
  }

  // Build top promoters list (sorted by check-ins, limited to top 10)
  const topPromoters: PromoterPerformance[] = promoterIds
    .map(id => ({
      id,
      name: promoterNames.get(id) || "Promoter",
      checkins: promoterCheckins.get(id) || 0,
      referrals: promoterReferrals.get(id) || 0,
    }))
    .sort((a, b) => b.checkins - a.checkins)
    .slice(0, 10)
    .map((p, index) => ({
      rank: index + 1,
      name: p.name,
      checkins: p.checkins,
      referrals: p.referrals,
      conversion_rate: p.referrals > 0
        ? Math.round((p.checkins / p.referrals) * 100 * 10) / 10
        : 0,
    }));

  return {
    total_promoters: totalPromoters,
    total_referrals: totalReferrals,
    avg_conversion_rate: avgConversionRate,
    top_promoters: topPromoters,
  };
}

function buildMonthlyTrends(
  registrations: Array<{ id: string; registered_at: string }>,
  checkinsByRegistration: Map<string, boolean>
): MonthlyTrend[] {
  // Get last 12 months
  const months: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }

  // Count registrations and check-ins per month
  const regsByMonth = new Map<string, number>();
  const checkinsByMonth = new Map<string, number>();

  registrations.forEach(reg => {
    const date = new Date(reg.registered_at);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    regsByMonth.set(month, (regsByMonth.get(month) || 0) + 1);

    if (checkinsByRegistration.get(reg.id)) {
      checkinsByMonth.set(month, (checkinsByMonth.get(month) || 0) + 1);
    }
  });

  return months.map(month => ({
    month,
    registrations: regsByMonth.get(month) || 0,
    checkins: checkinsByMonth.get(month) || 0,
  }));
}
