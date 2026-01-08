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
  is_global_vip: boolean;
  is_venue_vip: boolean;
  is_organizer_vip: boolean;
}

export interface RecentRegistration {
  id: string;
  attendee_id: string;
  attendee_name: string;
  registered_at: string;
  promoter_name: string | null;
  is_global_vip: boolean;
  is_venue_vip: boolean;
  is_organizer_vip: boolean;
}

export interface RecentActivity {
  id: string;
  type: "registration" | "checkin";
  attendee_id: string;
  attendee_name: string;
  timestamp: string;
  promoter_name: string | null;
  is_global_vip: boolean;
  is_venue_vip: boolean;
  is_organizer_vip: boolean;
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

  // Get event details with venue and organizer
  const { data: event } = await supabase
    .from("events")
    .select(`
      id, 
      name, 
      capacity, 
      start_time, 
      end_time,
      venue_id,
      organizer_id,
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
      .select("id, name, email")
      .in("id", promoterIds);
    
    promoters?.forEach(p => {
      // Use name if it looks valid, otherwise fall back to email or "Promoter"
      const isValidName = p.name && p.name.length > 0 && !p.name.match(/^[0-9a-f]{8}-[0-9a-f]{4}/i);
      const displayName = isValidName 
        ? p.name 
        : (p.email ? p.email.split("@")[0] : "Promoter");
      promoterNameMap.set(p.id, displayName);
    });
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

  // Get organizer's promoter profile ID (if they have one) to exclude from leaderboard
  // Only exclude the organizer's own promoter profile, not all promoters associated with the organizer
  const organizerPromoterId = new Set<string>();
  if (eventOrganizerId) {
    // Get the organizer's created_by user_id
    const { data: organizer } = await supabase
      .from("organizers")
      .select("created_by")
      .eq("id", eventOrganizerId)
      .single();
    
    if (organizer?.created_by) {
      // Find if this user has a promoter profile
      const { data: organizerPromoter } = await supabase
        .from("promoters")
        .select("id")
        .eq("user_id", organizer.created_by)
        .maybeSingle();
      
      if (organizerPromoter?.id) {
        organizerPromoterId.add(organizerPromoter.id);
      }
    }
  }

  // Get promoter stats
  const promoterCounts = new Map<string, { name: string; count: number }>();
  checkins?.forEach((c: any) => {
    const promoterId = c.registrations?.referral_promoter_id;
    if (promoterId && !organizerPromoterId.has(promoterId)) {
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
  const recentCheckinsData = (checkins || [])
    .sort((a: any, b: any) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime())
    .slice(0, 20);

  // Get attendee IDs for VIP lookup
  const checkinAttendeeIds = recentCheckinsData
    .map((c: any) => c.registrations?.attendee?.id)
    .filter(Boolean);

  // Fetch VIP status for check-in attendees (we'll fetch individually per attendee below)
  // Skip this bulk fetch as we need to fetch per attendee anyway

  // Get VIP status for all attendees using direct queries
  const { data: globalVips } = checkinAttendeeIds.length > 0
    ? await supabase
        .from("attendees")
        .select("id, is_global_vip")
        .in("id", checkinAttendeeIds)
        .eq("is_global_vip", true)
    : { data: [] };

  const eventVenueId = (event as any).venue_id;
  const eventOrganizerId = (event as any).organizer_id;

  const { data: venueVips } = eventVenueId && checkinAttendeeIds.length > 0
    ? await supabase
        .from("venue_vips")
        .select("attendee_id")
        .eq("venue_id", eventVenueId)
        .in("attendee_id", checkinAttendeeIds)
    : { data: [] };

  const { data: organizerVips } = eventOrganizerId && checkinAttendeeIds.length > 0
    ? await supabase
        .from("organizer_vips")
        .select("attendee_id")
        .eq("organizer_id", eventOrganizerId)
        .in("attendee_id", checkinAttendeeIds)
    : { data: [] };

  const globalVipSet = new Set(globalVips?.map((a) => a.id) || []);
  const venueVipSet = new Set(venueVips?.map((v) => v.attendee_id) || []);
  const organizerVipSet = new Set(organizerVips?.map((o) => o.attendee_id) || []);

  const recentCheckins: RecentCheckin[] = recentCheckinsData.map((c: any) => {
    const attendeeId = c.registrations?.attendee?.id || "";
    return {
      id: c.id,
      attendee_id: attendeeId,
      attendee_name: c.registrations?.attendee?.name || "Unknown",
      checked_in_at: c.checked_in_at,
      promoter_name: c.registrations?.referral_promoter_id 
        ? promoterNameMap.get(c.registrations.referral_promoter_id) || null 
        : null,
      is_global_vip: globalVipSet.has(attendeeId),
      is_venue_vip: venueVipSet.has(attendeeId),
      is_organizer_vip: organizerVipSet.has(attendeeId),
    };
  });

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
        .select("id, name, email")
        .in("id", newPromoterIds);
      
      promoters?.forEach(p => {
        // Use name if it looks valid, otherwise fall back to email or "Promoter"
        const isValidName = p.name && p.name.length > 0 && !p.name.match(/^[0-9a-f]{8}-[0-9a-f]{4}/i);
        const displayName = isValidName 
          ? p.name 
          : (p.email ? p.email.split("@")[0] : "Promoter");
        regPromoterMap.set(p.id, displayName);
      });
    }
    // Merge with existing map
    regPromoterIds.forEach(id => {
      if (promoterNameMap.has(id)) {
        regPromoterMap.set(id, promoterNameMap.get(id)!);
      }
    });
  }

  // Get attendee IDs for registration VIP lookup
  const registrationAttendeeIds = (recentRegistrationsData || [])
    .map((r: any) => r.attendee?.id)
    .filter(Boolean);

  // Fetch VIP status for registration attendees
  const { data: regGlobalVips } = registrationAttendeeIds.length > 0
    ? await supabase
        .from("attendees")
        .select("id, is_global_vip")
        .in("id", registrationAttendeeIds)
        .eq("is_global_vip", true)
    : { data: [] };

  const { data: regVenueVips } = eventVenueId && registrationAttendeeIds.length > 0
    ? await supabase
        .from("venue_vips")
        .select("attendee_id")
        .eq("venue_id", eventVenueId)
        .in("attendee_id", registrationAttendeeIds)
    : { data: [] };

  const { data: regOrganizerVips } = eventOrganizerId && registrationAttendeeIds.length > 0
    ? await supabase
        .from("organizer_vips")
        .select("attendee_id")
        .eq("organizer_id", eventOrganizerId)
        .in("attendee_id", registrationAttendeeIds)
    : { data: [] };

  const regGlobalVipSet = new Set(regGlobalVips?.map((a) => a.id) || []);
  const regVenueVipSet = new Set(regVenueVips?.map((v) => v.attendee_id) || []);
  const regOrganizerVipSet = new Set(regOrganizerVips?.map((o) => o.attendee_id) || []);

  const recentRegistrations: RecentRegistration[] = (recentRegistrationsData || [])
    .map((r: any) => {
      const attendeeId = r.attendee?.id || "";
      return {
        id: r.id,
        attendee_id: attendeeId,
        attendee_name: r.attendee?.name || "Unknown",
        registered_at: r.registered_at,
        promoter_name: r.referral_promoter_id 
          ? regPromoterMap.get(r.referral_promoter_id) || promoterNameMap.get(r.referral_promoter_id) || null 
          : null,
        is_global_vip: regGlobalVipSet.has(attendeeId),
        is_venue_vip: regVenueVipSet.has(attendeeId),
        is_organizer_vip: regOrganizerVipSet.has(attendeeId),
      };
    });

  // Combine recent check-ins and registrations into unified activity feed
  const recentActivity: RecentActivity[] = [
    ...recentCheckins.map((c) => ({
      id: `checkin-${c.id}`,
      type: "checkin" as const,
      attendee_id: c.attendee_id,
      attendee_name: c.attendee_name,
      timestamp: c.checked_in_at,
      promoter_name: c.promoter_name,
      is_global_vip: c.is_global_vip,
      is_venue_vip: c.is_venue_vip,
      is_organizer_vip: c.is_organizer_vip,
    })),
    ...recentRegistrations.map((r) => ({
      id: `registration-${r.id}`,
      type: "registration" as const,
      attendee_id: r.attendee_id,
      attendee_name: r.attendee_name,
      timestamp: r.registered_at,
      promoter_name: r.promoter_name,
      is_global_vip: r.is_global_vip,
      is_venue_vip: r.is_venue_vip,
      is_organizer_vip: r.is_organizer_vip,
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

