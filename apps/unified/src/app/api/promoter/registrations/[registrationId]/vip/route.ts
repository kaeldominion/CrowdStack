import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

/**
 * POST /api/promoter/registrations/[registrationId]/vip
 * Toggle event VIP status for a registration
 * Only promoters can mark VIPs for registrations they referred
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { registrationId: string } }
) {
  try {
    const { registrationId } = params;
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the promoter for this user
    const { data: promoter, error: promoterError } = await serviceSupabase
      .from("promoters")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (promoterError || !promoter) {
      return NextResponse.json(
        { error: "You must be a promoter to mark VIPs" },
        { status: 403 }
      );
    }

    // Get the registration and verify it belongs to this promoter's referrals
    const { data: registration, error: regError } = await serviceSupabase
      .from("registrations")
      .select("id, event_id, attendee_id, referral_promoter_id, is_event_vip, event_vip_reason")
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    // Verify this registration was referred by this promoter
    if (registration.referral_promoter_id !== promoter.id) {
      return NextResponse.json(
        { error: "You can only mark VIPs for your own referrals" },
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
      message: newVipStatus
        ? "Marked as Event VIP"
        : "Removed Event VIP status",
    });
  } catch (error: any) {
    console.error("[Promoter VIP API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update VIP status" },
      { status: 500 }
    );
  }
}
