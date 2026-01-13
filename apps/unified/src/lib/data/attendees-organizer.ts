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
  is_organizer_vip: boolean;
  is_global_vip: boolean;
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

  // Filter registrations by event_id if specified
  let filteredRegistrations = registrations || [];
  if (filters.event_id) {
    filteredRegistrations = filteredRegistrations.filter((r) => r.event_id === filters.event_id);
  }

  // Get unique attendee IDs (filter out nulls)
  const attendeeIds = Array.from(new Set(filteredRegistrations.map((r) => r.attendee_id).filter(Boolean) as string[]));

  if (attendeeIds.length === 0) {
    return [];
  }

  // Get attendees
  let query = supabase
    .from("attendees")
    .select("id, name, email, phone, created_at")
    .in("id", attendeeIds);

  // Apply search filter
  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
    );
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

  // Get VIP status for these attendees
  const filteredAttendeeIds = data?.map((a) => a.id) || [];
  const { data: organizerVips } = await supabase
    .from("organizer_vips")
    .select("attendee_id")
    .eq("organizer_id", organizerId)
    .in("attendee_id", filteredAttendeeIds);

  const { data: globalVips } = await supabase
    .from("attendees")
    .select("id, is_global_vip")
    .in("id", filteredAttendeeIds)
    .eq("is_global_vip", true);

  const organizerVipSet = new Set(organizerVips?.map((v) => v.attendee_id) || []);
  const globalVipSet = new Set(globalVips?.map((a) => a.id) || []);

  // Transform and aggregate data
  const attendeesMap = new Map<string, OrganizerAttendee>();

  data?.forEach((attendee) => {
    const attendeeRegs = filteredRegistrations.filter((r) => r.attendee_id === attendee.id) || [];
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
      is_organizer_vip: organizerVipSet.has(attendee.id),
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

  // Get all events for this organizer
  const { data: organizerEvents } = await supabase
    .from("events")
    .select("id")
    .eq("organizer_id", organizerId);

  const organizerEventIds = organizerEvents?.map((e) => e.id) || [];

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
    .eq("event.organizer_id", organizerId)
    .order("registered_at", { ascending: false });

  // Get VIP status
  const { data: organizerVip } = await supabase
    .from("organizer_vips")
    .select("reason")
    .eq("attendee_id", attendeeId)
    .eq("organizer_id", organizerId)
    .maybeSingle();

  // Get XP points (total and for this organizer's events)
  let xpTotal = 0;
  let xpAtOrganizer = 0;
  if (attendee.user_id) {
    // Get total XP
    const { data: xpLedger } = await supabase
      .from("xp_ledger")
      .select("amount")
      .eq("user_id", attendee.user_id);

    xpTotal = xpLedger?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0;

    // Get XP from this organizer's events
    if (organizerEventIds.length > 0) {
      const { data: organizerXp } = await supabase
        .from("xp_ledger")
        .select("amount")
        .eq("user_id", attendee.user_id)
        .in("event_id", organizerEventIds);

      xpAtOrganizer = organizerXp?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0;
    }
  }

  // Get feedback history for this organizer's events
  let feedbackHistory: any[] = [];
  if (organizerEventIds.length > 0) {
    const { data: feedback } = await supabase
      .from("event_feedback")
      .select(`
        id,
        rating,
        feedback_type,
        comment,
        categories,
        free_text,
        submitted_at,
        resolved_at,
        events!inner(id, name, start_time)
      `)
      .eq("attendee_id", attendeeId)
      .in("event_id", organizerEventIds)
      .order("submitted_at", { ascending: false });

    if (feedback) {
      feedbackHistory = feedback.map((fb) => {
        const event = Array.isArray(fb.events) ? fb.events[0] : fb.events;
        let categories: string[] = [];
        if (fb.categories) {
          try {
            categories = typeof fb.categories === "string" ? JSON.parse(fb.categories) : fb.categories;
          } catch {
            categories = [];
          }
        }
        return {
          id: fb.id,
          rating: fb.rating,
          feedback_type: fb.feedback_type,
          comment: fb.comment,
          categories,
          free_text: fb.free_text,
          submitted_at: fb.submitted_at,
          resolved_at: fb.resolved_at,
          event_id: event?.id || null,
          event_name: event?.name || "Unknown Event",
          event_date: event?.start_time || null,
        };
      });
    }
  }

  // Get comprehensive check-in history
  const registrationIds = registrations?.map((r) => r.id) || [];
  let checkinHistory: any[] = [];
  if (registrationIds.length > 0) {
    const { data: checkins } = await supabase
      .from("checkins")
      .select(`
        id,
        checked_in_at,
        checked_in_by,
        registrations!inner(
          event_id,
          events!inner(id, name, start_time)
        )
      `)
      .in("registration_id", registrationIds)
      .order("checked_in_at", { ascending: false });

    if (checkins) {
      checkinHistory = checkins.map((checkin) => {
        const reg = Array.isArray(checkin.registrations) ? checkin.registrations[0] : checkin.registrations;
        const eventData = reg?.events;
        const event = Array.isArray(eventData) ? eventData[0] : eventData;
        return {
          id: checkin.id,
          checked_in_at: checkin.checked_in_at,
          checked_in_by: checkin.checked_in_by,
          event_id: event?.id || null,
          event_name: event?.name || "Unknown Event",
          event_date: event?.start_time || null,
        };
      });
    }
  }

  return {
    attendee: attendee ? {
      ...attendee,
      email: maskEmail(attendee.email),
      phone: maskPhone(attendee.phone) || attendee.phone,
    } : null,
    events: registrations || [],
    vip: {
      isGlobalVip: attendee.is_global_vip || false,
      isOrganizerVip: !!organizerVip,
      organizerVipReason: organizerVip?.reason || null,
    },
    xp: {
      total: xpTotal,
      at_organizer: xpAtOrganizer,
    },
    feedback: feedbackHistory,
    checkins: checkinHistory,
  };
}

