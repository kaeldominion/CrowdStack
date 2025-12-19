import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { notifyOrganizerOfApproval } from "@crowdstack/shared/notifications/send";

export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const { eventId } = params;
    const body = await request.json();
    const { action, rejection_reason, add_to_preapproved } = body; // action: "approve" | "reject"

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
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
        { error: "Event has no venue, approval not required" },
        { status: 400 }
      );
    }

    // Verify user has access to this venue
    const venueId = await getUserVenueId();
    
    // Also check if user is assigned to the venue
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

    // Check superadmin
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
        { error: "You don't have permission to approve events at this venue" },
        { status: 403 }
      );
    }

    // Update event approval status
    const updateData: any = {
      venue_approval_status: action === "approve" ? "approved" : "rejected",
      venue_approval_at: new Date().toISOString(),
      venue_approval_by: user.id,
    };

    if (action === "reject" && rejection_reason) {
      updateData.venue_rejection_reason = rejection_reason;
    }

    const { error: updateError } = await serviceSupabase
      .from("events")
      .update(updateData)
      .eq("id", eventId);

    if (updateError) {
      throw updateError;
    }

    // Add organizer to pre-approved list if requested
    if (action === "approve" && add_to_preapproved) {
      try {
        // Check if partnership already exists
        const { data: existingPartnership } = await serviceSupabase
          .from("venue_organizer_partnerships")
          .select("id")
          .eq("venue_id", event.venue_id)
          .eq("organizer_id", event.organizer.id)
          .single();

        if (!existingPartnership) {
          await serviceSupabase.from("venue_organizer_partnerships").insert({
            venue_id: event.venue_id,
            organizer_id: event.organizer.id,
            auto_approve: true,
            created_by: user.id,
          });
        }
      } catch (partnershipError) {
        console.error("Failed to create partnership:", partnershipError);
        // Don't fail the approval if partnership creation fails
      }
    }

    // Notify the organizer
    try {
      await notifyOrganizerOfApproval(
        event.organizer.id,
        eventId,
        event.name,
        event.venue.name,
        action === "approve",
        rejection_reason
      );
    } catch (notifyError) {
      console.error("Failed to notify organizer:", notifyError);
    }

    return NextResponse.json({
      success: true,
      status: action === "approve" ? "approved" : "rejected",
    });
  } catch (error: any) {
    console.error("Error processing venue approval:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process approval" },
      { status: 500 }
    );
  }
}

