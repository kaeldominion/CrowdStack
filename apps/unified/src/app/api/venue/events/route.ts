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

    // 3. Build final response
    const eventsWithCounts = events.map((event) => ({
      ...event,
      registrations: registrationsByEvent.get(event.id) || 0,
      checkins: checkinsByEvent.get(event.id) || 0,
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

