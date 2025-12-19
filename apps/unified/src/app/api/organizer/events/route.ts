import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organizer ID (handles impersonation for superadmin)
    const organizerId = await getUserOrganizerId();

    if (!organizerId) {
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
        venue_approval_status,
        venue_rejection_reason,
        capacity,
        cover_image_url,
        created_at,
        venue:venues(id, name)
      `)
      .eq("organizer_id", organizerId)
      .order("start_time", { ascending: false });

    if (error) {
      throw error;
    }

    // Get registration counts for each event
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
    console.error("Error fetching organizer events:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

