import "server-only";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { maskEmail, maskPhone } from "./mask-pii";

export interface PromoterAttendee {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  referral_count: number; // Events they registered through this promoter
  upcoming_signups: number; // Future events they're registered for
  total_check_ins: number;
  last_event_at: string | null;
  created_at: string;
}

export interface PromoterAttendeeFilters {
  search?: string;
  event_id?: string;
  category?: "referrals" | "upcoming" | "all";
}

/**
 * Get all attendees who have registered through this promoter or are registered for upcoming events
 */
export async function getPromoterAttendees(
  promoterId: string,
  filters: PromoterAttendeeFilters = {}
): Promise<PromoterAttendee[]> {
  const supabase = createServiceRoleClient();

  // Get events this promoter is promoting
  const { data: promotedEvents } = await supabase
    .from("event_promoters")
    .select("event_id")
    .eq("promoter_id", promoterId);

  const eventIds = promotedEvents?.map((ep) => ep.event_id) || [];

  // Get attendees who registered through this promoter's referral ONLY
  // This ensures we only show attendees that the promoter actually referred
  let referralQuery = supabase
    .from("attendees")
    .select(`
      id,
      name,
      email,
      phone,
      created_at,
      registrations!inner(
        referral_promoter_id,
        event_id,
        registered_at,
        event:events(
          id,
          name,
          start_time,
          status
        ),
        checkins(id, checked_in_at)
      )
    `)
    .eq("registrations.referral_promoter_id", promoterId);

  if (filters.search) {
    referralQuery = referralQuery.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
    );
  }

  if (filters.event_id) {
    referralQuery = referralQuery.eq("registrations.event_id", filters.event_id);
  }

  const { data: referralAttendees, error: referralError } = await referralQuery;

  if (referralError) {
    throw referralError;
  }

  // Get attendees registered for upcoming events that this promoter is promoting
  // BUT only if they registered through this promoter's referral
  // This ensures promoters only see attendees they actually referred
  let upcomingQuery = supabase
    .from("attendees")
    .select(`
      id,
      name,
      email,
      phone,
      created_at,
      registrations!inner(
        referral_promoter_id,
        event_id,
        registered_at,
        event:events!inner(
          id,
          name,
          start_time,
          status
        ),
        checkins(id, checked_in_at)
      )
    `)
    .in("registrations.event_id", eventIds.length > 0 ? eventIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("registrations.referral_promoter_id", promoterId)
    .neq("registrations.event.status", "ended");

  if (filters.search) {
    upcomingQuery = upcomingQuery.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
    );
  }

  if (filters.event_id) {
    upcomingQuery = upcomingQuery.eq("registrations.event_id", filters.event_id);
  }

  const { data: upcomingAttendees, error: upcomingError } = await upcomingQuery;

  if (upcomingError) {
    throw upcomingError;
  }

  // Merge and aggregate data
  const attendeesMap = new Map<string, PromoterAttendee>();

  // Process referral attendees
  referralAttendees?.forEach((attendee: any) => {
    const existing = attendeesMap.get(attendee.id);

    const checkins = attendee.registrations?.filter((r: any) => r.checkins?.length > 0) || [];
    const lastEvent = attendee.registrations
      ?.map((r: any) => r.event)
      .filter((e: any) => e.status === "ended")
      .sort((a: any, b: any) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0];

    const attendeeData: PromoterAttendee = {
      id: attendee.id,
      name: attendee.name,
      email: maskEmail(attendee.email),
      phone: maskPhone(attendee.phone) || "",
      referral_count: existing?.referral_count
        ? existing.referral_count + 1
        : (attendee.registrations?.length || 0),
      upcoming_signups: existing?.upcoming_signups || 0,
      total_check_ins: existing?.total_check_ins
        ? existing.total_check_ins + checkins.length
        : checkins.length,
      last_event_at: existing?.last_event_at
        ? new Date(existing.last_event_at) > new Date(lastEvent?.start_time || "")
          ? existing.last_event_at
          : lastEvent?.start_time
        : lastEvent?.start_time || null,
      created_at: attendee.created_at,
    };

    attendeesMap.set(attendee.id, attendeeData);
  });

  // Process upcoming attendees
  upcomingAttendees?.forEach((attendee: any) => {
    const existing = attendeesMap.get(attendee.id);
    const upcomingEvents = attendee.registrations?.filter(
      (r: any) => r.event && r.event.status !== "ended"
    ) || [];

    const attendeeData: PromoterAttendee = {
      id: attendee.id,
      name: attendee.name,
      email: maskEmail(attendee.email),
      phone: maskPhone(attendee.phone) || "",
      referral_count: existing?.referral_count || 0,
      upcoming_signups: existing?.upcoming_signups
        ? existing.upcoming_signups + upcomingEvents.length
        : upcomingEvents.length,
      total_check_ins: existing?.total_check_ins || 0,
      last_event_at: existing?.last_event_at || null,
      created_at: attendee.created_at,
    };

    attendeesMap.set(attendee.id, attendeeData);
  });

  let result = Array.from(attendeesMap.values());

  // Apply category filter
  if (filters.category === "referrals") {
    result = result.filter((a) => a.referral_count > 0);
  } else if (filters.category === "upcoming") {
    result = result.filter((a) => a.upcoming_signups > 0);
  }

  return result;
}

/**
 * Get attendee details with promoter-specific history
 */
export async function getPromoterAttendeeDetails(attendeeId: string, promoterId: string) {
  const supabase = createServiceRoleClient();

  const { data: attendee } = await supabase
    .from("attendees")
    .select("*")
    .eq("id", attendeeId)
    .single();

  if (!attendee) {
    return null;
  }

  // Get events through referral
  const { data: referralRegistrations } = await supabase
    .from("registrations")
    .select(`
      id,
      registered_at,
      event:events(
        id,
        name,
        start_time,
        status
      ),
      checkins(id, checked_in_at)
    `)
    .eq("attendee_id", attendeeId)
    .eq("referral_promoter_id", promoterId);

  // Get upcoming events this promoter is promoting
  const { data: promotedEvents } = await supabase
    .from("event_promoters")
    .select("event_id")
    .eq("promoter_id", promoterId);

  const eventIds = promotedEvents?.map((ep) => ep.event_id) || [];

  const { data: upcomingRegistrations } = await supabase
    .from("registrations")
    .select(`
      id,
      registered_at,
      event:events!inner(
        id,
        name,
        start_time,
        status
      ),
      checkins(id, checked_in_at)
    `)
    .eq("attendee_id", attendeeId)
    .in("event_id", eventIds.length > 0 ? eventIds : ["00000000-0000-0000-0000-000000000000"])
    .neq("event.status", "ended");

  return {
    attendee: attendee ? {
      ...attendee,
      email: maskEmail(attendee.email),
      phone: maskPhone(attendee.phone) || attendee.phone,
    } : null,
    referral_events: referralRegistrations || [],
    upcoming_events: upcomingRegistrations || [],
  };
}

