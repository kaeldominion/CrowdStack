import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

interface ImportMatch {
  booking_id: string;
  spend_amount: number;
}

interface ImportRequest {
  matches: ImportMatch[];
  filename?: string;
  raw_data?: any;
  mapping_config?: any;
}

/**
 * POST /api/venue/events/[eventId]/closeout/import
 * Apply CSV import to update booking actual_spend values
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
    const body: ImportRequest = await request.json();

    if (!body.matches || !Array.isArray(body.matches) || body.matches.length === 0) {
      return NextResponse.json(
        { error: "No matches to import" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify event belongs to venue and is not locked
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
        { error: "Event closeout has already been completed and locked" },
        { status: 400 }
      );
    }

    // Create import audit record
    const { data: importRecord, error: importError } = await serviceSupabase
      .from("table_closeout_imports")
      .insert({
        event_id: eventId,
        filename: body.filename || "manual_import",
        import_type: "csv",
        row_count: body.matches.length,
        matched_count: body.matches.length,
        raw_data: body.raw_data || null,
        mapping_config: body.mapping_config || null,
        status: "processing",
        imported_by: userId,
      })
      .select()
      .single();

    if (importError) {
      console.error("Error creating import record:", importError);
      return NextResponse.json({ error: "Failed to create import record" }, { status: 500 });
    }

    // Update each booking with the spend amount
    let successCount = 0;
    let failedCount = 0;
    const errors: Array<{ booking_id: string; error: string }> = [];

    for (const match of body.matches) {
      if (!match.booking_id || typeof match.spend_amount !== "number") {
        failedCount++;
        errors.push({
          booking_id: match.booking_id || "unknown",
          error: "Invalid match data",
        });
        continue;
      }

      // Verify booking belongs to this event
      const { data: booking, error: bookingError } = await serviceSupabase
        .from("table_bookings")
        .select("id, event_id, closeout_locked")
        .eq("id", match.booking_id)
        .eq("event_id", eventId)
        .single();

      if (bookingError || !booking) {
        failedCount++;
        errors.push({
          booking_id: match.booking_id,
          error: "Booking not found or does not belong to this event",
        });
        continue;
      }

      if (booking.closeout_locked) {
        failedCount++;
        errors.push({
          booking_id: match.booking_id,
          error: "Booking closeout is already locked",
        });
        continue;
      }

      // Update the booking
      const { error: updateError } = await serviceSupabase
        .from("table_bookings")
        .update({
          actual_spend: match.spend_amount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.booking_id);

      if (updateError) {
        failedCount++;
        errors.push({
          booking_id: match.booking_id,
          error: updateError.message,
        });
      } else {
        successCount++;
      }
    }

    // Update import record status
    const finalStatus = failedCount === 0 ? "completed" : failedCount === body.matches.length ? "failed" : "completed";
    await serviceSupabase
      .from("table_closeout_imports")
      .update({
        matched_count: successCount,
        status: finalStatus,
        error_message: errors.length > 0 ? JSON.stringify(errors) : null,
      })
      .eq("id", importRecord.id);

    return NextResponse.json({
      success: true,
      import_id: importRecord.id,
      summary: {
        total: body.matches.length,
        success: successCount,
        failed: failedCount,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Error in closeout import:", error);
    return NextResponse.json(
      { error: error.message || "Failed to import data" },
      { status: 500 }
    );
  }
}
