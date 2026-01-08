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

    // Get registration and checkin counts for each event
    const eventsWithCounts = await Promise.all(
      (events || []).map(async (event) => {
        const { count: registrations } = await serviceSupabase
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id);

        const { count: checkins } = await serviceSupabase
          .from("checkins")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id);

        return {
          ...event,
          registrations: registrations || 0,
          checkins: checkins || 0,
        };
      })
    );

    return NextResponse.json({ events: eventsWithCounts });
  } catch (error: any) {
    console.error("Error fetching venue events:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

