import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";

/**
 * GET /api/vip/organizer
 * 
 * Get all VIPs for an organizer
 * 
 * Query params:
 * - organizerId: UUID of the organizer
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  
  const organizerId = searchParams.get("organizerId");

  if (!organizerId) {
    return NextResponse.json({ error: "organizerId is required" }, { status: 400 });
  }

  try {
    const { data: vips, error } = await supabase
      .from("organizer_vips")
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
      .eq("organizer_id", organizerId)
      .order("granted_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ vips: vips || [] });
  } catch (error) {
    console.error("Error fetching organizer VIPs:", error);
    return NextResponse.json({ error: "Failed to fetch organizer VIPs" }, { status: 500 });
  }
}

/**
 * POST /api/vip/organizer
 * 
 * Grant or revoke organizer VIP status for an attendee
 * Requires organizer user access
 * 
 * Body:
 * - organizerId: UUID of the organizer
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
  const { organizerId, attendeeId, action, reason } = body;

  if (!organizerId) {
    return NextResponse.json({ error: "organizerId is required" }, { status: 400 });
  }

  if (!attendeeId) {
    return NextResponse.json({ error: "attendeeId is required" }, { status: 400 });
  }

  if (!action || !["grant", "revoke"].includes(action)) {
    return NextResponse.json({ error: "action must be 'grant' or 'revoke'" }, { status: 400 });
  }

  // Check if user has organizer access
  const { data: organizerUser } = await supabase
    .from("organizer_users")
    .select("id")
    .eq("organizer_id", organizerId)
    .eq("user_id", user.id)
    .single();

  // Also check for superadmin
  const { data: superadmin } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "superadmin")
    .single();

  if (!organizerUser && !superadmin) {
    return NextResponse.json({ error: "Forbidden: Organizer access required" }, { status: 403 });
  }

  try {
    if (action === "grant") {
      const { data, error } = await supabase
        .from("organizer_vips")
        .upsert({
          organizer_id: organizerId,
          attendee_id: attendeeId,
          reason: reason || "Manually granted",
          granted_by: user.id,
          granted_at: new Date().toISOString(),
        }, {
          onConflict: "organizer_id,attendee_id",
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Organizer VIP status granted",
        organizerVip: data,
      });
    } else {
      const { error } = await supabase
        .from("organizer_vips")
        .delete()
        .eq("organizer_id", organizerId)
        .eq("attendee_id", attendeeId);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Organizer VIP status revoked",
      });
    }
  } catch (error) {
    console.error("Error updating organizer VIP status:", error);
    return NextResponse.json({ error: "Failed to update VIP status" }, { status: 500 });
  }
}

