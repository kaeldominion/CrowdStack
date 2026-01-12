import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export const dynamic = 'force-dynamic';

/**
 * POST /api/venue/attendees/[attendeeId]/vip
 * Mark an attendee as a venue VIP
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ attendeeId: string }> }
) {
  try {
    const { attendeeId } = await params;
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

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
    const { venueId, reason } = body;

    if (!venueId) {
      return NextResponse.json({ error: "venueId is required" }, { status: 400 });
    }

    // Check if user is a venue admin for this venue
    const { data: venueUser, error: venueUserError } = await serviceSupabase
      .from("venue_users")
      .select("venue_id")
      .eq("user_id", user.id)
      .eq("venue_id", venueId)
      .single();

    // Check if user is superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin") || false;

    if (venueUserError && !isSuperadmin) {
      return NextResponse.json(
        { error: "You don't have permission to manage VIPs for this venue" },
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

    // Insert or update venue VIP
    const { data: vipData, error: vipError } = await serviceSupabase
      .from("venue_vips")
      .upsert({
        venue_id: venueId,
        attendee_id: attendeeId,
        reason: reason || null,
        granted_by: user.id,
        granted_at: new Date().toISOString(),
      }, {
        onConflict: "venue_id,attendee_id",
      })
      .select()
      .single();

    if (vipError) {
      console.error("[Venue VIP] Error creating VIP:", vipError);
      return NextResponse.json(
        { error: "Failed to mark attendee as VIP" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, vip: vipData });
  } catch (error) {
    console.error("[Venue VIP] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/venue/attendees/[attendeeId]/vip
 * Remove venue VIP status from an attendee
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attendeeId: string }> }
) {
  try {
    const { attendeeId } = await params;
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get venueId from query params
    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get("venueId");

    if (!venueId) {
      return NextResponse.json({ error: "venueId is required" }, { status: 400 });
    }

    // Check if user is a venue admin for this venue
    const { data: venueUser, error: venueUserError } = await serviceSupabase
      .from("venue_users")
      .select("venue_id")
      .eq("user_id", user.id)
      .eq("venue_id", venueId)
      .single();

    // Check if user is superadmin
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isSuperadmin = userRoles?.some((r) => r.role === "superadmin") || false;

    if (venueUserError && !isSuperadmin) {
      return NextResponse.json(
        { error: "You don't have permission to manage VIPs for this venue" },
        { status: 403 }
      );
    }

    // Delete venue VIP
    const { error: deleteError } = await serviceSupabase
      .from("venue_vips")
      .delete()
      .eq("venue_id", venueId)
      .eq("attendee_id", attendeeId);

    if (deleteError) {
      console.error("[Venue VIP] Error deleting VIP:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove VIP status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Venue VIP] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

