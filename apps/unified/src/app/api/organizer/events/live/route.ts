import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organizer ID (handles impersonation for superadmin)
    const organizerId = await getUserOrganizerId();

    if (!organizerId) {
      return NextResponse.json({ events: [] });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch live events (currently happening) by this organizer
    const now = new Date().toISOString();
    const { data: events, error } = await serviceClient
      .from("events")
      .select(`
        id,
        name,
        slug,
        start_time,
        end_time,
        status,
        capacity,
        venue:venues (
          id,
          name
        ),
        organizer:organizers (
          id,
          name
        )
      `)
      .eq("organizer_id", organizerId)
      .eq("status", "published")
      .lte("start_time", now)
      .or(`end_time.is.null,end_time.gte.${now}`)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching live events:", error);
      return NextResponse.json(
        { error: "Failed to fetch live events" },
        { status: 500 }
      );
    }

    // Get registration and check-in counts for each event
    const eventsWithStats = await Promise.all(
      (events || []).map(async (event) => {
        const { count: registrations } = await serviceClient
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id);

        const { count: checkins } = await serviceClient
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id)
          .eq("checked_in", true);

        return {
          ...event,
          registrations: registrations || 0,
          checkins: checkins || 0,
        };
      })
    );

    return NextResponse.json({ events: eventsWithStats });
  } catch (error) {
    console.error("Error in organizer live events API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

