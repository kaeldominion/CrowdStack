import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check door_staff role
    if (!(await userHasRole("door_staff"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all published events (door staff can access any published event)
    // In the future, you might want to restrict this to events assigned to specific door staff
    const { data: events } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        start_time,
        end_time,
        capacity,
        status,
        venue:venues(name)
      `)
      .eq("status", "published")
      .gte("start_time", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Events from last 24 hours onwards
      .order("start_time", { ascending: true })
      .limit(50);

    // Get current attendance for each event
    const eventsWithStats = await Promise.all(
      (events || []).map(async (event: any) => {
        // Get registrations for this event
        const { data: registrations } = await serviceSupabase
          .from("registrations")
          .select("id")
          .eq("event_id", event.id);

        const regIds = registrations?.map((r) => r.id) || [];
        let currentAttendance = 0;

        if (regIds.length > 0) {
          const { count } = await serviceSupabase
            .from("checkins")
            .select("*", { count: "exact", head: true })
            .in("registration_id", regIds)
            .is("undo_at", null);
          currentAttendance = count || 0;
        }

        return {
          ...event,
          current_attendance: currentAttendance,
        };
      })
    );

    return NextResponse.json({ events: eventsWithStats });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

