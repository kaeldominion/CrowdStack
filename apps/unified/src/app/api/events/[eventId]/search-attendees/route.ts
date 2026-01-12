import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";

/**
 * GET /api/events/[eventId]/search-attendees
 * Search for attendees registered for this event (door staff only)
 * Query params: ?q=search_term
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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

    // Search attendees registered for this event (without embedded checkins join)
    const { data: registrations, error } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        attendee_id,
        registered_at,
        attendee:attendees(
          id,
          name,
          surname,
          email,
          phone
        )
      `)
      .eq("event_id", params.eventId)
      .or(`attendee.name.ilike.%${query}%,attendee.surname.ilike.%${query}%,attendee.email.ilike.%${query}%,attendee.phone.ilike.%${query}%`)
      .limit(20);

    if (error) {
      throw error;
    }

    // Get check-ins directly from checkins table (more reliable than embedded join)
    const registrationIds = registrations?.map((r) => r.id) || [];
    const { data: checkins } = await serviceSupabase
      .from("checkins")
      .select("id, registration_id, checked_in_at, undo_at")
      .in("registration_id", registrationIds.length > 0 ? registrationIds : ["none"]);

    // Build a map of registration_id -> checkin
    const checkinMap = new Map<string, { id: string; checked_in_at: string; undo_at: string | null }>();
    for (const c of checkins || []) {
      // Only store if not undone (or keep latest)
      if (!checkinMap.has(c.registration_id) || !c.undo_at) {
        checkinMap.set(c.registration_id, c);
      }
    }

    // Format results
    const attendees = (registrations || []).map((reg: any) => {
      const checkin = checkinMap.get(reg.id);
      const isCheckedIn = checkin && !checkin.undo_at;
      return {
        registration_id: reg.id,
        attendee_id: reg.attendee_id,
        name: (() => {
          const attendee = reg.attendee;
          if (!attendee) return "Unknown";
          return attendee.surname 
            ? `${attendee.name || ""} ${attendee.surname}`.trim() 
            : attendee.name || "Unknown";
        })(),
        email: reg.attendee?.email || null,
        phone: reg.attendee?.phone || null,
        registered_at: reg.registered_at,
        is_checked_in: !!isCheckedIn,
        checkin_id: checkin?.id || null,
      };
    });

    return NextResponse.json({ attendees });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to search attendees" },
      { status: 500 }
    );
  }
}

