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

    // Get total events count
    const { count: totalEvents } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("venue_id", venueId);

    // Get upcoming events count
    const { count: upcomingEvents } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("venue_id", venueId)
      .gte("start_time", new Date().toISOString());

    // Get total unique attendees for this venue's events
    const { data: eventIds } = await supabase
      .from("events")
      .select("id")
      .eq("venue_id", venueId);

    let totalAttendees = 0;
    if (eventIds && eventIds.length > 0) {
      const ids = eventIds.map((e: { id: string }) => e.id);
      const { count } = await supabase
        .from("registrations")
        .select("attendee_id", { count: "exact", head: true })
        .in("event_id", ids);
      totalAttendees = count || 0;
    }

    // Get team members count
    const { count: teamMembers } = await supabase
      .from("venue_users")
      .select("*", { count: "exact", head: true })
      .eq("venue_id", venueId);

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

