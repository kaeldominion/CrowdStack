import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";
import { getUserRolesById } from "@crowdstack/shared/auth/roles";

// GET - Fetch promoter requests for organizer's events
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const roles = await getUserRolesById(userId);
    
    const isSuperadmin = roles.includes("superadmin");
    const isOrganizer = roles.includes("event_organizer");
    const isVenueAdmin = roles.includes("venue_admin");

    if (!isSuperadmin && !isOrganizer && !isVenueAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all events that this user can manage
    let eventIds: string[] = [];

    if (isSuperadmin) {
      // Superadmin sees all requests
      const { data: events } = await supabase
        .from("events")
        .select("id");
      eventIds = events?.map(e => e.id) || [];
    } else {
      // Get organizer's events
      if (isOrganizer) {
        const organizerId = await getUserOrganizerId();
        if (organizerId) {
          const { data: organizerEvents } = await supabase
            .from("events")
            .select("id")
            .eq("organizer_id", organizerId);
          eventIds.push(...(organizerEvents?.map(e => e.id) || []));
        }
      }

      // Get venue's events
      if (isVenueAdmin) {
        // Get venues user manages
        const { data: venueUsers } = await supabase
          .from("venue_users")
          .select("venue_id")
          .eq("user_id", userId);

        const { data: ownedVenues } = await supabase
          .from("venues")
          .select("id")
          .eq("created_by", userId);

        const venueIds = [
          ...(venueUsers?.map(v => v.venue_id) || []),
          ...(ownedVenues?.map(v => v.id) || [])
        ];

        if (venueIds.length > 0) {
          const { data: venueEvents } = await supabase
            .from("events")
            .select("id")
            .in("venue_id", venueIds);
          eventIds.push(...(venueEvents?.map(e => e.id) || []));
        }
      }
    }

    // Remove duplicates
    eventIds = [...new Set(eventIds)];

    if (eventIds.length === 0) {
      return NextResponse.json({ requests: [] });
    }

    // Fetch requests for these events
    const { data: requests, error } = await supabase
      .from("promoter_requests")
      .select(`
        id,
        message,
        status,
        response_message,
        created_at,
        responded_at,
        event:events(
          id,
          name,
          slug,
          flier_url,
          start_time,
          venue:venues(id, name)
        ),
        promoter:promoters(
          id,
          name,
          email,
          user_id
        )
      `)
      .in("event_id", eventIds)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Organizer Promoter Requests] Error fetching:", error);
      return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
    }

    // Group by status for easier frontend handling
    const pending = requests?.filter(r => r.status === "pending") || [];
    const approved = requests?.filter(r => r.status === "approved") || [];
    const declined = requests?.filter(r => r.status === "declined") || [];

    return NextResponse.json({ 
      requests, 
      counts: {
        pending: pending.length,
        approved: approved.length,
        declined: declined.length,
        total: requests?.length || 0
      }
    });
  } catch (error: any) {
    console.error("[Organizer Promoter Requests] Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}

// PATCH - Respond to a promoter request (approve/decline)
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { request_id, action, response_message, commission_type, commission_config } = body;

    if (!request_id || !["approve", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch the request and verify access
    const { data: promoterRequest, error: fetchError } = await supabase
      .from("promoter_requests")
      .select(`
        id,
        status,
        promoter_id,
        event_id,
        event:events(
          id,
          organizer_id,
          venue_id
        )
      `)
      .eq("id", request_id)
      .single();

    if (fetchError || !promoterRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (promoterRequest.status !== "pending") {
      return NextResponse.json({ error: "Request already responded to" }, { status: 400 });
    }

    // Verify user has access to this event
    const event = Array.isArray(promoterRequest.event) 
      ? promoterRequest.event[0] 
      : promoterRequest.event;

    const roles = await getUserRolesById(userId);
    const isSuperadmin = roles.includes("superadmin");
    let hasAccess = isSuperadmin;

    if (!hasAccess && event?.organizer_id) {
      const organizerId = await getUserOrganizerId();
      if (organizerId === event.organizer_id) {
        hasAccess = true;
      }
    }

    if (!hasAccess && event?.venue_id) {
      const { data: venueUser } = await supabase
        .from("venue_users")
        .select("id")
        .eq("venue_id", event.venue_id)
        .eq("user_id", userId)
        .single();

      const { data: venueOwner } = await supabase
        .from("venues")
        .select("id")
        .eq("id", event.venue_id)
        .eq("created_by", userId)
        .single();

      if (venueUser || venueOwner) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the request
    const newStatus = action === "approve" ? "approved" : "declined";
    const { error: updateError } = await supabase
      .from("promoter_requests")
      .update({
        status: newStatus,
        response_message: response_message || null,
        responded_at: new Date().toISOString(),
        responded_by: userId,
      })
      .eq("id", request_id);

    if (updateError) {
      console.error("[Organizer Promoter Requests] Error updating:", updateError);
      return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
    }

    // If approved, add the promoter to the event
    if (action === "approve") {
      const { error: assignError } = await supabase
        .from("event_promoters")
        .insert({
          event_id: promoterRequest.event_id,
          promoter_id: promoterRequest.promoter_id,
          commission_type: commission_type || "per_head",
          commission_config: commission_config || { amount: 0 },
          assigned_by: "organizer",
        });

      if (assignError) {
        console.error("[Organizer Promoter Requests] Error assigning promoter:", assignError);
        // Don't fail - the request was approved, assignment can be done manually
      }
    }

    // Get promoter info for notification
    const { data: promoter } = await supabase
      .from("promoters")
      .select("user_id, email, name")
      .eq("id", promoterRequest.promoter_id)
      .single();

    // TODO: Send notification to promoter about the decision
    console.log(`[Organizer Promoter Requests] Request ${action}ed for promoter ${promoter?.name || promoter?.email}`);

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error("[Organizer Promoter Requests] Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}


