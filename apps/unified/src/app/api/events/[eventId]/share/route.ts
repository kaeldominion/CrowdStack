import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export const dynamic = 'force-dynamic';

/**
 * POST /api/events/[eventId]/share
 * Track event share and award XP
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();
    const eventId = params.eventId;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify event exists
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Award XP for sharing (function handles deduplication - only once per event)
    try {
      const { data: ledgerId, error: xpError } = await serviceSupabase.rpc('award_event_share_xp', {
        p_user_id: user.id,
        p_event_id: eventId,
      });

      if (xpError) {
        console.warn("[Event Share] Failed to award XP (non-critical):", xpError);
        // Don't fail the request if XP award fails
      } else {
        console.log(`[Event Share] Awarded share XP to user ${user.id} for event ${eventId}`);
      }
    } catch (xpErr) {
      console.warn("[Event Share] XP award error (non-critical):", xpErr);
      // Don't fail the request if XP award fails
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Event Share] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to track share" },
      { status: 500 }
    );
  }
}

