import "server-only";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export interface LiveMetrics {
  event_id: string;
  current_attendance: number;
  capacity: number | null;
  capacity_percentage: number;
  check_ins_last_hour: number;
  check_ins_last_15min: number;
  peak_hour: string | null;
  promoter_stats: PromoterStat[];
  recent_checkins: RecentCheckin[];
  vip_arrivals: VIPArrival[];
  updated_at: string;
}

export interface PromoterStat {
  promoter_id: string;
  promoter_name: string;
  check_ins: number;
  rank: number;
}

export interface RecentCheckin {
  id: string;
  attendee_name: string;
  checked_in_at: string;
  promoter_name: string | null;
}

export interface VIPArrival {
  attendee_id: string;
  attendee_name: string;
  checked_in_at: string;
}

/**
 * Get real-time metrics for an active event
 */
export async function getLiveMetrics(eventId: string): Promise<LiveMetrics | null> {
  const supabase = createServiceRoleClient();

  // Get event details
  const { data: event } = await supabase
    .from("events")
    .select("id, name, capacity, start_time, end_time")
    .eq("id", eventId)
    .single();

  if (!event) {
    return null;
  }

  // Get current check-in count
  const { data: checkins, error: checkinsError } = await supabase
    .from("checkins")
    .select(`
      id,
      checked_in_at,
      registration_id,
      registrations!inner(
        event_id,
        attendee:attendees(id, name),
        referral_promoter_id,
        promoters(name)
      )
    `)
    .eq("registrations.event_id", eventId)
    .is("undo_at", null);

  if (checkinsError) {
    throw checkinsError;
  }

  const currentAttendance = checkins?.length || 0;
  const capacityPercentage = event.capacity
    ? Math.round((currentAttendance / event.capacity) * 100)
    : 0;

  // Calculate hourly flow rates
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const checkInsLastHour =
    checkins?.filter((c: any) => new Date(c.checked_in_at) >= oneHourAgo).length || 0;
  const checkInsLast15min =
    checkins?.filter((c: any) => new Date(c.checked_in_at) >= fifteenMinsAgo).length || 0;

  // Calculate peak hour (hour with most check-ins)
  const hourlyCounts = new Map<number, number>();
  checkins?.forEach((c: any) => {
    const hour = new Date(c.checked_in_at).getHours();
    hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
  });

  let peakHour: string | null = null;
  let maxCount = 0;
  hourlyCounts.forEach((count, hour) => {
    if (count > maxCount) {
      maxCount = count;
      peakHour = `${hour}:00`;
    }
  });

  // Get promoter stats
  const promoterCounts = new Map<string, { name: string; count: number }>();
  checkins?.forEach((c: any) => {
    const promoterId = c.registrations?.referral_promoter_id;
    const promoterName = c.registrations?.promoters?.name || "Unknown";
    if (promoterId) {
      const existing = promoterCounts.get(promoterId);
      promoterCounts.set(promoterId, {
        name: promoterName,
        count: (existing?.count || 0) + 1,
      });
    }
  });

  const promoterStats: PromoterStat[] = Array.from(promoterCounts.entries())
    .map(([promoterId, data]) => ({
      promoter_id: promoterId,
      promoter_name: data.name,
      check_ins: data.count,
      rank: 0, // Will be calculated below
    }))
    .sort((a, b) => b.check_ins - a.check_ins)
    .map((stat, index) => ({
      ...stat,
      rank: index + 1,
    }));

  // Get recent check-ins (last 20)
  const recentCheckins: RecentCheckin[] = (checkins || [])
    .sort((a: any, b: any) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime())
    .slice(0, 20)
    .map((c: any) => ({
      id: c.id,
      attendee_name: c.registrations?.attendee?.name || "Unknown",
      checked_in_at: c.checked_in_at,
      promoter_name: c.registrations?.promoters?.name || null,
    }));

  // Get VIP arrivals (this would need a VIP flag on attendees - placeholder for now)
  const vipArrivals: VIPArrival[] = recentCheckins.slice(0, 5).map((c) => ({
    attendee_id: "",
    attendee_name: c.attendee_name,
    checked_in_at: c.checked_in_at,
  }));

  return {
    event_id: eventId,
    current_attendance: currentAttendance,
    capacity: event.capacity,
    capacity_percentage: capacityPercentage,
    check_ins_last_hour: checkInsLastHour,
    check_ins_last_15min: checkInsLast15min,
    peak_hour: peakHour,
    promoter_stats: promoterStats,
    recent_checkins: recentCheckins,
    vip_arrivals: vipArrivals,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Get live metrics for multiple events (venue-wide)
 */
export async function getVenueLiveMetrics(venueId: string): Promise<LiveMetrics[]> {
  const supabase = createServiceRoleClient();

  // Get all active events at this venue
  const now = new Date();
  const { data: events } = await supabase
    .from("events")
    .select("id")
    .eq("venue_id", venueId)
    .lte("start_time", now.toISOString())
    .gte("end_time", now.toISOString())
    .eq("status", "published");

  if (!events || events.length === 0) {
    return [];
  }

  const metrics = await Promise.all(
    events.map((event) => getLiveMetrics(event.id))
  );

  return metrics.filter((m): m is LiveMetrics => m !== null);
}

