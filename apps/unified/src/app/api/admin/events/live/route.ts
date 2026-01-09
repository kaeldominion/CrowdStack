import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";


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
        console.warn("[Admin Live Events] Using localhost_user_id fallback - DEV ONLY");
        userId = localhostUser;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const serviceClient = createServiceRoleClient();
    const { data: roles } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isSuperadmin = roles?.some((r) => r.role === "superadmin");

    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch live events (currently happening)
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

    // Batch fetch all registrations for these events
    const { data: allRegs } = eventIds.length > 0
      ? await serviceClient
          .from("registrations")
          .select("event_id, checked_in")
          .in("event_id", eventIds)
      : { data: [] };

    // Build counts maps for O(1) lookups
    const regsByEvent = new Map<string, number>();
    const checkinsByEvent = new Map<string, number>();

    (allRegs || []).forEach((reg) => {
      regsByEvent.set(reg.event_id, (regsByEvent.get(reg.event_id) || 0) + 1);
      if (reg.checked_in) {
        checkinsByEvent.set(reg.event_id, (checkinsByEvent.get(reg.event_id) || 0) + 1);
      }
    });

    // Map events with stats from pre-computed maps (no additional queries)
    const eventsWithStats = (events || []).map((event) => ({
      ...event,
      registrations: regsByEvent.get(event.id) || 0,
      checkins: checkinsByEvent.get(event.id) || 0,
    }));

    return NextResponse.json({ events: eventsWithStats });
  } catch (error) {
    console.error("Error in live events API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

