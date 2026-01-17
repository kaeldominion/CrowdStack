import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";
import { getUserVenueId } from "@/lib/data/get-user-entity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // SECURITY: Only allow localhost fallback in non-production environments
    let userId = user?.id;
    if (!userId && process.env.NODE_ENV !== "production") {
      const localhostUser = cookieStore.get("localhost_user_id")?.value;
      if (localhostUser) {
        console.warn("[Venue Live Events] Using localhost_user_id fallback - DEV ONLY");
        userId = localhostUser;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = createServiceRoleClient();

    // Get the selected venue from cookie (consistent with other venue APIs)
    const selectedVenueId = await getUserVenueId();

    if (!selectedVenueId) {
      return NextResponse.json({ events: [] });
    }

    // Use only the selected venue
    const venueIds = [selectedVenueId];

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
        max_guestlist_size,
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

    // BATCH QUERY OPTIMIZATION: Get registration and check-in counts in bulk
    const eventIds = (events || []).map((e) => e.id);

    // Fetch registrations with their checkins nested (avoids URL length issues with large .in() queries)
    const { data: regsWithCheckins } = eventIds.length > 0
      ? await serviceClient
          .from("registrations")
          .select(`
            id,
            event_id,
            checkins(id, undo_at)
          `)
          .in("event_id", eventIds)
      : { data: [] };

    // Build registration and checkin count maps from the nested data
    const regsByEvent = new Map<string, number>();
    const checkinsByEvent = new Map<string, number>();

    (regsWithCheckins || []).forEach((reg: any) => {
      // Count registration
      regsByEvent.set(reg.event_id, (regsByEvent.get(reg.event_id) || 0) + 1);

      // Count active checkins (where undo_at is null)
      const activeCheckins = (reg.checkins || []).filter((c: any) => c.undo_at === null);
      if (activeCheckins.length > 0) {
        checkinsByEvent.set(reg.event_id, (checkinsByEvent.get(reg.event_id) || 0) + activeCheckins.length);
      }
    });

    const eventsWithStats = (events || []).map((event) => ({
      ...event,
      registrations: regsByEvent.get(event.id) || 0,
      checkins: checkinsByEvent.get(event.id) || 0,
    }));

    return NextResponse.json({ events: eventsWithStats });
  } catch (error) {
    console.error("Error in venue live events API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

