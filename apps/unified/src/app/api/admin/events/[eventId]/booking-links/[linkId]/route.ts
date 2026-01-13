import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/events/[eventId]/booking-links/[linkId]
 * Deactivate a booking link (admin access)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string; linkId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperadmin = await userHasRoleOrSuperadmin("superadmin");
    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { eventId, linkId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Verify the event exists
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify the link belongs to this event
    const { data: link } = await serviceSupabase
      .from("table_booking_links")
      .select("id, event_id")
      .eq("id", linkId)
      .single();

    if (!link || link.event_id !== eventId) {
      return NextResponse.json({ error: "Booking link not found" }, { status: 404 });
    }

    // Deactivate the link (soft delete)
    const { error: updateError } = await serviceSupabase
      .from("table_booking_links")
      .update({ is_active: false })
      .eq("id", linkId);

    if (updateError) {
      console.error("[Admin] Error deactivating booking link:", updateError);
      return NextResponse.json({ error: "Failed to deactivate booking link" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("[Admin] Error in booking-links DELETE:", error);
    return NextResponse.json(
      { error: error.message || "Failed to deactivate booking link" },
      { status: 500 }
    );
  }
}
