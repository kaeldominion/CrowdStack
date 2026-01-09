import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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

    // Get the event
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        description,
        start_time,
        end_time,
        capacity,
        status,
        venue_approval_status,
        venue_rejection_reason,
        cover_image_url,
        flier_url,
        flier_video_url,
        timezone,
        created_at,
        venue_id,
        organizer_id,
        owner_user_id,
        table_booking_mode,
        organizer:organizers(id, name, email),
        venue:venues(id, name, slug, address, city),
        event_promoters(
          id,
          promoter:promoters(id, name, email),
          commission_type,
          commission_config
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
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
        { error: "You don't have permission to view this event" },
        { status: 403 }
      );
    }

    // Get registration and checkin counts
    const { count: registrations } = await serviceSupabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    const { count: checkins } = await serviceSupabase
      .from("checkins")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    return NextResponse.json({
      event: {
        ...event,
        registrations: registrations || 0,
        checkins: checkins || 0,
      },
    });
  } catch (error: any) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch event" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/venue/events/[eventId]
 * Update event settings (e.g., table_booking_mode)
 */
export async function PATCH(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;
    const body = await request.json();

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get the event to verify venue access
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, venue_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
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
        { error: "You don't have permission to update this event" },
        { status: 403 }
      );
    }

    // Build update object with allowed fields
    const updateData: Record<string, any> = {};

    if (body.table_booking_mode !== undefined) {
      const validModes = ["disabled", "promoter_only", "direct"];
      if (!validModes.includes(body.table_booking_mode)) {
        return NextResponse.json(
          { error: "Invalid table_booking_mode value" },
          { status: 400 }
        );
      }
      updateData.table_booking_mode = body.table_booking_mode;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update the event
    const { data: updatedEvent, error: updateError } = await serviceSupabase
      .from("events")
      .update(updateData)
      .eq("id", eventId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating event:", updateError);
      return NextResponse.json(
        { error: "Failed to update event" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    });
  } catch (error: any) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update event" },
      { status: 500 }
    );
  }
}

