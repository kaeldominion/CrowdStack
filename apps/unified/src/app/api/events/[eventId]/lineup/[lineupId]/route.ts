import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * PATCH /api/events/[eventId]/lineup/[lineupId]
 * Update a lineup entry (e.g., toggle headliner status)
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; lineupId: string }> | { eventId: string; lineupId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { eventId, lineupId } = resolvedParams;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check event edit permissions (same logic as other lineup endpoints)
    const serviceSupabase = createServiceRoleClient();
    const { data: event } = await serviceSupabase
      .from("events")
      .select("organizer_id, venue_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user has access (organizer or venue admin)
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    if (!isSuperadmin) {
      let hasAccess = false;

      // Check if user is organizer
      if (roles.includes("event_organizer")) {
        const { data: organizerUser } = await serviceSupabase
          .from("organizer_users")
          .select("organizer_id")
          .eq("user_id", user.id)
          .eq("organizer_id", event.organizer_id)
          .single();
        
        if (organizerUser) {
          hasAccess = true;
        } else {
          const { data: organizer } = await serviceSupabase
            .from("organizers")
            .select("id")
            .eq("created_by", user.id)
            .eq("id", event.organizer_id)
            .single();
          
          if (organizer) {
            hasAccess = true;
          }
        }
      }

      // Check if user is venue admin
      if (!hasAccess && roles.includes("venue_admin") && event.venue_id) {
        const { data: venueUser } = await serviceSupabase
          .from("venue_users")
          .select("venue_id")
          .eq("user_id", user.id)
          .eq("venue_id", event.venue_id)
          .single();
        
        if (venueUser) {
          hasAccess = true;
        } else {
          const { data: venue } = await serviceSupabase
            .from("venues")
            .select("id")
            .eq("created_by", user.id)
            .eq("id", event.venue_id)
            .single();
          
          if (venue) {
            hasAccess = true;
          }
        }
      }

      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { is_headliner } = body;

    const updateData: any = {};
    if (is_headliner !== undefined) updateData.is_headliner = is_headliner;

    const { error: updateError } = await serviceSupabase
      .from("event_lineups")
      .update(updateData)
      .eq("id", lineupId)
      .eq("event_id", eventId);

    if (updateError) {
      console.error("Error updating lineup:", updateError);
      return NextResponse.json({ error: "Failed to update lineup" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating lineup:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}



