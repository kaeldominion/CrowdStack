import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/events/[eventId]/edit-history
 * Get edit history for an event (organizer, venue admin, or superadmin access)
 */
export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get the event to check access
    const { data: event } = await serviceSupabase
      .from("events")
      .select("venue_id, organizer_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check user access (venue admin, organizer, or superadmin)
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin");

    // Check if user is venue admin
    let hasVenueAccess = false;
    if (event.venue_id) {
      const { data: venueUser } = await serviceSupabase
        .from("venue_users")
        .select("id")
        .eq("venue_id", event.venue_id)
        .eq("user_id", user.id)
        .single();
      hasVenueAccess = !!venueUser;
    }

    // Check if user is organizer
    const { data: organizerUser } = await serviceSupabase
      .from("organizer_users")
      .select("id")
      .eq("organizer_id", event.organizer_id)
      .eq("user_id", user.id)
      .single();

    // Also check if user is the organizer creator
    const { data: organizerCreator } = await serviceSupabase
      .from("organizers")
      .select("id")
      .eq("id", event.organizer_id)
      .eq("created_by", user.id)
      .single();

    if (!isSuperadmin && !hasVenueAccess && !organizerUser && !organizerCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get edit history
    const { data: edits, error } = await serviceSupabase
      .from("event_edits")
      .select(`
        id,
        edited_by,
        editor_role,
        changes,
        reason,
        created_at
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    // Get editor names
    const editorIds = [...new Set((edits || []).map((e) => e.edited_by))];
    const { data: users } = await serviceSupabase.auth.admin.listUsers();
    
    const userMap = new Map(
      users?.users?.map((u) => [u.id, u.email || "Unknown"]) || []
    );

    const history = (edits || []).map((edit) => ({
      ...edit,
      editor_email: userMap.get(edit.edited_by) || "Unknown",
    }));

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error("Error fetching edit history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch edit history" },
      { status: 500 }
    );
  }
}

