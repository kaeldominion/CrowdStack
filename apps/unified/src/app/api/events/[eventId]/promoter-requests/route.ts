import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";
import { getUserRolesById } from "@crowdstack/shared/auth/roles";
import { trackPromoterApproved } from "@/lib/analytics/server";

// GET - Fetch promoter requests for an event
// DISABLED: Promoter request feature has been removed

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  return NextResponse.json(
    { error: "Promoter request feature has been disabled", requests: [] },
    { status: 410 }
  );
  
  /* DISABLED CODE - Feature removed
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = params.eventId;
    const supabase = createServiceRoleClient();
    
    // Check if user has permission to view this event's requests
    const roles = await getUserRolesById(userId);
    const isSuperAdmin = roles.includes("superadmin");

    // Get the event to check ownership
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, organizer_id, venue_id, organizer:organizers(created_by), venue:venues(created_by)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("Event not found:", eventId, eventError);
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check authorization - handle both object and array returns from Supabase
    const organizerData = Array.isArray(event.organizer) ? event.organizer[0] : event.organizer;
    const venueData = Array.isArray(event.venue) ? event.venue[0] : event.venue;
    
    const isOrganizer = organizerData?.created_by === userId;
    const isVenueAdmin = venueData?.created_by === userId;

    // Check if user is a team member of the organizer
    let isTeamMember = false;
    if (event.organizer_id && !isOrganizer) {
      const { data: teamMember } = await supabase
        .from("organizer_team_members")
        .select("id")
        .eq("organizer_id", event.organizer_id)
        .eq("user_id", userId)
        .maybeSingle();
      isTeamMember = !!teamMember;
    }

    console.log("Promoter requests auth check:", {
      userId,
      organizerId: event.organizer_id,
      organizerCreatedBy: organizerData?.created_by,
      venueCreatedBy: venueData?.created_by,
      isOrganizer,
      isVenueAdmin,
      isTeamMember,
      isSuperAdmin,
    });

    if (!isSuperAdmin && !isOrganizer && !isVenueAdmin && !isTeamMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch promoter requests for this event with full promoter details
    const { data: requests, error: requestsError } = await supabase
      .from("promoter_requests")
      .select(`
        id,
        promoter_id,
        message,
        status,
        created_at,
        promoter:promoters(id, name, email, phone, user_id)
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching promoter requests:", requestsError);
      return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
    }

    console.log("Promoter requests found:", requests?.length || 0);
    return NextResponse.json({ requests: requests || [] });
  } catch (error: any) {
    console.error("Promoter requests API error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
  */
}

// PATCH - Approve or decline a promoter request
// DISABLED: Promoter request feature has been removed
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  return NextResponse.json(
    { error: "Promoter request feature has been disabled" },
    { status: 410 }
  );
  
  /* DISABLED CODE - Feature removed
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eventId = params.eventId;
    const supabase = createServiceRoleClient();

    const body = await request.json();
    const { requestId, action } = body;

    if (!requestId || !["approve", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Check if user has permission
    const roles = await getUserRolesById(userId);
    const isSuperAdmin = roles.includes("superadmin");

    // Get the event to check ownership
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, organizer_id, venue_id, organizer:organizers(created_by), venue:venues(created_by)")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Handle both object and array returns from Supabase
    const organizerData = Array.isArray(event.organizer) ? event.organizer[0] : event.organizer;
    const venueData = Array.isArray(event.venue) ? event.venue[0] : event.venue;
    
    const isOrganizer = organizerData?.created_by === userId;
    const isVenueAdmin = venueData?.created_by === userId;

    // Check if user is a team member of the organizer
    let isTeamMember = false;
    if (event.organizer_id && !isOrganizer) {
      const { data: teamMember } = await supabase
        .from("organizer_team_members")
        .select("id")
        .eq("organizer_id", event.organizer_id)
        .eq("user_id", userId)
        .maybeSingle();
      isTeamMember = !!teamMember;
    }

    if (!isSuperAdmin && !isOrganizer && !isVenueAdmin && !isTeamMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the request
    const { data: promoterRequest, error: requestError } = await supabase
      .from("promoter_requests")
      .select("id, promoter_id, status")
      .eq("id", requestId)
      .eq("event_id", eventId)
      .single();

    if (requestError || !promoterRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (promoterRequest.status !== "pending") {
      return NextResponse.json({ error: "Request already processed" }, { status: 400 });
    }

    if (action === "approve") {
      // Update the request status
      const { error: updateError } = await supabase
        .from("promoter_requests")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (updateError) {
        console.error("Error updating request:", updateError);
        return NextResponse.json({ error: "Failed to approve request" }, { status: 500 });
      }

      // Add the promoter to the event
      console.log("Adding promoter to event:", {
        event_id: eventId,
        promoter_id: promoterRequest.promoter_id,
      });
      
      const { data: assignData, error: assignError } = await supabase
        .from("event_promoters")
        .upsert({
          event_id: eventId,
          promoter_id: promoterRequest.promoter_id,
          commission_type: "flat_per_head", // Must match CHECK constraint
          commission_config: { amount_per_head: 0 }, // Default, organizer can update later
        }, {
          onConflict: "event_id,promoter_id",
          ignoreDuplicates: false,
        })
        .select();

      if (assignError) {
        console.error("Error assigning promoter:", assignError);
        return NextResponse.json({ 
          success: true, 
          message: "Request approved but failed to assign promoter",
          assignError: assignError.message 
        });
      }
      
      console.log("Promoter assigned successfully:", assignData);

      // Track analytics event
      try {
        await trackPromoterApproved(eventId, promoterRequest.promoter_id, event.organizer_id || "", request);
      } catch (analyticsError) {
        console.warn("[Promoter Requests API] Failed to track analytics event:", analyticsError);
      }

      return NextResponse.json({ success: true, message: "Request approved", promoterAssigned: true });
    } else {
      // Decline the request
      const { error: updateError } = await supabase
        .from("promoter_requests")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", requestId);

      if (updateError) {
        console.error("Error updating request:", updateError);
        return NextResponse.json({ error: "Failed to decline request" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Request declined" });
    }
  } catch (error: any) {
    console.error("Promoter requests PATCH error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
  */
}
