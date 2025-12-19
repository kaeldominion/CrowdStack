import "server-only";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { maskEmail, maskPhone } from "./mask-pii";

export interface OrganizerAttendee {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  events_attended: number;
  total_check_ins: number;
  last_event_at: string | null;
  created_at: string;
}

export interface OrganizerAttendeeFilters {
  search?: string;
  event_id?: string;
  has_check_in?: boolean;
}

/**
 * Get all attendees who have registered or checked in to events created by this organizer
 */
export async function getOrganizerAttendees(
  organizerId: string,
  filters: OrganizerAttendeeFilters = {}
): Promise<OrganizerAttendee[]> {
  const supabase = createServiceRoleClient();

  // Get all event IDs for this organizer
  const { data: organizerEvents } = await supabase
    .from("events")
    .select("id")
    .eq("organizer_id", organizerId);

  const eventIds = organizerEvents?.map((e) => e.id) || [];

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
    .select("id, name, email, phone, created_at")
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

  // Get event details
  const { data: events } = await supabase
    .from("events")
    .select("id, name, start_time")
    .in("id", eventIds);

  const eventsMap = new Map(events?.map((e) => [e.id, e]) || []);

  // Transform and aggregate data
  const attendeesMap = new Map<string, OrganizerAttendee>();

  data?.forEach((attendee) => {
    const attendeeRegs = registrations?.filter((r) => r.attendee_id === attendee.id) || [];
    const checkins = attendeeRegs.filter((r) => r.checkins && r.checkins.length > 0);

    const eventTimes = attendeeRegs
      .map((r) => eventsMap.get(r.event_id)?.start_time)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());

    const attendeeData: OrganizerAttendee = {
      id: attendee.id,
      name: attendee.name,
      email: maskEmail(attendee.email),
      phone: maskPhone(attendee.phone) || "",
      events_attended: attendeeRegs.length,
      total_check_ins: checkins.length,
      last_event_at: eventTimes[0] || null,
      created_at: attendee.created_at,
    };

    attendeesMap.set(attendee.id, attendeeData);
  });

  let result = Array.from(attendeesMap.values());

  // Apply additional filters
  if (filters.has_check_in !== undefined) {
    result = result.filter((a) => (filters.has_check_in ? a.total_check_ins > 0 : a.total_check_ins === 0));
  }

  return result;
}

/**
 * Get attendee details with full event history for this organizer
 */
export async function getOrganizerAttendeeDetails(attendeeId: string, organizerId: string) {
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
      referral_promoter_id,
      event:events!inner(
        id,
        name,
        start_time,
        organizer_id
      ),
      checkins(id, checked_in_at, checked_in_by)
    `)
    .eq("attendee_id", attendeeId)
    .eq("event.organizer_id", organizerId);

  return {
    attendee: attendee ? {
      ...attendee,
      email: maskEmail(attendee.email),
      phone: maskPhone(attendee.phone) || attendee.phone,
    } : null,
    events: registrations || [],
  };
}

