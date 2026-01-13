import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get venue ID for current user
    const venueId = await getUserVenueId();

    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // filter by approval status
    const eventStatus = searchParams.get("event_status"); // filter by event status (draft, published, etc.)

    const serviceSupabase = createServiceRoleClient();

    // Build query
    let query = serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        description,
        start_time,
        end_time,
        capacity,
        status,
        venue_approval_status,
        venue_approval_at,
        venue_rejection_reason,
        cover_image_url,
        flier_url,
        owner_user_id,
        closed_at,
        created_at,
        organizer:organizers(id, name, email)
      `)
      .eq("venue_id", venueId)
      .order("start_time", { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq("venue_approval_status", status);
    }
    if (eventStatus) {
      query = query.eq("status", eventStatus);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error("Error fetching venue events:", error);
      throw error;
    }

    if (!events || events.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // BATCH QUERY OPTIMIZATION: Fetch all counts in bulk instead of N+1 queries
    const eventIds = events.map((e) => e.id);

    // 1. Batch fetch all registrations for these events
    const { data: allRegistrations } = await serviceSupabase
      .from("registrations")
      .select("event_id")
      .in("event_id", eventIds);

    // Build count map
    const registrationsByEvent = new Map<string, number>();
    (allRegistrations || []).forEach((reg) => {
      const current = registrationsByEvent.get(reg.event_id) || 0;
      registrationsByEvent.set(reg.event_id, current + 1);
    });

    // 2. Batch fetch all checkins for these events (via registration join)
    const { data: allCheckins } = await serviceSupabase
      .from("checkins")
      .select("registration_id, registrations!inner(event_id)")
      .in("registrations.event_id", eventIds)
      .is("undo_at", null);

    // Build count map
    const checkinsByEvent = new Map<string, number>();
    (allCheckins || []).forEach((checkin: any) => {
      const eventId = checkin.registrations?.event_id;
      if (eventId) {
        const current = checkinsByEvent.get(eventId) || 0;
        checkinsByEvent.set(eventId, current + 1);
      }
    });

    // 3. Batch fetch payout information for owned events
    const payoutsPending: Record<string, number> = {};
    const payoutsPaid: Record<string, number> = {};
    
    // Only fetch payouts for events that have an owner_user_id
    const ownedEventIds = events.filter(e => e.owner_user_id).map(e => e.id);
    if (ownedEventIds.length > 0) {
      const { data: payoutsResult } = await serviceSupabase
        .from("payout_lines")
        .select(`
          payment_status,
          payout_runs!inner(event_id)
        `)
        .in("payout_runs.event_id", ownedEventIds);

      // Count payouts per event by status
      (payoutsResult || []).forEach((payout: any) => {
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

    // 4. Batch fetch table bookings count
    const { data: allTableBookings } = await serviceSupabase
      .from("table_bookings")
      .select("event_id")
      .in("event_id", eventIds);

    const tableBookingsByEvent = new Map<string, number>();
    (allTableBookings || []).forEach((booking) => {
      const current = tableBookingsByEvent.get(booking.event_id) || 0;
      tableBookingsByEvent.set(booking.event_id, current + 1);
    });

    // 5. Batch fetch feedback count
    const { data: allFeedback } = await serviceSupabase
      .from("event_feedback")
      .select("event_id")
      .in("event_id", eventIds);

    const feedbackByEvent = new Map<string, number>();
    (allFeedback || []).forEach((feedback) => {
      const current = feedbackByEvent.get(feedback.event_id) || 0;
      feedbackByEvent.set(feedback.event_id, current + 1);
    });

    // 6. Build final response
    const eventsWithCounts = events.map((event) => ({
      ...event,
      registrations: registrationsByEvent.get(event.id) || 0,
      checkins: checkinsByEvent.get(event.id) || 0,
      payouts_pending: payoutsPending[event.id] || 0,
      payouts_paid: payoutsPaid[event.id] || 0,
      table_bookings: tableBookingsByEvent.get(event.id) || 0,
      feedback_count: feedbackByEvent.get(event.id) || 0,
    }));

    return NextResponse.json({ events: eventsWithCounts });
  } catch (error: any) {
    console.error("Error fetching venue events:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

