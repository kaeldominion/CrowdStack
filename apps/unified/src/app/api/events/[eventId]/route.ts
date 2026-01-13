import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { logActivity } from "@crowdstack/shared/activity/log-activity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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

    // Get event with related data
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select(`
        *,
        organizer:organizers(id, name, email),
        venue:venues(id, name, slug, address, city, capacity),
        event_promoters(
          id,
          promoter:promoters(id, name, email),
          commission_type,
          commission_config
        )
      `)
      .eq("id", params.eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    console.log("Event promoters loaded:", event.event_promoters?.length || 0, event.event_promoters);

    // Fetch owner details if event has an owner
    let owner: { id: string; email: string | null; first_name: string | null; last_name: string | null } | null = null;
    if (event.owner_user_id) {
      try {
        const { data: userData } = await serviceSupabase.auth.admin.getUserById(event.owner_user_id);
        if (userData?.user) {
          owner = {
            id: userData.user.id,
            email: userData.user.email || null,
            first_name: userData.user.user_metadata?.first_name || null,
            last_name: userData.user.user_metadata?.last_name || null,
          };
        }
      } catch (err) {
        console.error("[Event] Failed to fetch owner details:", err);
      }
    }

    // Check if user is the organizer or superadmin
    if (!isSuperadmin) {
      // Get organizers this user owns
      const { data: ownedOrganizers } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", userId);

      // Get organizers this user is a team member of
      const { data: memberOrganizers } = await serviceSupabase
        .from("organizer_users")
        .select("organizer_id")
        .eq("user_id", userId);

      const organizerIds = [
        ...(ownedOrganizers?.map((o) => o.id) || []),
        ...(memberOrganizers?.map((o) => o.organizer_id) || []),
      ];

      if (!organizerIds.includes(event.organizer_id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({ event: { ...event, owner } });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch event" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  console.log("[EventUpdate] PATCH request received for event:", params.eventId);
  
  try {
    const userId = await getUserId();
    console.log("[EventUpdate] User ID:", userId);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify organizer role or superadmin
    if (!(await userHasRoleOrSuperadmin("event_organizer"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const serviceSupabase = createServiceRoleClient();

    // Get user roles to check if superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    // Check if user can manage this event
    if (!isSuperadmin) {
      // Get organizers this user owns
      const { data: ownedOrganizers } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("created_by", userId);

      // Get organizers this user is a team member of
      const { data: memberOrganizers } = await serviceSupabase
        .from("organizer_users")
        .select("organizer_id")
        .eq("user_id", userId);

      const organizerIds = [
        ...(ownedOrganizers?.map((o) => o.id) || []),
        ...(memberOrganizers?.map((o) => o.organizer_id) || []),
      ];

      if (organizerIds.length === 0) {
        return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
      }

      const { data: event } = await serviceSupabase
        .from("events")
        .select("organizer_id, locked_at")
        .eq("id", params.eventId)
        .single();

      if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
      }

      if (event.locked_at) {
        return NextResponse.json({ error: "Event is locked" }, { status: 403 });
      }

      if (!organizerIds.includes(event.organizer_id)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check if trying to publish - prevent if venue approval is not granted
    if (body.status === "published") {
      const { data: currentEvent } = await serviceSupabase
        .from("events")
        .select("venue_id, venue_approval_status")
        .eq("id", params.eventId)
        .single();

      if (currentEvent?.venue_id) {
        // Event has a venue - must be approved before publishing
        const approvalStatus = currentEvent.venue_approval_status;
        
        if (approvalStatus !== "approved") {
          if (approvalStatus === "rejected") {
            return NextResponse.json(
              { error: "Cannot publish event: The venue has rejected this event. Please edit the event or choose a different venue." },
              { status: 400 }
            );
          }
          // Covers "pending" and null cases
          return NextResponse.json(
            { error: "Cannot publish event: Waiting for venue approval. The venue must approve your event before it can be published." },
            { status: 400 }
          );
        }
      }
    }

    // Validate max_guestlist_size when guestlist is enabled
    if (body.has_guestlist !== false) {
      // Check current event state if has_guestlist is not being changed
      const { data: currentEvent } = await serviceSupabase
        .from("events")
        .select("has_guestlist, max_guestlist_size")
        .eq("id", params.eventId)
        .single();
      
      const willHaveGuestlist = body.has_guestlist !== undefined ? body.has_guestlist : (currentEvent?.has_guestlist ?? true);
      const newMaxGuestlistSize = body.max_guestlist_size !== undefined ? (body.max_guestlist_size ? parseInt(body.max_guestlist_size) : null) : currentEvent?.max_guestlist_size;
      
      if (willHaveGuestlist && !newMaxGuestlistSize) {
        return NextResponse.json(
          { error: "Max guestlist size is required when guestlist registration is enabled" },
          { status: 400 }
        );
      }
    }

    // Debug logging
    console.log("[EventUpdate] Updating event:", params.eventId);
    console.log("[EventUpdate] Update payload:", JSON.stringify(body, null, 2));
    console.log("[EventUpdate] show_photo_email_notice in body:", body.show_photo_email_notice, typeof body.show_photo_email_notice);

    // Update event
    const { data: updatedEvent, error: updateError } = await serviceSupabase
      .from("events")
      .update(body)
      .eq("id", params.eventId)
      .select()
      .single();
    
    console.log("[EventUpdate] Updated event show_photo_email_notice:", updatedEvent?.show_photo_email_notice);

    if (updateError) {
      console.error("[EventUpdate] Supabase error:", updateError);
      throw updateError;
    }

    console.log("[EventUpdate] Updated event start_time:", updatedEvent?.start_time);
    
    // Log activity
    await logActivity(
      userId,
      "event_edit",
      "event",
      params.eventId,
      {
        changes: Object.keys(body),
        event_name: updatedEvent?.name,
      }
    );
    
    return NextResponse.json({ event: updatedEvent });
  } catch (error: any) {
    console.error("[EventUpdate] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update event" },
      { status: 500 }
    );
  }
}

