import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";

/**
 * GET /api/events/[eventId]/attendees
 * Get all attendees registered for this event (organizer access)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify organizer role or superadmin
    if (!(await userHasRoleOrSuperadmin("event_organizer"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get user roles to check if superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    // If not superadmin, verify user owns this event
    if (!isSuperadmin) {
      const { data: organizer } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", userId)
        .single();

      if (!organizer) {
        return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
      }

      const { data: event } = await serviceSupabase
        .from("events")
        .select("organizer_id")
        .eq("id", params.eventId)
        .single();

      if (!event || event.organizer_id !== organizer.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Get all registrations for this event with attendee details
    const { data: registrations, error } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        attendee_id,
        registered_at,
        promoter_id,
        attendee:attendees(
          id,
          name,
          surname,
          email,
          phone,
          gender
        ),
        promoter:promoters(
          id,
          name
        ),
        checkins(id, checked_in_at, undo_at)
      `)
      .eq("event_id", params.eventId)
      .order("registered_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Format results
    const attendees = (registrations || []).map((reg: any) => {
      const checkin = reg.checkins && reg.checkins.length > 0 ? reg.checkins[0] : null;
      const isCheckedIn = checkin && !checkin.undo_at;
      
      return {
        registration_id: reg.id,
        attendee_id: reg.attendee_id,
        name: reg.attendee?.name || "Unknown",
        surname: reg.attendee?.surname || null,
        email: reg.attendee?.email || null,
        phone: reg.attendee?.phone || null,
        gender: reg.attendee?.gender || null,
        registered_at: reg.registered_at,
        promoter_name: reg.promoter?.name || null,
        is_checked_in: isCheckedIn,
        checked_in_at: isCheckedIn ? checkin.checked_in_at : null,
      };
    });

    return NextResponse.json({ attendees });
  } catch (error: any) {
    console.error("[EventAttendees] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendees" },
      { status: 500 }
    );
  }
}

