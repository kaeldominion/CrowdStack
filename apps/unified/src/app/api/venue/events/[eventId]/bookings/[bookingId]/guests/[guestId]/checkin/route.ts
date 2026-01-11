import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

export const dynamic = "force-dynamic";

interface CheckInRequest {
  undo?: boolean;
}

/**
 * POST /api/venue/events/[eventId]/bookings/[bookingId]/guests/[guestId]/checkin
 * Check in a party guest at the door
 *
 * Body:
 * - undo: boolean (optional) - if true, undoes the check-in
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; bookingId: string; guestId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow venue_admin or door_staff roles
    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    const isDoorStaff = await userHasRoleOrSuperadmin("door_staff");

    if (!hasAccess && !isDoorStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const { eventId, bookingId, guestId } = params;
    const body: CheckInRequest = await request.json().catch(() => ({}));
    const isUndo = body.undo === true;

    const serviceSupabase = createServiceRoleClient();

    // Verify the event belongs to this venue
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id, venue_id, name")
      .eq("id", eventId)
      .single();

    if (!event || event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify the booking exists and get table info
    const { data: booking } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        event_id,
        status,
        guest_name,
        table:venue_tables(id, name)
      `)
      .eq("id", bookingId)
      .eq("event_id", eventId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check booking status - should be confirmed to allow check-in
    if (booking.status !== "confirmed" && booking.status !== "completed") {
      return NextResponse.json(
        { error: `Cannot check in guests for a ${booking.status} booking` },
        { status: 400 }
      );
    }

    // Get the guest
    const { data: guest, error: guestError } = await serviceSupabase
      .from("table_party_guests")
      .select("*")
      .eq("id", guestId)
      .eq("booking_id", bookingId)
      .single();

    if (guestError || !guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Check guest status
    if (guest.status === "removed") {
      return NextResponse.json(
        { error: "This guest has been removed from the party" },
        { status: 400 }
      );
    }

    if (guest.status === "declined") {
      return NextResponse.json(
        { error: "This guest declined the invitation" },
        { status: 400 }
      );
    }

    if (isUndo) {
      // Undo check-in
      if (!guest.checked_in) {
        return NextResponse.json(
          { error: "Guest is not checked in" },
          { status: 400 }
        );
      }

      const { data: updatedGuest, error: updateError } = await serviceSupabase
        .from("table_party_guests")
        .update({
          checked_in: false,
          checked_in_at: null,
          checked_in_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", guestId)
        .select()
        .single();

      if (updateError) {
        console.error("Error undoing check-in:", updateError);
        return NextResponse.json({ error: "Failed to undo check-in" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        guest: updatedGuest,
        message: "Check-in undone",
      });
    } else {
      // Check in
      if (guest.checked_in) {
        return NextResponse.json(
          {
            error: "Guest is already checked in",
            checked_in_at: guest.checked_in_at,
          },
          { status: 400 }
        );
      }

      const { data: updatedGuest, error: updateError } = await serviceSupabase
        .from("table_party_guests")
        .update({
          checked_in: true,
          checked_in_at: new Date().toISOString(),
          checked_in_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", guestId)
        .select()
        .single();

      if (updateError) {
        console.error("Error checking in guest:", updateError);
        return NextResponse.json({ error: "Failed to check in guest" }, { status: 500 });
      }

      // Get total checked in count for this booking
      const { count } = await serviceSupabase
        .from("table_party_guests")
        .select("*", { count: "exact", head: true })
        .eq("booking_id", bookingId)
        .eq("checked_in", true);

      return NextResponse.json({
        success: true,
        guest: updatedGuest,
        booking: {
          id: booking.id,
          guest_name: booking.guest_name,
          table_name: (booking.table as any)?.[0]?.name || (booking.table as any)?.name || "Table",
        },
        event: {
          id: event.id,
          name: event.name,
        },
        checked_in_count: count || 1,
        message: `${guest.guest_name} checked in successfully`,
      });
    }
  } catch (error: any) {
    console.error("Error in guest check-in:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process check-in" },
      { status: 500 }
    );
  }
}
