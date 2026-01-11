import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/booking/[id]/cancel
 * Guest cancellation of their own table booking
 *
 * Note: Deposits are non-refundable for guest cancellations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get the user's attendee record
    const { data: attendee } = await serviceSupabase
      .from("attendees")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!attendee) {
      return NextResponse.json(
        { error: "Attendee profile not found" },
        { status: 404 }
      );
    }

    // Get the booking and verify ownership
    const { data: booking, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        status,
        attendee_id,
        guest_name,
        guest_email,
        event:events(
          id,
          name,
          start_time,
          venue:venues(name)
        ),
        table:venue_tables(name)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Verify ownership - either the attendee_id matches or the guest_email matches
    const isOwner = booking.attendee_id === attendee.id;

    if (!isOwner) {
      // Also check if user email matches guest email
      const { data: userProfile } = await serviceSupabase
        .from("attendees")
        .select("email")
        .eq("id", attendee.id)
        .single();

      if (userProfile?.email?.toLowerCase() !== booking.guest_email?.toLowerCase()) {
        return NextResponse.json(
          { error: "You can only cancel your own bookings" },
          { status: 403 }
        );
      }
    }

    // Check if booking can be cancelled
    if (!["pending", "confirmed"].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a booking with status: ${booking.status}` },
        { status: 400 }
      );
    }

    // Parse optional reason from request body
    let reason = null;
    try {
      const body = await request.json();
      reason = body.reason || null;
    } catch {
      // No body or invalid JSON - that's fine
    }

    // Cancel the booking
    const { error: updateError } = await serviceSupabase
      .from("table_bookings")
      .update({
        status: "cancelled",
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
        cancellation_type: "guest",
        cancellation_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Error cancelling booking:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel booking" },
        { status: 500 }
      );
    }

    // TODO: Send cancellation confirmation email
    // The email would be triggered by a database trigger or edge function
    // using the 'table_booking_guest_cancelled' template

    const event = booking.event as any;
    const table = booking.table as any;
    const venue = event?.venue;

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully",
      booking: {
        id: bookingId,
        status: "cancelled",
        guest_name: booking.guest_name,
        event_name: event?.name,
        table_name: table?.name,
        venue_name: venue?.name,
      },
      note: "Deposits are non-refundable for guest cancellations.",
    });
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel booking" },
      { status: 500 }
    );
  }
}
