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
  const { eventId } = params;
  console.log("[EventAttendees] GET request for event:", eventId);
  
  try {
    const userId = await getUserId();
    console.log("[EventAttendees] User ID:", userId);
    
    if (!userId) {
      console.log("[EventAttendees] No user ID - unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify organizer role or superadmin
    const hasRole = await userHasRoleOrSuperadmin("event_organizer");
    console.log("[EventAttendees] Has organizer role or superadmin:", hasRole);
    
    if (!hasRole) {
      console.log("[EventAttendees] User lacks required role - forbidden");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log("[EventAttendees] Creating service role client...");
    const serviceSupabase = createServiceRoleClient();
    console.log("[EventAttendees] Service client created");

    // Get user roles to check if superadmin
    console.log("[EventAttendees] Fetching user roles...");
    const { data: userRoles, error: rolesError } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    if (rolesError) {
      console.error("[EventAttendees] Error fetching roles:", rolesError);
    }
    
    const roles = userRoles?.map((r) => r.role) || [];
    console.log("[EventAttendees] User roles:", roles);
    const isSuperadmin = roles.includes("superadmin");

    // If not superadmin, verify user owns this event
    if (!isSuperadmin) {
      console.log("[EventAttendees] User is not superadmin, checking event ownership...");
      const { data: organizer, error: orgError } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", userId)
        .single();

      if (orgError) {
        console.error("[EventAttendees] Error fetching organizer:", orgError);
      }

      if (!organizer) {
        console.log("[EventAttendees] Organizer not found for user");
        return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
      }

      console.log("[EventAttendees] Found organizer:", organizer.id);
      const { data: event, error: eventError } = await serviceSupabase
        .from("events")
        .select("organizer_id")
        .eq("id", eventId)
        .single();

      if (eventError) {
        console.error("[EventAttendees] Error fetching event:", eventError);
      }

      if (!event || event.organizer_id !== organizer.id) {
        console.log("[EventAttendees] Event not owned by this organizer");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      console.log("[EventAttendees] Event ownership verified");
    } else {
      console.log("[EventAttendees] User is superadmin, skipping ownership check");
    }

    // Get all registrations for this event with attendee details
    console.log("[EventAttendees] Fetching registrations for event:", eventId);
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
          phone,
          gender
        ),
        checkins(id, checked_in_at, undo_at)
      `)
      .eq("event_id", eventId)
      .order("registered_at", { ascending: false });

    if (error) {
      console.error("[EventAttendees] Query error:", error);
      throw error;
    }
    
    console.log("[EventAttendees] Found", registrations?.length || 0, "registrations");

    // Format results - match expected interface in EventDetailPage
    const attendees = (registrations || []).map((reg: any) => {
      const checkin = reg.checkins && reg.checkins.length > 0 ? reg.checkins[0] : null;
      const isCheckedIn = checkin && !checkin.undo_at;
      
      return {
        id: reg.id, // registration id as unique identifier
        attendee_id: reg.attendee_id,
        name: `${reg.attendee?.name || "Unknown"}${reg.attendee?.surname ? ` ${reg.attendee.surname}` : ""}`,
        email: reg.attendee?.email || null,
        phone: reg.attendee?.phone || null,
        gender: reg.attendee?.gender || null,
        registration_date: reg.registered_at,
        checked_in: isCheckedIn,
        check_in_time: isCheckedIn ? checkin.checked_in_at : null,
        promoter_name: null, // promoter tracking not yet implemented
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

