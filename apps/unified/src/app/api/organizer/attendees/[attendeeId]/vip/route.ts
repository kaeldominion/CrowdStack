import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { hasOrganizerPermission } from "@crowdstack/shared/auth/organizer-permissions";

export const dynamic = 'force-dynamic';

/**
 * POST /api/organizer/attendees/[attendeeId]/vip
 * Mark an attendee as an organizer VIP
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { attendeeId: string } }
) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();
    const attendeeId = params.attendeeId;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await request.json().catch(() => ({}));
    const { organizerId, reason } = body;

    if (!organizerId) {
      return NextResponse.json({ error: "organizerId is required" }, { status: 400 });
    }

    // Check if user is superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin") || false;

    // Check if user has permission to manage guests/VIPs
    // Organizer creator (created_by) and users with full_admin automatically have permission
    // Otherwise, check for manage_guests permission
    const canManageGuests = isSuperadmin || 
      await hasOrganizerPermission(user.id, organizerId, "full_admin") ||
      await hasOrganizerPermission(user.id, organizerId, "manage_guests");

    if (!canManageGuests) {
      return NextResponse.json(
        { error: "You don't have permission to manage VIPs for this organizer" },
        { status: 403 }
      );
    }

    // Verify attendee exists
    const { data: attendee, error: attendeeError } = await serviceSupabase
      .from("attendees")
      .select("id")
      .eq("id", attendeeId)
      .single();

    if (attendeeError || !attendee) {
      return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
    }

    // Insert or update organizer VIP
    const { data: vipData, error: vipError } = await serviceSupabase
      .from("organizer_vips")
      .upsert({
        organizer_id: organizerId,
        attendee_id: attendeeId,
        reason: reason || null,
        granted_by: user.id,
        granted_at: new Date().toISOString(),
      }, {
        onConflict: "organizer_id,attendee_id",
      })
      .select()
      .single();

    if (vipError) {
      console.error("[Organizer VIP] Error creating VIP:", vipError);
      return NextResponse.json(
        { error: "Failed to mark attendee as VIP" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, vip: vipData });
  } catch (error) {
    console.error("[Organizer VIP] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizer/attendees/[attendeeId]/vip
 * Remove organizer VIP status from an attendee
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { attendeeId: string } }
) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();
    const attendeeId = params.attendeeId;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get organizerId from query params
    const { searchParams } = new URL(request.url);
    const organizerId = searchParams.get("organizerId");

    if (!organizerId) {
      return NextResponse.json({ error: "organizerId is required" }, { status: 400 });
    }

    // Check if user is superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin") || false;

    // Check if user has permission to manage guests/VIPs
    // Organizer creator (created_by) and users with full_admin automatically have permission
    // Otherwise, check for manage_guests permission
    const canManageGuests = isSuperadmin || 
      await hasOrganizerPermission(user.id, organizerId, "full_admin") ||
      await hasOrganizerPermission(user.id, organizerId, "manage_guests");

    if (!canManageGuests) {
      return NextResponse.json(
        { error: "You don't have permission to manage VIPs for this organizer" },
        { status: 403 }
      );
    }

    // Delete organizer VIP
    const { error: deleteError } = await serviceSupabase
      .from("organizer_vips")
      .delete()
      .eq("organizer_id", organizerId)
      .eq("attendee_id", attendeeId);

    if (deleteError) {
      console.error("[Organizer VIP] Error deleting VIP:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove VIP status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Organizer VIP] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

