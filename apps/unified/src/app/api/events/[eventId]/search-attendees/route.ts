import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";

/**
 * GET /api/events/[eventId]/search-attendees
 * Search for attendees registered for this event (door staff only)
 * Query params: ?q=search_term
 */
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

    // Verify door_staff role
    if (!(await userHasRole("door_staff"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ attendees: [] });
    }

    const serviceSupabase = createServiceRoleClient();

    // Search attendees registered for this event
    const { data: registrations, error } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        attendee_id,
        registered_at,
        attendee:attendees(
          id,
          name,
          email,
          phone
        ),
        checkins(id, checked_in_at, undo_at)
      `)
      .eq("event_id", params.eventId)
      .or(`attendee.name.ilike.%${query}%,attendee.email.ilike.%${query}%,attendee.phone.ilike.%${query}%`)
      .limit(20);

    if (error) {
      throw error;
    }

    // Format results
    const attendees = (registrations || []).map((reg: any) => ({
      registration_id: reg.id,
      attendee_id: reg.attendee_id,
      name: reg.attendee?.name || "Unknown",
      email: reg.attendee?.email || null,
      phone: reg.attendee?.phone || null,
      registered_at: reg.registered_at,
      is_checked_in: reg.checkins && reg.checkins.length > 0 && !reg.checkins[0].undo_at,
      checkin_id: reg.checkins && reg.checkins.length > 0 ? reg.checkins[0].id : null,
    }));

    return NextResponse.json({ attendees });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to search attendees" },
      { status: 500 }
    );
  }
}

