import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { venueId: string } }
) {
  try {
    const supabase = createServiceRoleClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperadmin = roles?.some((r: { role: string }) => r.role === "superadmin");
    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { venueId } = await params;
    const now = new Date().toISOString();

    // PARALLEL QUERY OPTIMIZATION: Run independent queries concurrently
    const [eventsResult, teamMembersResult] = await Promise.all([
      // Get all events with start_time to compute both total and upcoming
      supabase
        .from("events")
        .select("id, start_time")
        .eq("venue_id", venueId),
      // Get team members count
      supabase
        .from("venue_users")
        .select("*", { count: "exact", head: true })
        .eq("venue_id", venueId),
    ]);

    const events = eventsResult.data || [];
    const eventIds = events.map((e) => e.id);
    const totalEvents = events.length;
    const upcomingEvents = events.filter((e) => e.start_time >= now).length;
    const teamMembers = teamMembersResult.count || 0;

    // Get attendees count only if there are events
    let totalAttendees = 0;
    if (eventIds.length > 0) {
      const { count } = await supabase
        .from("registrations")
        .select("attendee_id", { count: "exact", head: true })
        .in("event_id", eventIds);
      totalAttendees = count || 0;
    }

    return NextResponse.json({
      totalEvents: totalEvents || 0,
      upcomingEvents: upcomingEvents || 0,
      totalAttendees,
      teamMembers: teamMembers || 0,
    });
  } catch (error) {
    console.error("Error fetching venue stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

