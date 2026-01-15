import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all events for this venue
    const { data: venueEvents } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("venue_id", venueId);

    const eventIds = venueEvents?.map((e) => e.id) || [];

    if (eventIds.length === 0) {
      return NextResponse.json({
        totalAttendees: 0,
        totalCheckins: 0,
        newThisMonth: 0,
        repeatVisitors: 0,
        flaggedCount: 0,
        topAttendees: [],
      });
    }

    // Get all registrations for these events
    const { data: registrations } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        attendee_id,
        event_id,
        registered_at
      `)
      .in("event_id", eventIds);

    const attendeeIds = Array.from(new Set(registrations?.map((r) => r.attendee_id) || []));
    const totalAttendees = attendeeIds.length;

    // Get checkins using JOIN (consistent pattern across all routes)
    let totalCheckins = 0;
    const checkinsByRegistration = new Map<string, number>();

    if (eventIds.length > 0) {
      const { data: checkins } = await serviceSupabase
        .from("checkins")
        .select(`
          id,
          registration_id,
          registrations!inner(event_id)
        `)
        .in("registrations.event_id", eventIds)
        .is("undo_at", null);

      totalCheckins = checkins?.length || 0;
      checkins?.forEach((c: any) => {
        checkinsByRegistration.set(c.registration_id, (checkinsByRegistration.get(c.registration_id) || 0) + 1);
      });
    }

    // New attendees this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: newThisMonth } = await serviceSupabase
      .from("registrations")
      .select("attendee_id", { count: "exact", head: true })
      .in("event_id", eventIds)
      .gte("registered_at", startOfMonth.toISOString());

    // Count repeat visitors (attended more than one event)
    const attendeeCounts = new Map<string, number>();
    registrations?.forEach((r) => {
      attendeeCounts.set(r.attendee_id, (attendeeCounts.get(r.attendee_id) || 0) + 1);
    });
    const repeatVisitors = Array.from(attendeeCounts.values()).filter((count) => count > 1).length;

    // Get flagged attendees count
    const { count: flaggedCount } = await serviceSupabase
      .from("guest_flags")
      .select("id", { count: "exact", head: true })
      .eq("venue_id", venueId)
      .gt("strike_count", 0);

    // Get top 5 attendees by check-in count
    const attendeeCheckins = new Map<string, number>();
    registrations?.forEach((r) => {
      const regCheckins = checkinsByRegistration.get(r.id) || 0;
      attendeeCheckins.set(r.attendee_id, (attendeeCheckins.get(r.attendee_id) || 0) + regCheckins);
    });

    const topAttendeeIds = Array.from(attendeeCheckins.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    console.log("[Venue Attendee Stats] topAttendeeIds:", topAttendeeIds);

    let topAttendees: Array<{ id: string; name: string; checkins: number; events: number; xp_points: number }> = [];

    if (topAttendeeIds.length > 0) {
      const { data: attendeesData, error: attendeesError } = await serviceSupabase
        .from("attendees")
        .select("id, name, surname, xp_points")
        .in("id", topAttendeeIds);

      console.log("[Venue Attendee Stats] attendeesData:", attendeesData?.length, "rows, error:", attendeesError?.message || "none");
      if (attendeesData) {
        console.log("[Venue Attendee Stats] Sample attendee:", JSON.stringify(attendeesData[0]));
      }

      topAttendees = topAttendeeIds.map((id) => {
        const attendee = attendeesData?.find((a) => a.id === id);
        // Combine first and last name
        const fullName = attendee
          ? (attendee.surname ? `${attendee.name || ""} ${attendee.surname}`.trim() : attendee.name || "Unknown")
          : "Unknown";
        console.log("[Venue Attendee Stats] Mapping attendee:", id, "found:", !!attendee, "name:", fullName);
        return {
          id,
          name: fullName,
          checkins: attendeeCheckins.get(id) || 0,
          events: attendeeCounts.get(id) || 0,
          xp_points: attendee?.xp_points || 0,
        };
      });
    }

    return NextResponse.json({
      totalAttendees,
      totalCheckins,
      newThisMonth: newThisMonth || 0,
      repeatVisitors,
      flaggedCount: flaggedCount || 0,
      topAttendees,
    });
  } catch (error: any) {
    console.error("[Venue Attendee Stats] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendee stats" },
      { status: 500 }
    );
  }
}

