import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();

    // Check for localhost development mode
    const localhostUser = cookieStore.get("localhost_user_id")?.value;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || localhostUser;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Get venues this user manages
    const { data: venueUsers } = await serviceClient
      .from("venue_users")
      .select("venue_id")
      .eq("user_id", userId);

    const { data: ownedVenues } = await serviceClient
      .from("venues")
      .select("id")
      .eq("created_by", userId);

    const venueIds = [
      ...(venueUsers?.map((v) => v.venue_id) || []),
      ...(ownedVenues?.map((v) => v.id) || []),
    ].filter((id, index, self) => self.indexOf(id) === index);

    if (venueIds.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // Fetch live events (currently happening) at these venues
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
      .in("venue_id", venueIds)
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
    console.error("Error in venue live events API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

