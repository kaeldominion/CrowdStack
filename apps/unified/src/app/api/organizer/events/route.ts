import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organizer ID for current user
    const organizerId = await getUserOrganizerId();
    console.log("[OrganizerEvents] User ID:", user.id, "Organizer ID:", organizerId);

    if (!organizerId) {
      console.log("[OrganizerEvents] No organizer found for user");
      return NextResponse.json({ error: "No organizer found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();

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
        max_guestlist_size,
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
      throw error;
    }

    console.log("[OrganizerEvents] Found", events?.length || 0, "events for organizer", organizerId);
    if (events && events.length > 0) {
      console.log("[OrganizerEvents] Event names:", events.map(e => e.name).join(", "));
    }

    // BATCH QUERY OPTIMIZATION: Get all counts in bulk instead of per-event
    const eventIds = (events || []).map((e) => e.id);
    console.log("[OrganizerEvents] Event IDs for registration lookup:", eventIds.length);

    // 1. Batch fetch all registrations for these events
    const { data: allRegs, error: regsError } = eventIds.length > 0
      ? await serviceSupabase
          .from("registrations")
          .select("id, event_id")
          .in("event_id", eventIds)
      : { data: [], error: null };

    if (regsError) {
      console.error("[OrganizerEvents] Registration query error:", regsError);
    } else {
      console.log("[OrganizerEvents] Found", allRegs?.length || 0, "registrations across all events");
    }

    // Build registration count map and ID-to-event mapping
    const regsByEvent = new Map<string, number>();
    const registrationIdToEventId = new Map<string, string>();

    (allRegs || []).forEach((reg) => {
      regsByEvent.set(reg.event_id, (regsByEvent.get(reg.event_id) || 0) + 1);
      registrationIdToEventId.set(reg.id, reg.event_id);
    });

    // 2. Batch fetch check-ins by registration IDs (more reliable than filtering on joined column)
    const checkinsByEvent = new Map<string, number>();
    const regIds = (allRegs || []).map(r => r.id);

    if (regIds.length > 0) {
      const { data: allCheckins, error: checkinsError } = await serviceSupabase
        .from("checkins")
        .select("id, registration_id")
        .in("registration_id", regIds)
        .is("undo_at", null);

      console.log("[OrganizerEvents] Checkins query returned:", allCheckins?.length || 0, "rows, error:", checkinsError?.message || "none");

      if (checkinsError) {
        console.error("[OrganizerEvents] Checkins query error:", checkinsError);
      } else {
        (allCheckins || []).forEach((checkin: any) => {
          const eventId = registrationIdToEventId.get(checkin.registration_id);
          if (eventId) {
            checkinsByEvent.set(eventId, (checkinsByEvent.get(eventId) || 0) + 1);
          }
        });
      }
    }

    // Log final counts for debugging
    console.log("[OrganizerEvents] Registration counts by event:", Object.fromEntries(regsByEvent));
    console.log("[OrganizerEvents] Check-in counts by event:", Object.fromEntries(checkinsByEvent));

    // Get payout data for all events (for closed events status display)
    const { data: payoutLines } = eventIds.length > 0
      ? await serviceSupabase
          .from("payout_lines")
          .select("payout_runs(event_id), payment_status")
          .in("payout_runs.event_id", eventIds)
      : { data: [] };

    // Build payout counts per event
    const payoutsPendingByEvent = new Map<string, number>();
    const payoutsPaidByEvent = new Map<string, number>();

    (payoutLines || []).forEach((line: any) => {
      const eventId = line.payout_runs?.event_id;
      if (!eventId) return;

      if (line.payment_status === "paid" || line.payment_status === "confirmed") {
        payoutsPaidByEvent.set(eventId, (payoutsPaidByEvent.get(eventId) || 0) + 1);
      } else {
        payoutsPendingByEvent.set(eventId, (payoutsPendingByEvent.get(eventId) || 0) + 1);
      }
    });

    // Map events with stats from pre-computed maps (no additional queries)
    // Also normalize Supabase array relations
    const eventsWithCounts = (events || []).map((event) => {
      const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
      const organizer = Array.isArray(event.organizer) ? event.organizer[0] : event.organizer;

      return {
        ...event,
        venue,
        organizer,
        registrations: regsByEvent.get(event.id) || 0,
        checkins: checkinsByEvent.get(event.id) || 0,
        payouts_pending: payoutsPendingByEvent.get(event.id) || 0,
        payouts_paid: payoutsPaidByEvent.get(event.id) || 0,
      };
    });

    return NextResponse.json({ events: eventsWithCounts }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error: any) {
    console.error("Error fetching organizer events:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

