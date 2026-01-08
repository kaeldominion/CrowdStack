import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/vip/venue
 * 
 * Get all VIPs for a venue
 * 
 * Query params:
 * - venueId: UUID of the venue
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const venueId = searchParams.get("venueId");

  if (!venueId) {
    return NextResponse.json({ error: "venueId is required" }, { status: 400 });
  }

  try {
    const { data: vips, error } = await supabase
      .from("venue_vips")
      .select(`
        id,
        reason,
        granted_at,
        granted_by,
        attendees (
          id,
          name,
          surname,
          email,
          phone,
          avatar_url,
          is_global_vip
        )
      `)
      .eq("venue_id", venueId)
      .order("granted_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ vips: vips || [] });
  } catch (error) {
    console.error("Error fetching venue VIPs:", error);
    return NextResponse.json({ error: "Failed to fetch venue VIPs" }, { status: 500 });
  }
}

/**
 * POST /api/vip/venue
 * 
 * Grant or revoke venue VIP status for an attendee
 * Requires venue admin access
 * 
 * Body:
 * - venueId: UUID of the venue
 * - attendeeId: UUID of the attendee
 * - action: "grant" | "revoke"
 * - reason: Optional reason for granting VIP status
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { venueId, attendeeId, action, reason } = body;

  if (!venueId) {
    return NextResponse.json({ error: "venueId is required" }, { status: 400 });
  }

  if (!attendeeId) {
    return NextResponse.json({ error: "attendeeId is required" }, { status: 400 });
  }

  if (!action || !["grant", "revoke"].includes(action)) {
    return NextResponse.json({ error: "action must be 'grant' or 'revoke'" }, { status: 400 });
  }

  // Check if user has venue admin access
  const { data: venueUser } = await supabase
    .from("venue_users")
    .select("id")
    .eq("venue_id", venueId)
    .eq("user_id", user.id)
    .single();

  // Also check for superadmin
  const { data: superadmin } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "superadmin")
    .single();

  if (!venueUser && !superadmin) {
    return NextResponse.json({ error: "Forbidden: Venue admin access required" }, { status: 403 });
  }

  try {
    if (action === "grant") {
      const { data, error } = await supabase
        .from("venue_vips")
        .upsert({
          venue_id: venueId,
          attendee_id: attendeeId,
          reason: reason || "Manually granted",
          granted_by: user.id,
          granted_at: new Date().toISOString(),
        }, {
          onConflict: "venue_id,attendee_id",
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Venue VIP status granted",
        venueVip: data,
      });
    } else {
      const { error } = await supabase
        .from("venue_vips")
        .delete()
        .eq("venue_id", venueId)
        .eq("attendee_id", attendeeId);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Venue VIP status revoked",
      });
    }
  } catch (error) {
    console.error("Error updating venue VIP status:", error);
    return NextResponse.json({ error: "Failed to update VIP status" }, { status: 500 });
  }
}

