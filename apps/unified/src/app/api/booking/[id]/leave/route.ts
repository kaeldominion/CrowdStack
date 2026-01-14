import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/booking/[id]/leave
 * Allows a guest (not the host) to leave a table party
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const userEmail = user.email.toLowerCase();

    // Get booking details
    const { data: booking, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        guest_email,
        guest_name,
        event:events(
          id,
          name,
          start_time,
          timezone,
          venue:venues(id, name)
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if user is trying to leave as the host - not allowed
    if (booking.guest_email?.toLowerCase() === userEmail) {
      return NextResponse.json(
        { error: "The host cannot leave the party. Cancel the booking instead." },
        { status: 400 }
      );
    }

    // Find the guest record for this user
    const { data: guestRecord, error: guestError } = await serviceSupabase
      .from("table_party_guests")
      .select("id, guest_name, guest_email, is_host, status, attendee_id")
      .eq("booking_id", bookingId)
      .eq("guest_email", userEmail)
      .neq("status", "removed")
      .single();

    if (guestError || !guestRecord) {
      return NextResponse.json(
        { error: "You are not a guest of this table party" },
        { status: 403 }
      );
    }

    // Double-check they're not the host
    if (guestRecord.is_host) {
      return NextResponse.json(
        { error: "The host cannot leave the party. Cancel the booking instead." },
        { status: 400 }
      );
    }

    // Update guest status to "removed"
    const { error: updateError } = await serviceSupabase
      .from("table_party_guests")
      .update({
        status: "removed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", guestRecord.id);

    if (updateError) {
      console.error("Error leaving party:", updateError);
      return NextResponse.json(
        { error: "Failed to leave party" },
        { status: 500 }
      );
    }

    // Also cancel their event registration if they have one
    const event = booking.event as any;
    if (guestRecord.attendee_id && event?.id) {
      await serviceSupabase
        .from("registrations")
        .update({ status: "cancelled" })
        .eq("attendee_id", guestRecord.attendee_id)
        .eq("event_id", event.id);
    }

    // Notify the host that a guest has left
    if (booking.guest_email) {
      try {
        const { sendTemplateEmail } = await import("@crowdstack/shared/email/template-renderer");
        const venue = event?.venue as { name: string } | null;

        await sendTemplateEmail(
          "table_party_guest_left",
          booking.guest_email,
          null,
          {
            host_name: booking.guest_name || "Host",
            guest_name: guestRecord.guest_name || "A guest",
            event_name: event?.name || "the event",
            venue_name: venue?.name || "",
          },
          {
            event_id: event?.id,
            booking_id: bookingId,
          }
        );
      } catch (emailError) {
        console.error("Failed to send guest left notification email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "You have left the table party",
    });
  } catch (error: any) {
    console.error("Error in leave POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to leave party" },
      { status: 500 }
    );
  }
}
