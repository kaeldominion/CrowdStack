import "server-only";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export interface LiveMetrics {
  event_id: string;
  event_name: string;
  venue_name: string | null;
  current_attendance: number;
  total_registrations: number;
  capacity: number | null;
  capacity_percentage: number;
  check_ins_last_hour: number;
  check_ins_last_15min: number;
  peak_hour: string | null;
  promoter_stats: PromoterStat[];
  recent_checkins: RecentCheckin[];
  recent_registrations: RecentRegistration[];
  recent_activity: RecentActivity[];
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
  attendee_id: string;
  attendee_name: string;
  checked_in_at: string;
  promoter_name: string | null;
}

export interface RecentRegistration {
  id: string;
  attendee_id: string;
  attendee_name: string;
  registered_at: string;
  promoter_name: string | null;
}

export interface RecentActivity {
  id: string;
  type: "registration" | "checkin";
  attendee_id: string;
  attendee_name: string;
  timestamp: string;
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

  // Get event details with venue
  const { data: event } = await supabase
    .from("events")
    .select(`
      id, 
      name, 
      capacity, 
      start_time, 
      end_time,
      venue:venues(name)
    `)
    .eq("id", eventId)
    .single();

  if (!event) {
    return null;
  }

  // Get total registrations for this event
  const { count: totalRegistrations } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

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
        referral_promoter_id
      )
    `)
    .eq("registrations.event_id", eventId)
    .is("undo_at", null);

  if (checkinsError) {
    console.error("[LiveMetrics] Error fetching checkins:", checkinsError);
    throw checkinsError;
  }

  // Fetch promoter names separately
  const promoterIds = [...new Set((checkins || []).map((c: any) => c.registrations?.referral_promoter_id).filter(Boolean))];
  const promoterNameMap = new Map<string, string>();
  
  if (promoterIds.length > 0) {
    const { data: promoters } = await supabase
      .from("promoters")
      .select("id, name")
      .in("id", promoterIds);
    
    promoters?.forEach(p => promoterNameMap.set(p.id, p.name));
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
    if (promoterId) {
      const promoterName = promoterNameMap.get(promoterId) || "Unknown";
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
      attendee_id: c.registrations?.attendee?.id || "",
      attendee_name: c.registrations?.attendee?.name || "Unknown",
      checked_in_at: c.checked_in_at,
      promoter_name: c.registrations?.referral_promoter_id 
        ? promoterNameMap.get(c.registrations.referral_promoter_id) || null 
        : null,
    }));

  // Get recent registrations (last 50)
  const { data: recentRegistrationsData } = await supabase
    .from("registrations")
    .select(`
      id,
      registered_at,
      attendee:attendees(id, name),
      referral_promoter_id
    `)
    .eq("event_id", eventId)
    .order("registered_at", { ascending: false })
    .limit(50);

  // Get promoter names for registrations
  const regPromoterIds = [...new Set((recentRegistrationsData || []).map((r: any) => r.referral_promoter_id).filter(Boolean))];
  const regPromoterMap = new Map<string, string>();
  
  if (regPromoterIds.length > 0) {
    // Only fetch promoters we don't already have
    const newPromoterIds = regPromoterIds.filter(id => !promoterNameMap.has(id));
    if (newPromoterIds.length > 0) {
      const { data: promoters } = await supabase
        .from("promoters")
        .select("id, name")
        .in("id", newPromoterIds);
      
      promoters?.forEach(p => regPromoterMap.set(p.id, p.name));
    }
    // Merge with existing map
    regPromoterIds.forEach(id => {
      if (promoterNameMap.has(id)) {
        regPromoterMap.set(id, promoterNameMap.get(id)!);
      }
    });
  }

  const recentRegistrations: RecentRegistration[] = (recentRegistrationsData || [])
    .map((r: any) => ({
      id: r.id,
      attendee_id: r.attendee?.id || "",
      attendee_name: r.attendee?.name || "Unknown",
      registered_at: r.registered_at,
      promoter_name: r.referral_promoter_id 
        ? regPromoterMap.get(r.referral_promoter_id) || promoterNameMap.get(r.referral_promoter_id) || null 
        : null,
    }));

  // Combine recent check-ins and registrations into unified activity feed
  const recentActivity: RecentActivity[] = [
    ...recentCheckins.map((c) => ({
      id: `checkin-${c.id}`,
      type: "checkin" as const,
      attendee_id: c.attendee_id,
      attendee_name: c.attendee_name,
      timestamp: c.checked_in_at,
      promoter_name: c.promoter_name,
    })),
    ...recentRegistrations.map((r) => ({
      id: `registration-${r.id}`,
      type: "registration" as const,
      attendee_id: r.attendee_id,
      attendee_name: r.attendee_name,
      timestamp: r.registered_at,
      promoter_name: r.promoter_name,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30); // Top 30 most recent activities

  // Get VIP arrivals (this would need a VIP flag on attendees - placeholder for now)
  const vipArrivals: VIPArrival[] = recentCheckins.slice(0, 5).map((c) => ({
    attendee_id: "",
    attendee_name: c.attendee_name,
    checked_in_at: c.checked_in_at,
  }));

  return {
    event_id: eventId,
    event_name: event.name,
    venue_name: (event.venue as any)?.name || null,
    current_attendance: currentAttendance,
    total_registrations: totalRegistrations || 0,
    capacity: event.capacity,
    capacity_percentage: capacityPercentage,
    check_ins_last_hour: checkInsLastHour,
    check_ins_last_15min: checkInsLast15min,
    peak_hour: peakHour,
    promoter_stats: promoterStats,
    recent_checkins: recentCheckins,
    recent_registrations: recentRegistrations,
    recent_activity: recentActivity,
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

