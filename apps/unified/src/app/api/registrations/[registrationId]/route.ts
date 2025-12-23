import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";

/**
 * DELETE /api/registrations/[registrationId]
 * Allow organizers/venues to remove an attendee's registration from an event
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ registrationId: string }> }
) {
  try {
    const { registrationId } = await params;
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get registration with event details
    const { data: registration, error: regError } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        event_id,
        attendee_id,
        event:events(
          id,
          organizer_id,
          venue_id,
          organizer:organizers(created_by),
          venue:venues(created_by)
        )
      `)
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    const event = Array.isArray(registration.event) 
      ? registration.event[0] 
      : registration.event;

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Check user roles
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    // Check permissions
    let hasAccess = isSuperadmin;

    // Check if user is the organizer
    if (!hasAccess && roles.includes("event_organizer")) {
      const organizer = Array.isArray(event.organizer)
        ? event.organizer[0]
        : event.organizer;
      
      // Check organizer_users junction table
      const { data: organizerUser } = await serviceSupabase
        .from("organizer_users")
        .select("id")
        .eq("user_id", userId)
        .eq("organizer_id", event.organizer_id)
        .maybeSingle();

      if (organizerUser || organizer?.created_by === userId) {
        hasAccess = true;
      }
    }

    // Check if user is venue admin
    if (!hasAccess && event.venue_id && roles.includes("venue_admin")) {
      const venue = Array.isArray(event.venue)
        ? event.venue[0]
        : event.venue;

      // Check venue_users junction table
      const { data: venueUser } = await serviceSupabase
        .from("venue_users")
        .select("id")
        .eq("user_id", userId)
        .eq("venue_id", event.venue_id)
        .maybeSingle();

      if (venueUser || venue?.created_by === userId) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to remove this registration" },
        { status: 403 }
      );
    }

    // Delete the registration (this will cascade to checkins due to ON DELETE CASCADE)
    const { error: deleteError } = await serviceSupabase
      .from("registrations")
      .delete()
      .eq("id", registrationId);

    if (deleteError) {
      console.error("Error deleting registration:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing registration:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove registration" },
      { status: 500 }
    );
  }
}

