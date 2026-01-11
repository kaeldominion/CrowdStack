import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserOrganizerId, getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/events/[eventId]/registrations/[registrationId]/notes
 * Update notes for a registration
 * Accessible by: event organizer, venue admin, superadmin
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; registrationId: string }> | { eventId: string; registrationId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { eventId, registrationId } = resolvedParams;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for organizer, venue_admin, or admin role
    const hasOrganizerAccess = await userHasRoleOrSuperadmin("event_organizer");
    const hasVenueAccess = await userHasRoleOrSuperadmin("venue_admin");
    const { userHasRole } = await import("@crowdstack/shared/auth/roles");
    const userIsSuperadmin = await userHasRole("superadmin");

    if (!hasOrganizerAccess && !hasVenueAccess && !userIsSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizerId = await getUserOrganizerId();
    const venueId = await getUserVenueId();

    const serviceSupabase = createServiceRoleClient();

    // Verify event exists and user has access
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, organizer_id, venue_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check ownership
    if (!userIsSuperadmin) {
      const isOrganizer = organizerId && event.organizer_id === organizerId;
      const isVenueAdmin = venueId && event.venue_id === venueId;

      if (!isOrganizer && !isVenueAdmin) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // Verify registration belongs to this event
    const { data: registration, error: regError } = await serviceSupabase
      .from("registrations")
      .select("id, event_id")
      .eq("id", registrationId)
      .eq("event_id", eventId)
      .single();

    if (regError || !registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    // Get notes from request body
    const body = await request.json();
    const { notes } = body;

    if (typeof notes !== "string") {
      return NextResponse.json({ error: "Notes must be a string" }, { status: 400 });
    }

    // Validate length
    if (notes.length > 500) {
      return NextResponse.json({ error: "Notes cannot exceed 500 characters" }, { status: 400 });
    }

    // Update notes
    const { error: updateError } = await serviceSupabase
      .from("registrations")
      .update({ notes: notes || null })
      .eq("id", registrationId);

    if (updateError) {
      console.error("Error updating notes:", updateError);
      return NextResponse.json({ error: "Failed to update notes" }, { status: 500 });
    }

    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    console.error("Error in registration notes PATCH:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update notes" },
      { status: 500 }
    );
  }
}
