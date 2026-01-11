import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";

export const dynamic = "force-dynamic";

interface UpdateGuestRequest {
  guest_name?: string;
  guest_phone?: string;
  resend_invite?: boolean;
}

interface EventWithVenue {
  id: string;
  name: string;
  venue_id: string;
  start_time: string;
  timezone: string | null;
  venue: {
    id: string;
    name: string;
  } | null;
}

interface BookingWithTable {
  id: string;
  event_id: string;
  guest_name: string;
  table: {
    id: string;
    name: string;
  } | null;
}

/**
 * GET /api/venue/events/[eventId]/bookings/[bookingId]/guests/[guestId]
 * Get a single guest
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string; bookingId: string; guestId: string } }
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

    const { eventId, bookingId, guestId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Verify the event belongs to this venue
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id, venue_id")
      .eq("id", eventId)
      .single();

    if (!event || event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify the booking exists
    const { data: booking } = await serviceSupabase
      .from("table_bookings")
      .select("id, event_id")
      .eq("id", bookingId)
      .eq("event_id", eventId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
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

    return NextResponse.json({ guest });
  } catch (error: any) {
    console.error("Error in guest GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch guest" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/venue/events/[eventId]/bookings/[bookingId]/guests/[guestId]
 * Update a guest (name, phone, or resend invite)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string; bookingId: string; guestId: string } }
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

    const { eventId, bookingId, guestId } = params;
    const body: UpdateGuestRequest = await request.json();
    const serviceSupabase = createServiceRoleClient();

    // Verify the event belongs to this venue and get details
    const { data: eventData, error: eventError } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        venue_id,
        start_time,
        timezone,
        venue:venues(id, name)
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = eventData as unknown as EventWithVenue;

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    // Verify the booking exists and get details
    const { data: bookingData, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        event_id,
        guest_name,
        table:venue_tables(id, name)
      `)
      .eq("id", bookingId)
      .eq("event_id", eventId)
      .single();

    if (bookingError || !bookingData) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingData as unknown as BookingWithTable;

    // Get the current guest
    const { data: currentGuest, error: guestError } = await serviceSupabase
      .from("table_party_guests")
      .select("*")
      .eq("id", guestId)
      .eq("booking_id", bookingId)
      .single();

    if (guestError || !currentGuest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.guest_name !== undefined) {
      updateData.guest_name = body.guest_name;
    }

    if (body.guest_phone !== undefined) {
      updateData.guest_phone = body.guest_phone || null;
    }

    // Update the guest
    const { data: updatedGuest, error: updateError } = await serviceSupabase
      .from("table_party_guests")
      .update(updateData)
      .eq("id", guestId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating guest:", updateError);
      return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
    }

    // Handle resend invite
    if (body.resend_invite && currentGuest.status === "invited") {
      // Update invite_sent_at
      await serviceSupabase
        .from("table_party_guests")
        .update({ invite_sent_at: new Date().toISOString() })
        .eq("id", guestId);

      // Send invite email
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.com";
        const joinUrl = `${baseUrl}/join-table/${currentGuest.invite_token}`;

        const startTime = event.start_time ? new Date(event.start_time) : null;
        const eventTimezone = event.timezone || "UTC";
        const eventDate = startTime
          ? startTime.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: eventTimezone,
            })
          : "TBA";

        await sendTemplateEmail(
          "table_party_invite",
          updatedGuest.guest_email,
          updatedGuest.attendee_id,
          {
            guest_name: updatedGuest.guest_name,
            host_name: booking.guest_name,
            event_name: event.name,
            event_date: eventDate,
            table_name: booking.table?.name || "Table",
            venue_name: event.venue?.name || "",
            join_url: joinUrl,
          },
          {
            event_id: event.id,
            booking_id: booking.id,
          }
        );
      } catch (emailError) {
        console.error("Failed to resend party invite email:", emailError);
        // Don't fail the operation if email fails
      }

      return NextResponse.json({
        success: true,
        guest: updatedGuest,
        message: "Guest updated and invite resent",
      });
    }

    return NextResponse.json({
      success: true,
      guest: updatedGuest,
      message: "Guest updated successfully",
    });
  } catch (error: any) {
    console.error("Error in guest PATCH:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update guest" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/venue/events/[eventId]/bookings/[bookingId]/guests/[guestId]
 * Remove a guest from the party (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string; bookingId: string; guestId: string } }
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

    const { eventId, bookingId, guestId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Verify the event belongs to this venue
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id, venue_id")
      .eq("id", eventId)
      .single();

    if (!event || event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify the booking exists
    const { data: booking } = await serviceSupabase
      .from("table_bookings")
      .select("id, event_id")
      .eq("id", bookingId)
      .eq("event_id", eventId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get the guest
    const { data: guest, error: guestError } = await serviceSupabase
      .from("table_party_guests")
      .select("id, is_host")
      .eq("id", guestId)
      .eq("booking_id", bookingId)
      .single();

    if (guestError || !guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Cannot remove the host
    if (guest.is_host) {
      return NextResponse.json(
        { error: "Cannot remove the host from the party" },
        { status: 400 }
      );
    }

    // Soft delete: mark as removed
    const { error: deleteError } = await serviceSupabase
      .from("table_party_guests")
      .update({
        status: "removed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", guestId);

    if (deleteError) {
      console.error("Error removing guest:", deleteError);
      return NextResponse.json({ error: "Failed to remove guest" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Guest removed from party",
    });
  } catch (error: any) {
    console.error("Error in guest DELETE:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove guest" },
      { status: 500 }
    );
  }
}
