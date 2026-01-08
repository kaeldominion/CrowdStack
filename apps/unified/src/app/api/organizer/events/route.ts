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
      throw error;
    }

    console.log("[OrganizerEvents] Found", events?.length || 0, "events for organizer", organizerId);
    if (events && events.length > 0) {
      console.log("[OrganizerEvents] Event names:", events.map(e => e.name).join(", "));
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

