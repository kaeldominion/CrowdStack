import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { OrganizerEventsPageClient } from "./OrganizerEventsPageClient";

interface Event {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  closed_at: string | null;
  venue_approval_status: string;
  venue_rejection_reason: string | null;
  registrations: number;
  checkins: number;
  payouts_pending: number;
  payouts_paid: number;
  flier_url: string | null;
  cover_image_url: string | null;
  capacity: number | null;
  venue: any | null;
  organizer: any | null;
}

async function getOrganizerEvents() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const serviceSupabase = createServiceRoleClient();

  // Get organizer IDs for current user in a single parallel query
  const [organizerUsersResult, createdOrganizersResult] = await Promise.all([
    serviceSupabase
      .from("organizer_users")
      .select("organizer_id")
      .eq("user_id", user.id),
    serviceSupabase
      .from("organizers")
      .select("id")
      .eq("created_by", user.id)
  ]);

  const organizerIds = new Set<string>();
  (organizerUsersResult.data || []).forEach((ou: any) => organizerIds.add(ou.organizer_id));
  (createdOrganizersResult.data || []).forEach((o: any) => organizerIds.add(o.id));

  if (organizerIds.size === 0) {
    return { events: [] };
  }

  // Use first organizer ID (for single-organizer users) or all for multi-organizer
  const organizerId = [...organizerIds][0];

  // Get events for this organizer
  const { data: events, error } = await serviceSupabase
    .from("events")
    .select(`
      id,
      name,
      slug,
      description,
      start_time,
      end_time,
      status,
      closed_at,
      venue_approval_status,
      venue_rejection_reason,
      capacity,
      cover_image_url,
      flier_url,
      created_at,
      venue:venues(id, name, logo_url, cover_image_url, city, state),
      organizer:organizers(id, name, logo_url)
    `)
    .eq("organizer_id", organizerId)
    .order("start_time", { ascending: false });

  if (error) {
    console.error("[OrganizerEvents] Query error:", error);
    return { events: [] };
  }

  // Get registration, checkin, and payout counts using efficient aggregation
  const eventIds = events?.map(e => e.id) || [];
  let registrationCounts: Record<string, number> = {};
  let checkinCounts: Record<string, number> = {};
  let payoutsPending: Record<string, number> = {};
  let payoutsPaid: Record<string, number> = {};

  if (eventIds.length > 0) {
    // Use parallel queries with aggregation for better performance
    const [regCountsResult, checkinCountsResult, payoutsResult] = await Promise.all([
      // Count registrations per event
      serviceSupabase
        .from("registrations")
        .select("event_id")
        .in("event_id", eventIds),
      // Count checkins per event by joining through registrations
      serviceSupabase
        .from("checkins")
        .select("registrations!inner(event_id)")
        .in("registrations.event_id", eventIds)
        .is("undo_at", null),
      // Get payout lines with event info
      serviceSupabase
        .from("payout_lines")
        .select(`
          payment_status,
          payout_runs!inner(event_id)
        `)
        .in("payout_runs.event_id", eventIds)
    ]);

    // Count registrations per event (in-memory aggregation of just event_ids)
    (regCountsResult.data || []).forEach((reg: any) => {
      registrationCounts[reg.event_id] = (registrationCounts[reg.event_id] || 0) + 1;
    });

    // Count checkins per event
    (checkinCountsResult.data || []).forEach((checkin: any) => {
      const eventId = checkin.registrations?.event_id;
      if (eventId) {
        checkinCounts[eventId] = (checkinCounts[eventId] || 0) + 1;
      }
    });

    // Count payouts per event by status
    (payoutsResult.data || []).forEach((payout: any) => {
      const eventId = payout.payout_runs?.event_id;
      if (eventId) {
        if (payout.payment_status === "paid" || payout.payment_status === "confirmed") {
          payoutsPaid[eventId] = (payoutsPaid[eventId] || 0) + 1;
        } else {
          payoutsPending[eventId] = (payoutsPending[eventId] || 0) + 1;
        }
      }
    });
  }

  // Add counts to events
  const eventsWithCounts: Event[] = (events || []).map((event) => ({
    ...event,
    registrations: registrationCounts[event.id] || 0,
    checkins: checkinCounts[event.id] || 0,
    payouts_pending: payoutsPending[event.id] || 0,
    payouts_paid: payoutsPaid[event.id] || 0,
  }));

  return { events: eventsWithCounts };
}

export default async function OrganizerEventsPage() {
  const { events } = await getOrganizerEvents();

  return <OrganizerEventsPageClient initialEvents={events} />;
}
