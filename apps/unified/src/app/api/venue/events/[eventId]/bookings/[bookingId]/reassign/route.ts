import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";
import { getCurrencySymbol } from "@/lib/constants/currencies";

export const dynamic = "force-dynamic";

interface ReassignBookingRequest {
  guest_name: string;
  guest_email: string;
  guest_whatsapp: string;
  party_size: number;
  special_requests?: string;
  staff_notes?: string;
}

/**
 * POST /api/venue/events/[eventId]/bookings/[bookingId]/reassign
 * Reassign a table from a no-show booking to a new guest
 *
 * This will:
 * 1. Mark the original booking as no_show (if not already)
 * 2. Create a new confirmed booking for the same table
 * 3. Link the new booking to the original via reassigned_from_booking_id
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; bookingId: string } }
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

    const { eventId, bookingId } = params;
    const body: ReassignBookingRequest = await request.json();

    // Validate required fields
    if (!body.guest_name || !body.guest_email || !body.guest_whatsapp || !body.party_size) {
      return NextResponse.json(
        { error: "Missing required fields: guest_name, guest_email, guest_whatsapp, party_size" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get the event with venue info
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        venue_id,
        currency,
        start_time,
        timezone,
        venue:venues(id, name, currency, address, city, state, country)
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    // Get the original booking
    const { data: originalBooking, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        *,
        table:venue_tables(id, name, capacity, minimum_spend, deposit_amount, zone:table_zones(id, name))
      `)
      .eq("id", bookingId)
      .eq("event_id", eventId)
      .single();

    if (bookingError || !originalBooking) {
      return NextResponse.json({ error: "Original booking not found" }, { status: 404 });
    }

    // Only allow reassignment from no_show or confirmed status
    if (!["no_show", "confirmed"].includes(originalBooking.status)) {
      return NextResponse.json(
        { error: `Cannot reassign from booking with status: ${originalBooking.status}` },
        { status: 400 }
      );
    }

    const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
    const table = originalBooking.table as any;
    const currency = event.currency || venue?.currency || "USD";
    const currencySymbol = getCurrencySymbol(currency);

    // If the original booking is not already no_show, mark it as such
    if (originalBooking.status !== "no_show") {
      const { error: updateOriginalError } = await serviceSupabase
        .from("table_bookings")
        .update({
          status: "no_show",
          cancelled_by: userId,
          cancelled_at: new Date().toISOString(),
          cancellation_type: "no_show",
          cancellation_reason: "Table reassigned to another guest",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (updateOriginalError) {
        console.error("Error marking original booking as no_show:", updateOriginalError);
        return NextResponse.json({ error: "Failed to mark original booking as no-show" }, { status: 500 });
      }

      // Send no-show notification to original guest
      const eventTimezone = event.timezone || "UTC";
      const arrivalDeadline = originalBooking.arrival_deadline
        ? new Date(originalBooking.arrival_deadline).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: eventTimezone,
          })
        : new Date(event.start_time).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZone: eventTimezone,
          });

      try {
        await sendTemplateEmail(
          "table_booking_no_show",
          originalBooking.guest_email,
          originalBooking.attendee_id,
          {
            guest_name: originalBooking.guest_name,
            event_name: event.name,
            table_name: table?.name || "Table",
            arrival_deadline: arrivalDeadline,
            venue_name: venue?.name || "",
          },
          { event_id: eventId, booking_id: bookingId }
        );
      } catch (emailError) {
        console.error("Failed to send no-show email:", emailError);
      }
    }

    // Create the new booking
    const newBookingData = {
      event_id: eventId,
      table_id: originalBooking.table_id,
      guest_name: body.guest_name,
      guest_email: body.guest_email,
      guest_whatsapp: body.guest_whatsapp,
      party_size: body.party_size,
      special_requests: body.special_requests || null,
      staff_notes: body.staff_notes || null,
      status: "confirmed",
      confirmed_by: userId,
      confirmed_at: new Date().toISOString(),
      minimum_spend: originalBooking.minimum_spend,
      deposit_required: null, // No deposit for walk-in reassignments
      deposit_received: false,
      reassigned_from_booking_id: bookingId,
      reassigned_at: new Date().toISOString(),
      // Copy timeslot info from original
      slot_start_time: originalBooking.slot_start_time,
      slot_end_time: originalBooking.slot_end_time,
      arrival_deadline: null, // No deadline for walk-in
    };

    const { data: newBooking, error: createError } = await serviceSupabase
      .from("table_bookings")
      .insert(newBookingData)
      .select(`
        *,
        table:venue_tables(id, name, capacity, zone:table_zones(id, name))
      `)
      .single();

    if (createError) {
      console.error("Error creating new booking:", createError);
      return NextResponse.json({ error: "Failed to create new booking" }, { status: 500 });
    }

    // Send confirmation email to new guest
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
    const eventTime = startTime
      ? startTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: eventTimezone,
        })
      : "TBA";

    let venueAddress = "";
    if (venue) {
      const parts = [venue.address, venue.city, venue.state, venue.country].filter(Boolean);
      venueAddress = parts.join(", ");
    }

    try {
      await sendTemplateEmail(
        "table_booking_confirmed",
        body.guest_email,
        null, // No attendee link for walk-in
        {
          guest_name: body.guest_name,
          event_name: event.name,
          event_date: eventDate,
          event_time: eventTime,
          table_name: table?.name || "Table",
          zone_name: table?.zone?.name || "General",
          party_size: body.party_size.toString(),
          minimum_spend: originalBooking.minimum_spend?.toFixed(2) || "0",
          currency_symbol: currencySymbol,
          confirmation_number: newBooking.id.substring(0, 8).toUpperCase(),
          venue_name: venue?.name || "",
          venue_address: venueAddress,
        },
        { event_id: eventId, booking_id: newBooking.id }
      );
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Table successfully reassigned",
      original_booking_id: bookingId,
      new_booking: newBooking,
    });
  } catch (error: any) {
    console.error("Error in booking reassign:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reassign booking" },
      { status: 500 }
    );
  }
}
