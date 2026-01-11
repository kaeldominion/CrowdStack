import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { sendNotifications, getOrganizerUserIds } from "@crowdstack/shared/notifications/send";

// Editable fields by venue admin
const VENUE_EDITABLE_FIELDS = [
  "name",
  "description",
  "start_time",
  "end_time",
  "capacity",
  "status",
  "show_photo_email_notice",
  "flier_url",
  "cover_image_url",
  "timezone",
];


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function PUT(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;
    const body = await request.json();
    const { updates, reason } = body;

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Updates object is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get the event
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("*, venue:venues(id, name), organizer:organizers(id, name)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (!event.venue_id) {
      return NextResponse.json(
        { error: "Event has no venue" },
        { status: 400 }
      );
    }

    // Verify user has access to this venue
    const venueId = await getUserVenueId();
    
    const { data: venueUser } = await serviceSupabase
      .from("venue_users")
      .select("id")
      .eq("venue_id", event.venue_id)
      .eq("user_id", user.id)
      .single();

    const { data: venueCreator } = await serviceSupabase
      .from("venues")
      .select("created_by")
      .eq("id", event.venue_id)
      .single();

    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin");

    const hasVenueAccess = 
      venueId === event.venue_id || 
      venueUser || 
      venueCreator?.created_by === user.id ||
      isSuperadmin;

    if (!hasVenueAccess) {
      return NextResponse.json(
        { error: "You don't have permission to edit events at this venue" },
        { status: 403 }
      );
    }

    // Filter to only allowed editable fields
    const filteredUpdates: Record<string, any> = {};
    const changes: Record<string, { old: any; new: any }> = {};

    for (const [field, newValue] of Object.entries(updates)) {
      if (VENUE_EDITABLE_FIELDS.includes(field)) {
        const oldValue = event[field];
        if (oldValue !== newValue) {
          filteredUpdates[field] = newValue;
          changes[field] = { old: oldValue, new: newValue };
        }
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: "No valid changes to apply" }, { status: 400 });
    }

    // Update the event
    const { data: updatedEvent, error: updateError } = await serviceSupabase
      .from("events")
      .update(filteredUpdates)
      .eq("id", eventId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log the edit
    await serviceSupabase.from("event_edits").insert({
      event_id: eventId,
      edited_by: user.id,
      editor_role: isSuperadmin ? "superadmin" : "venue_admin",
      editor_entity_id: event.venue_id,
      changes,
      reason: reason || null,
    });

    // Notify the organizer about the edit (only if event has an organizer with users)
    if (event.organizer?.id) {
      try {
        const organizerUserIds = await getOrganizerUserIds(event.organizer.id);
        if (organizerUserIds.length > 0) {
          const changedFields = Object.keys(changes).join(", ");

          await sendNotifications(
            organizerUserIds.map((userId) => ({
              user_id: userId,
              type: "event_edited_by_venue",
              title: "Event Updated by Venue",
              message: `${event.venue?.name || "Venue"} made changes to "${event.name}": ${changedFields}${reason ? `. Reason: ${reason}` : ""}`,
              link: `/app/organizer/events/${eventId}`,
              metadata: { event_id: eventId, changes, reason },
            }))
          );
        }
      } catch (notifyError) {
        console.error("Failed to notify organizer of edit:", notifyError);
      }
    }

    return NextResponse.json({ event: updatedEvent, changes });
  } catch (error: any) {
    console.error("Error editing event:", error);
    return NextResponse.json(
      { error: error.message || "Failed to edit event" },
      { status: 500 }
    );
  }
}

// GET - Get edit history for an event
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

    const { data: venueUser } = await serviceSupabase
      .from("venue_users")
      .select("id")
      .eq("venue_id", event.venue_id)
      .eq("user_id", user.id)
      .single();

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

    if (!isSuperadmin && !venueUser && !organizerUser && !organizerCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get edit history with editor info
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

    const editsWithEditorInfo = (edits || []).map((edit) => ({
      ...edit,
      editor_email: userMap.get(edit.edited_by) || "Unknown",
    }));

    return NextResponse.json({ edits: editsWithEditorInfo });
  } catch (error: any) {
    console.error("Error fetching edit history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch edit history" },
      { status: 500 }
    );
  }
}

