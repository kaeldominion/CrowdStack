import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

export const dynamic = "force-dynamic";

/**
 * POST /api/venue/table-bookings/[bookingId]/archive
 * Archive a table booking (soft delete)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
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

    const { bookingId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Check if booking exists
    const { data: booking, error: fetchError } = await serviceSupabase
      .from("table_bookings")
      .select("id, status, archived_at")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.archived_at) {
      return NextResponse.json({ error: "Booking is already archived" }, { status: 400 });
    }

    // Archive the booking
    const { error: updateError } = await serviceSupabase
      .from("table_bookings")
      .update({
        archived_at: new Date().toISOString(),
        archived_by: userId,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Error archiving booking:", updateError);
      return NextResponse.json({ error: "Failed to archive booking" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      archived_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error in booking archive POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to archive booking" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/venue/table-bookings/[bookingId]/archive
 * Restore an archived table booking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
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

    const { bookingId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Check if booking exists and is archived
    const { data: booking, error: fetchError } = await serviceSupabase
      .from("table_bookings")
      .select("id, archived_at")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!booking.archived_at) {
      return NextResponse.json({ error: "Booking is not archived" }, { status: 400 });
    }

    // Restore the booking
    const { error: updateError } = await serviceSupabase
      .from("table_bookings")
      .update({
        archived_at: null,
        archived_by: null,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Error restoring booking:", updateError);
      return NextResponse.json({ error: "Failed to restore booking" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      restored: true,
    });
  } catch (error: any) {
    console.error("Error in booking archive DELETE:", error);
    return NextResponse.json(
      { error: error.message || "Failed to restore booking" },
      { status: 500 }
    );
  }
}
