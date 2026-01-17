import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organizer ID for current user
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

      // Count active checkin (checkins is an array due to one-to-many relation syntax, but max 1 due to unique constraint)
      const checkins = Array.isArray(reg.checkins) ? reg.checkins : (reg.checkins ? [reg.checkins] : []);
      const hasActiveCheckin = checkins.some((c: any) => c.undo_at === null);
      if (hasActiveCheckin) {
        checkinsByEvent.set(reg.event_id, (checkinsByEvent.get(reg.event_id) || 0) + 1);
      }
    });

    const eventsWithStats = (events || []).map((event) => ({
      ...event,
      registrations: regsByEvent.get(event.id) || 0,
      checkins: checkinsByEvent.get(event.id) || 0,
    }));

    return NextResponse.json({ events: eventsWithStats });
  } catch (error) {
    console.error("Error in organizer live events API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

