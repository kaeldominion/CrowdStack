import "server-only";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { maskEmail, maskPhone } from "./mask-pii";

export interface VenueAttendee {
  id: string;
  name: string;
  surname?: string | null;
  email: string | null;
  phone: string;
  user_id: string | null;
  events_attended: number;
  total_check_ins: number;
  last_event_at: string | null;
  strike_count: number | null;
  is_banned: boolean;
  is_venue_vip: boolean;
  is_global_vip: boolean;
  created_at: string;
}

export interface VenueAttendeeFilters {
  search?: string;
  event_id?: string;
  has_check_in?: boolean;
  is_flagged?: boolean;
  min_strikes?: number;
}

/**
 * Get all attendees who have registered or checked in to events at this venue
 */
export async function getVenueAttendees(
  venueId: string,
  filters: VenueAttendeeFilters = {}
): Promise<VenueAttendee[]> {
  const supabase = createServiceRoleClient();

  // First, get all event IDs for this venue
  const { data: venueEvents } = await supabase
    .from("events")
    .select("id")
    .eq("venue_id", venueId);

  const eventIds = venueEvents?.map((e) => e.id) || [];

  if (eventIds.length === 0) {
    return [];
  }

  // Get all registrations for these events
  const { data: registrations } = await supabase
    .from("registrations")
    .select(`
      attendee_id,
      event_id,
      registered_at,
      checkins(id, checked_in_at)
    `)
    .in("event_id", eventIds);

  const attendeeIds = Array.from(new Set(registrations?.map((r) => r.attendee_id) || []));

  if (attendeeIds.length === 0) {
    return [];
  }

  // Get attendees
  let query = supabase
    .from("attendees")
    .select("id, name, surname, email, phone, user_id, created_at")
    .in("id", attendeeIds);

  // Apply filters
  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
    );
  }

  if (filters.event_id) {
    query = query.eq("registrations.event_id", filters.event_id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  // Get guest flags for these attendees
  const filteredAttendeeIds = data?.map((a) => a.id) || [];
  const { data: flags } = await supabase
    .from("guest_flags")
    .select("attendee_id, strike_count, permanent_ban")
    .eq("venue_id", venueId)
    .in("attendee_id", filteredAttendeeIds);

  const flagsMap = new Map(
    flags?.map((f) => [f.attendee_id, { strikes: f.strike_count || 0, banned: f.permanent_ban || false }]) || []
  );

  // Get VIP status for these attendees
  const { data: venueVips } = await supabase
    .from("venue_vips")
    .select("attendee_id")
    .eq("venue_id", venueId)
    .in("attendee_id", filteredAttendeeIds);

  const { data: globalVips } = await supabase
    .from("attendees")
    .select("id, is_global_vip")
    .in("id", filteredAttendeeIds)
    .eq("is_global_vip", true);

  const venueVipSet = new Set(venueVips?.map((v) => v.attendee_id) || []);
  const globalVipSet = new Set(globalVips?.map((a) => a.id) || []);

  // Get event details
  const { data: events } = await supabase
    .from("events")
    .select("id, name, start_time")
    .in("id", eventIds);

  const eventsMap = new Map(events?.map((e) => [e.id, e]) || []);

  // Transform and aggregate data
  const attendeesMap = new Map<string, VenueAttendee>();

  data?.forEach((attendee) => {
    const flags = flagsMap.get(attendee.id) || { strikes: 0, banned: false };
    const attendeeRegs = registrations?.filter((r) => r.attendee_id === attendee.id) || [];
    const checkins = attendeeRegs.filter((r) => r.checkins && r.checkins.length > 0);

    const eventTimes = attendeeRegs
      .map((r) => eventsMap.get(r.event_id)?.start_time)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());

    const attendeeData: VenueAttendee = {
      id: attendee.id,
      name: attendee.name,
      surname: attendee.surname || null,
      email: maskEmail(attendee.email),
      phone: maskPhone(attendee.phone) || "",
      user_id: attendee.user_id,
      events_attended: attendeeRegs.length,
      total_check_ins: checkins.length,
      last_event_at: eventTimes[0] || null,
      strike_count: flags.strikes,
      is_banned: flags.banned,
      is_venue_vip: venueVipSet.has(attendee.id),
      is_global_vip: globalVipSet.has(attendee.id),
      created_at: attendee.created_at,
    };

    attendeesMap.set(attendee.id, attendeeData);
  });

  let result = Array.from(attendeesMap.values());

  // Apply additional filters
  if (filters.has_check_in !== undefined) {
    result = result.filter((a) => (filters.has_check_in ? a.total_check_ins > 0 : a.total_check_ins === 0));
  }

  if (filters.is_flagged !== undefined) {
    result = result.filter((a) => (filters.is_flagged ? (a.strike_count || 0) > 0 : (a.strike_count || 0) === 0));
  }

  if (filters.min_strikes !== undefined) {
    result = result.filter((a) => (a.strike_count || 0) >= filters.min_strikes!);
  }

  return result;
}

/**
 * Get attendee details with full event history at this venue
 */
export async function getVenueAttendeeDetails(attendeeId: string, venueId: string) {
  const supabase = createServiceRoleClient();

  const { data: attendee } = await supabase
    .from("attendees")
    .select("*")
    .eq("id", attendeeId)
    .single();

  if (!attendee) {
    return null;
  }

  const { data: registrations } = await supabase
    .from("registrations")
    .select(`
      id,
      registered_at,
      event:events!inner(
        id,
        name,
        start_time,
        venue_id
      ),
      checkins(id, checked_in_at, checked_in_by)
    `)
    .eq("attendee_id", attendeeId)
    .eq("event.venue_id", venueId);

  const { data: flags } = await supabase
    .from("guest_flags")
    .select("*")
    .eq("attendee_id", attendeeId)
    .eq("venue_id", venueId)
    .single();

  return {
    attendee: attendee ? {
      ...attendee,
      email: maskEmail(attendee.email),
      phone: maskPhone(attendee.phone) || attendee.phone,
    } : null,
    events: registrations || [],
    flags: flags || null,
  };
}

