import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";

/**
 * POST /api/vip/global
 * 
 * Grant or revoke global VIP status for an attendee
 * Requires superadmin role
 * 
 * Body:
 * - attendeeId: UUID of the attendee
 * - action: "grant" | "revoke"
 * - reason: Optional reason for granting VIP status
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is superadmin
  const { data: userRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "superadmin")
    .single();

  if (!userRole) {
    return NextResponse.json({ error: "Forbidden: Superadmin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { attendeeId, action, reason } = body;

  if (!attendeeId) {
    return NextResponse.json({ error: "attendeeId is required" }, { status: 400 });
  }

  if (!action || !["grant", "revoke"].includes(action)) {
    return NextResponse.json({ error: "action must be 'grant' or 'revoke'" }, { status: 400 });
  }

  try {
    if (action === "grant") {
      const { data, error } = await supabase
        .from("attendees")
        .update({
          is_global_vip: true,
          global_vip_reason: reason || "Manually granted by admin",
          global_vip_granted_by: user.id,
          global_vip_granted_at: new Date().toISOString(),
        })
        .eq("id", attendeeId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Global VIP status granted",
        attendee: data,
      });
    } else {
      const { data, error } = await supabase
        .from("attendees")
        .update({
          is_global_vip: false,
          global_vip_reason: null,
          global_vip_granted_by: null,
          global_vip_granted_at: null,
        })
        .eq("id", attendeeId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: "Global VIP status revoked",
        attendee: data,
      });
    }
  } catch (error) {
    console.error("Error updating global VIP status:", error);
    return NextResponse.json({ error: "Failed to update VIP status" }, { status: 500 });
  }
}

