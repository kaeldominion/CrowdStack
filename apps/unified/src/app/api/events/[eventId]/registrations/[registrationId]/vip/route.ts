import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/events/[eventId]/registrations/[registrationId]/vip
 * Toggle event VIP status for a registration
 * Works for: venues, organizers, promoters (own referrals only), and superadmins
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string; registrationId: string }> }
) {
  try {
    const { eventId, registrationId } = await params;
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the registration and event details
    const { data: registration, error: regError } = await serviceSupabase
      .from("registrations")
      .select(`
        id, 
        event_id, 
        attendee_id, 
        referral_promoter_id, 
        is_event_vip, 
        event_vip_reason,
        event:events!inner(
          id,
          venue_id,
          organizer_id
        )
      `)
      .eq("id", registrationId)
      .eq("event_id", eventId)
      .single();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    const eventData = Array.isArray(registration.event) ? registration.event[0] : registration.event;
    if (!eventData) {
      return NextResponse.json(
        { error: "Event data not found" },
        { status: 404 }
      );
    }
    const event = eventData as { id: string; venue_id: string | null; organizer_id: string };

    // Check user permissions
    let hasPermission = false;
    let permissionSource = "";

    // Check if superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin") || false;

    if (isSuperadmin) {
      hasPermission = true;
      permissionSource = "superadmin";
    }

    // Check if venue admin for this event's venue
    if (!hasPermission && event.venue_id) {
      // Check if user has venue_admin role
      const hasVenueAdminRole = userRoles?.some((r) => r.role === "venue_admin") || false;
      
      if (hasVenueAdminRole) {
        // Verify user is associated with this venue
        const { data: venueUsers } = await serviceSupabase
          .from("venue_users")
          .select("venue_id")
          .eq("user_id", user.id)
          .eq("venue_id", event.venue_id)
          .limit(1);

        if (venueUsers && venueUsers.length > 0) {
          hasPermission = true;
          permissionSource = "venue";
        }
      }
    }

    // Check if organizer admin for this event's organizer
    if (!hasPermission) {
      const { data: organizerUser } = await serviceSupabase
        .from("organizer_users")
        .select("organizer_id")
        .eq("user_id", user.id)
        .eq("organizer_id", event.organizer_id)
        .single();

      if (organizerUser) {
        hasPermission = true;
        permissionSource = "organizer";
      }
    }

    // Check if promoter for this event (can only mark their own referrals)
    if (!hasPermission) {
      const { data: promoter } = await serviceSupabase
        .from("promoters")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (promoter && registration.referral_promoter_id === promoter.id) {
        hasPermission = true;
        permissionSource = "promoter";
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: "You don't have permission to manage VIP status for this event" },
        { status: 403 }
      );
    }

    // Parse request body for reason (optional)
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || null;

    // Toggle VIP status
    const newVipStatus = !registration.is_event_vip;

    const { error: updateError } = await serviceSupabase
      .from("registrations")
      .update({
        is_event_vip: newVipStatus,
        event_vip_reason: newVipStatus ? reason : null,
        event_vip_marked_by: newVipStatus ? user.id : null,
        event_vip_marked_at: newVipStatus ? new Date().toISOString() : null,
      })
      .eq("id", registrationId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      is_event_vip: newVipStatus,
      permission_source: permissionSource,
      message: newVipStatus
        ? "Marked as Event VIP"
        : "Removed Event VIP status",
    });
  } catch (error: any) {
    console.error("[Event VIP API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update VIP status" },
      { status: 500 }
    );
  }
}
