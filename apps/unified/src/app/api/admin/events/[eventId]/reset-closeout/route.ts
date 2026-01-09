import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";

/**
 * POST /api/admin/events/[eventId]/reset-closeout
 * Reset a failed closeout - unlocks event and removes orphaned payout data
 * Admin/Superadmin only
 */
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Only superadmins can reset closeouts
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const isSuperadmin = userRoles?.some(r => r.role === "superadmin");
    if (!isSuperadmin) {
      return NextResponse.json({ error: "Forbidden - Superadmin only" }, { status: 403 });
    }
    const eventId = params.eventId;

    // Get current event state
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, name, status, locked_at, closed_at")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Delete any payout_lines for this event
    const { data: payoutRuns } = await serviceSupabase
      .from("payout_runs")
      .select("id")
      .eq("event_id", eventId);

    const payoutRunIds = payoutRuns?.map(pr => pr.id) || [];

    if (payoutRunIds.length > 0) {
      // Delete payout lines
      const { error: deleteLinesError } = await serviceSupabase
        .from("payout_lines")
        .delete()
        .in("payout_run_id", payoutRunIds);

      if (deleteLinesError) {
        console.error("[ResetCloseout] Error deleting payout_lines:", deleteLinesError);
      }

      // Delete payout runs
      const { error: deleteRunsError } = await serviceSupabase
        .from("payout_runs")
        .delete()
        .eq("event_id", eventId);

      if (deleteRunsError) {
        console.error("[ResetCloseout] Error deleting payout_runs:", deleteRunsError);
      }
    }

    // Reset the event - unlock and clear closeout fields
    const { error: updateError } = await serviceSupabase
      .from("events")
      .update({
        locked_at: null,
        closed_at: null,
        closed_by: null,
        closeout_notes: null,
        status: "published", // Set back to published
      })
      .eq("id", eventId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[ResetCloseout] Event ${eventId} reset by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: "Closeout reset successfully",
      event_id: eventId,
      payout_runs_deleted: payoutRunIds.length,
    });
  } catch (error: any) {
    console.error("[ResetCloseout] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset closeout" },
      { status: 500 }
    );
  }
}
