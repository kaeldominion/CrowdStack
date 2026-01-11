import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

/**
 * POST /api/venue/events/[eventId]/closeout/lock
 * Lock the closeout for an event (prevents further edits)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const { eventId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Verify event belongs to venue
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select("id, venue_id, tables_closeout_at")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    if (event.tables_closeout_at) {
      return NextResponse.json(
        { error: "Event closeout has already been locked" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Lock all bookings for this event
    const { error: bookingsLockError } = await serviceSupabase
      .from("table_bookings")
      .update({
        closeout_locked: true,
        closeout_locked_at: now,
        closeout_locked_by: userId,
        updated_at: now,
      })
      .eq("event_id", eventId)
      .in("status", ["confirmed", "completed"]);

    if (bookingsLockError) {
      console.error("Error locking bookings:", bookingsLockError);
      return NextResponse.json({ error: "Failed to lock bookings" }, { status: 500 });
    }

    // Lock all commission records for this event
    const { error: commissionsLockError } = await serviceSupabase
      .from("table_booking_commissions")
      .update({
        locked: true,
        locked_at: now,
        locked_by: userId,
        updated_at: now,
      })
      .eq("event_id", eventId);

    if (commissionsLockError) {
      console.error("Error locking commissions:", commissionsLockError);
      // Don't fail - bookings are already locked
    }

    // Update event closeout timestamp
    const { error: eventUpdateError } = await serviceSupabase
      .from("events")
      .update({
        tables_closeout_at: now,
        tables_closeout_by: userId,
        updated_at: now,
      })
      .eq("id", eventId);

    if (eventUpdateError) {
      console.error("Error updating event closeout:", eventUpdateError);
      return NextResponse.json({ error: "Failed to update event closeout" }, { status: 500 });
    }

    // Get final summary
    const { data: commissions } = await serviceSupabase
      .from("table_booking_commissions")
      .select("spend_amount, promoter_commission_amount, venue_commission_amount")
      .eq("event_id", eventId);

    const finalSummary = {
      total_spend: 0,
      total_promoter_commission: 0,
      total_venue_commission: 0,
      bookings_locked: 0,
    };

    if (commissions) {
      finalSummary.bookings_locked = commissions.length;
      for (const c of commissions) {
        finalSummary.total_spend += c.spend_amount || 0;
        finalSummary.total_promoter_commission += c.promoter_commission_amount || 0;
        finalSummary.total_venue_commission += c.venue_commission_amount || 0;
      }
    }

    return NextResponse.json({
      success: true,
      locked_at: now,
      locked_by: userId,
      summary: {
        bookings_locked: finalSummary.bookings_locked,
        total_spend: Math.round(finalSummary.total_spend * 100) / 100,
        total_promoter_commission: Math.round(finalSummary.total_promoter_commission * 100) / 100,
        total_venue_commission: Math.round(finalSummary.total_venue_commission * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error("Error in closeout lock:", error);
    return NextResponse.json(
      { error: error.message || "Failed to lock closeout" },
      { status: 500 }
    );
  }
}
