import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

/**
 * GET /api/venue/events/[eventId]/feedback/test-attendees
 * Get checked-in attendees eligible for feedback (have email and user_id)
 * Venue admins only
 */
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has venue_admin role or is superadmin
    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();

    if (!venueId) {
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify event belongs to venue
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id, venue_id")
      .eq("id", params.eventId)
      .eq("venue_id", venueId)
      .single();

    if (!event) {
      return NextResponse.json(
        { error: "Event not found or no access" },
        { status: 404 }
      );
    }

    // Get checked-in attendees with email and user_id
    const { data: registrations, error } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        attendee_id,
        attendees!inner(
          id,
          name,
          email,
          user_id
        )
      `)
      .eq("event_id", params.eventId);

    if (error) {
      console.error("[Test Attendees] Error:", error);
      return NextResponse.json(
        { error: "Failed to load attendees" },
        { status: 500 }
      );
    }

    // Get check-ins
    const registrationIds = registrations?.map((r) => r.id) || [];
    const { data: checkins } = await serviceSupabase
      .from("checkins")
      .select("registration_id")
      .in("registration_id", registrationIds)
      .is("undo_at", null);

    const checkedInRegistrationIds = new Set(
      checkins?.map((c) => c.registration_id) || []
    );

    // Filter to only checked-in attendees with email and user_id
    const eligibleAttendees = (registrations || [])
      .filter((reg) => {
        const attendee = Array.isArray(reg.attendees)
          ? reg.attendees[0]
          : reg.attendees;
        return (
          checkedInRegistrationIds.has(reg.id) &&
          attendee?.email &&
          attendee?.user_id
        );
      })
      .map((reg) => {
        const attendee = Array.isArray(reg.attendees)
          ? reg.attendees[0]
          : reg.attendees;
        return {
          registration_id: reg.id,
          attendee_id: reg.attendee_id,
          name: attendee?.name || "Unknown",
          email: attendee?.email || null,
          checked_in: true,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      attendees: eligibleAttendees,
    });
  } catch (error: any) {
    console.error("[Test Attendees API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
