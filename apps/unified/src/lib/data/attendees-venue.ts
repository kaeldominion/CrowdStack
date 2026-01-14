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
  avg_venue_pulse_rating: number | null;
  venue_pulse_count: number;
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
      checkins(id, checked_in_at, undo_at)
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

  // Get venue pulse feedback for these attendees at this venue's events
  const { data: feedbackData } = await supabase
    .from("event_feedback")
    .select("attendee_id, rating")
    .in("attendee_id", filteredAttendeeIds)
    .in("event_id", eventIds);

  // Calculate average rating per attendee
  const feedbackByAttendee = new Map<string, { total: number; count: number }>();
  feedbackData?.forEach((fb) => {
    const existing = feedbackByAttendee.get(fb.attendee_id) || { total: 0, count: 0 };
    existing.total += fb.rating;
    existing.count += 1;
    feedbackByAttendee.set(fb.attendee_id, existing);
  });

  // Transform and aggregate data
  const attendeesMap = new Map<string, VenueAttendee>();

  data?.forEach((attendee) => {
    const flags = flagsMap.get(attendee.id) || { strikes: 0, banned: false };
    const attendeeRegs = registrations?.filter((r) => r.attendee_id === attendee.id) || [];
    const checkins = attendeeRegs.filter((r) => {
      if (!r.checkins || !Array.isArray(r.checkins)) return false;
      // Filter out undone check-ins
      return r.checkins.some((c: any) => !c.undo_at);
    });

    const eventTimes = attendeeRegs
      .map((r) => eventsMap.get(r.event_id)?.start_time)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());

    // Get feedback stats for this attendee
    const feedbackStats = feedbackByAttendee.get(attendee.id);
    const avgRating = feedbackStats
      ? Math.round((feedbackStats.total / feedbackStats.count) * 10) / 10
      : null;

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
      avg_venue_pulse_rating: avgRating,
      venue_pulse_count: feedbackStats?.count || 0,
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

  // Get all events for this venue
  const { data: venueEvents } = await supabase
    .from("events")
    .select("id")
    .eq("venue_id", venueId);

  const venueEventIds = venueEvents?.map((e) => e.id) || [];

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
      checkins!checkins_registration_id_fkey(id, checked_in_at, checked_in_by, undo_at)
    `)
    .eq("attendee_id", attendeeId)
    .eq("event.venue_id", venueId)
    .order("registered_at", { ascending: false });

  const { data: flags } = await supabase
    .from("guest_flags")
    .select("*")
    .eq("attendee_id", attendeeId)
    .eq("venue_id", venueId)
    .single();

  // Get VIP status
  const { data: venueVip } = await supabase
    .from("venue_vips")
    .select("reason")
    .eq("attendee_id", attendeeId)
    .eq("venue_id", venueId)
    .maybeSingle();

  // Get XP points (total and for this venue's events)
  let xpTotal = 0;
  let xpAtVenue = 0;
  if (attendee.user_id) {
    // Get total XP
    const { data: xpLedger } = await supabase
      .from("xp_ledger")
      .select("amount")
      .eq("user_id", attendee.user_id);

    xpTotal = xpLedger?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0;

    // Get XP from this venue's events
    if (venueEventIds.length > 0) {
      const { data: venueXp } = await supabase
        .from("xp_ledger")
        .select("amount")
        .eq("user_id", attendee.user_id)
        .in("event_id", venueEventIds);

      xpAtVenue = venueXp?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0;
    }
  }

  // Get feedback history for this venue
  let feedbackHistory: any[] = [];
  if (venueEventIds.length > 0) {
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
      .in("event_id", venueEventIds)
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

  // Get notes history for this attendee, scoped to this venue
  let notesHistory: any[] = [];
  if (registrationIds.length > 0) {
    const { data: notes } = await supabase
      .from("registration_notes_history")
      .select(`
        id,
        note_text,
        created_at,
        created_by,
        registration_id,
        registrations!inner(
          event_id,
          events!inner(id, name, start_time)
        ),
        created_by_user:created_by
      `)
      .in("registration_id", registrationIds)
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false });

    if (notes) {
      // Get user names for note creators from attendees table
      const userIds = [...new Set(notes.map((n) => n.created_by).filter(Boolean))];
      const userMap = new Map<string, { name: string; email: string | null }>();
      
      if (userIds.length > 0) {
        const { data: attendees } = await supabase
          .from("attendees")
          .select("user_id, name, surname, email")
          .in("user_id", userIds)
          .not("user_id", "is", null);
        
        attendees?.forEach((a) => {
          const fullName = a.surname ? `${a.name || ""} ${a.surname}`.trim() : (a.name || "Unknown");
          userMap.set(a.user_id!, { name: fullName, email: a.email });
        });
      }

      notesHistory = notes.map((note) => {
        const reg = Array.isArray(note.registrations) ? note.registrations[0] : note.registrations;
        const eventData = reg?.events;
        const event = Array.isArray(eventData) ? eventData[0] : eventData;
        const creator = userMap.get(note.created_by) || { name: "Unknown", email: null };
        
        return {
          id: note.id,
          note_text: note.note_text,
          created_at: note.created_at,
          created_by: note.created_by,
          created_by_name: creator.name,
          created_by_email: creator.email,
          registration_id: note.registration_id,
          event_id: event?.id || null,
          event_name: event?.name || "Unknown Event",
        };
      });
    }
  }

  // Get table bookings for this attendee at this venue's events
  let tableBookings: any[] = [];
  if (venueEventIds.length > 0) {
    const { data: bookings } = await supabase
      .from("table_bookings")
      .select(`
        id,
        guest_name,
        party_size,
        status,
        minimum_spend,
        deposit_amount,
        created_at,
        events!inner(id, name, start_time),
        venue_tables!inner(name, capacity)
      `)
      .eq("attendee_id", attendeeId)
      .in("event_id", venueEventIds)
      .order("created_at", { ascending: false });

    if (bookings) {
      tableBookings = bookings.map((booking) => {
        const event = Array.isArray(booking.events) ? booking.events[0] : booking.events;
        const table = Array.isArray(booking.venue_tables) ? booking.venue_tables[0] : booking.venue_tables;
        return {
          id: booking.id,
          guest_name: booking.guest_name,
          party_size: booking.party_size,
          status: booking.status,
          minimum_spend: booking.minimum_spend,
          deposit_amount: booking.deposit_amount,
          created_at: booking.created_at,
          event_id: event?.id || null,
          event_name: event?.name || "Unknown Event",
          event_date: event?.start_time || null,
          table_name: table?.name || "Unknown Table",
          table_capacity: table?.capacity || 0,
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
    flags: flags || null,
    vip: {
      isGlobalVip: attendee.is_global_vip || false,
      isVenueVip: !!venueVip,
      venueVipReason: venueVip?.reason || null,
    },
    xp: {
      total: xpTotal,
      at_venue: xpAtVenue,
    },
    feedback: feedbackHistory,
    checkins: checkinHistory,
    tableBookings: tableBookings,
    notesHistory: notesHistory,
  };
}

