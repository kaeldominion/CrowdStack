import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";
import { getCurrencySymbol } from "@/lib/constants/currencies";

export const dynamic = "force-dynamic";

interface UpdateBookingRequest {
  status?: "pending" | "confirmed" | "cancelled" | "no_show" | "completed";
  table_id?: string;
  deposit_received?: boolean;
  actual_spend?: number | null;
  staff_notes?: string;
  cancellation_reason?: string;
}

interface EventWithVenue {
  id: string;
  name: string;
  venue_id: string;
  currency: string | null;
  start_time: string;
  timezone: string | null;
  venue: {
    id: string;
    name: string;
    currency: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  } | null;
}

interface TableWithZone {
  id: string;
  name: string;
  minimum_spend: number | null;
  deposit_amount: number | null;
  capacity: number;
  zone: {
    id: string;
    name: string;
  } | null;
}

/**
 * PATCH /api/venue/events/[eventId]/bookings/[bookingId]
 * Update a table booking
 */
export async function PATCH(
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
    const body: UpdateBookingRequest = await request.json();

    const serviceSupabase = createServiceRoleClient();

    // Verify the event belongs to this venue
    const { data: eventData, error: eventError } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        venue_id,
        currency,
        start_time,
        timezone,
        venue:venues(
          id,
          name,
          currency,
          address,
          city,
          state,
          country
        )
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Type assertion to fix Supabase's nested relation type inference
    const event = eventData as unknown as EventWithVenue;

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    // Get the current booking
    const { data: currentBooking, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        *,
        table:venue_tables(id, name, capacity, zone:table_zones(id, name))
      `)
      .eq("id", bookingId)
      .eq("event_id", eventId)
      .single();

    if (bookingError || !currentBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const currency = event.currency || event.venue?.currency || "USD";
    const currencySymbol = getCurrencySymbol(currency);

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Track what changed for email notifications
    let statusChanged = false;
    let tableChanged = false;
    let oldStatus = currentBooking.status;
    let oldTableName = currentBooking.table?.name;
    let newTableName = currentBooking.table?.name;
    let newZoneName = currentBooking.table?.zone?.name;

    // Handle status change
    if (body.status !== undefined && body.status !== currentBooking.status) {
      updateData.status = body.status;
      statusChanged = true;

      if (body.status === "confirmed") {
        updateData.confirmed_by = userId;
        updateData.confirmed_at = new Date().toISOString();
      }

      // Track cancellation/no-show details
      if (body.status === "cancelled" || body.status === "no_show") {
        updateData.cancelled_by = userId;
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancellation_type = body.status === "no_show" ? "no_show" : "venue";
        updateData.cancellation_reason = body.cancellation_reason || body.staff_notes || null;
      }
    }

    // Handle table change
    if (body.table_id !== undefined && body.table_id !== currentBooking.table_id) {
      // Verify the new table exists and belongs to the venue
      const { data: newTableData, error: tableError } = await serviceSupabase
        .from("venue_tables")
        .select("id, name, minimum_spend, deposit_amount, capacity, zone:table_zones(id, name)")
        .eq("id", body.table_id)
        .eq("venue_id", venueId)
        .single();

      if (tableError || !newTableData) {
        return NextResponse.json({ error: "Invalid table" }, { status: 400 });
      }

      // Type assertion to fix Supabase's nested relation type inference
      const newTable = newTableData as unknown as TableWithZone;

      // Check if new table is available for this event
      const { data: availability } = await serviceSupabase
        .from("event_table_availability")
        .select("is_available, override_minimum_spend, override_deposit")
        .eq("event_id", eventId)
        .eq("table_id", body.table_id)
        .single();

      if (availability && availability.is_available === false) {
        return NextResponse.json({ error: "Table is not available for this event" }, { status: 400 });
      }

      updateData.table_id = body.table_id;
      updateData.minimum_spend = availability?.override_minimum_spend ?? newTable.minimum_spend;
      updateData.deposit_required = availability?.override_deposit ?? newTable.deposit_amount;
      tableChanged = true;
      newTableName = newTable.name;
      newZoneName = newTable.zone?.name || "General";
    }

    // Handle deposit received
    if (body.deposit_received !== undefined && body.deposit_received !== currentBooking.deposit_received) {
      updateData.deposit_received = body.deposit_received;
      if (body.deposit_received) {
        updateData.deposit_received_at = new Date().toISOString();
        // Also set payment_status to "paid" when deposit is marked as received
        updateData.payment_status = "paid";
      } else {
        updateData.deposit_received_at = null;
        // Reset payment_status when deposit is unmarked
        if (currentBooking.deposit_required && currentBooking.deposit_required > 0) {
          updateData.payment_status = "pending";
        } else {
          updateData.payment_status = "not_required";
        }
      }
    }

    // Handle actual spend
    if (body.actual_spend !== undefined) {
      updateData.actual_spend = body.actual_spend;
    }

    // Handle staff notes
    if (body.staff_notes !== undefined) {
      updateData.staff_notes = body.staff_notes;
    }

    // Update the booking
    const { data: updatedBooking, error: updateError } = await serviceSupabase
      .from("table_bookings")
      .update(updateData)
      .eq("id", bookingId)
      .select(`
        *,
        table:venue_tables(id, name, capacity, zone:table_zones(id, name))
      `)
      .single();

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
    }

    // Format date for emails
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

    // Send email notifications for status changes
    try {
      if (statusChanged && body.status === "confirmed") {
        // Build venue address
        let venueAddress = "";
        if (event.venue) {
          const parts = [event.venue.address, event.venue.city, event.venue.state, event.venue.country].filter(Boolean);
          venueAddress = parts.join(", ");
        }

        await sendTemplateEmail(
          "table_booking_confirmed",
          currentBooking.guest_email,
          currentBooking.attendee_id,
          {
            guest_name: currentBooking.guest_name,
            event_name: event.name,
            event_date: eventDate,
            event_time: eventTime,
            table_name: updatedBooking.table?.name || currentBooking.table?.name,
            zone_name: updatedBooking.table?.zone?.name || "General",
            party_size: currentBooking.party_size.toString(),
            minimum_spend: updatedBooking.minimum_spend?.toFixed(2) || "0",
            currency_symbol: currencySymbol,
            confirmation_number: bookingId.substring(0, 8).toUpperCase(),
            venue_name: event.venue?.name || "",
            venue_address: venueAddress,
          },
          { event_id: eventId, booking_id: bookingId }
        );
      } else if (statusChanged && body.status === "cancelled") {
        await sendTemplateEmail(
          "table_booking_cancelled",
          currentBooking.guest_email,
          currentBooking.attendee_id,
          {
            guest_name: currentBooking.guest_name,
            event_name: event.name,
            event_date: eventDate,
            table_name: currentBooking.table?.name || "Table",
            cancellation_reason: body.cancellation_reason || body.staff_notes || "",
          },
          { event_id: eventId, booking_id: bookingId }
        );
      } else if (statusChanged && body.status === "no_show") {
        // Get arrival deadline for the no-show email
        const arrivalDeadline = currentBooking.arrival_deadline
          ? new Date(currentBooking.arrival_deadline).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              timeZone: eventTimezone,
            })
          : eventTime;

        await sendTemplateEmail(
          "table_booking_no_show",
          currentBooking.guest_email,
          currentBooking.attendee_id,
          {
            guest_name: currentBooking.guest_name,
            event_name: event.name,
            table_name: currentBooking.table?.name || "Table",
            arrival_deadline: arrivalDeadline,
            venue_name: event.venue?.name || "",
          },
          { event_id: eventId, booking_id: bookingId }
        );
      } else if (tableChanged) {
        // Table changed notification
        const depositChanged = updateData.deposit_required !== currentBooking.deposit_required;

        await sendTemplateEmail(
          "table_booking_table_changed",
          currentBooking.guest_email,
          currentBooking.attendee_id,
          {
            guest_name: currentBooking.guest_name,
            event_name: event.name,
            event_date: eventDate,
            old_table_name: oldTableName,
            new_table_name: newTableName,
            new_zone_name: newZoneName,
            minimum_spend: updatedBooking.minimum_spend?.toFixed(2) || "0",
            currency_symbol: currencySymbol,
            deposit_changed: depositChanged ? "true" : "",
            new_deposit_amount: updatedBooking.deposit_required?.toFixed(2) || "0",
          },
          { event_id: eventId, booking_id: bookingId }
        );
      }
    } catch (emailError) {
      console.error("Failed to send booking notification email:", emailError);
      // Don't fail the update if email fails
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
    });
  } catch (error: any) {
    console.error("Error in booking PATCH:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update booking" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/venue/events/[eventId]/bookings/[bookingId]
 * Get a single booking
 */
export async function GET(
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

    // Get the booking
    const { data: booking, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        *,
        table:venue_tables(id, name, capacity, zone:table_zones(id, name))
      `)
      .eq("id", bookingId)
      .eq("event_id", eventId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get promoter info if exists
    let promoter = null;
    if (booking.promoter_id) {
      const { data: promoterData } = await serviceSupabase
        .from("promoters")
        .select("id, name, slug")
        .eq("id", booking.promoter_id)
        .single();
      promoter = promoterData;
    }

    return NextResponse.json({
      booking: {
        ...booking,
        promoter,
      },
    });
  } catch (error: any) {
    console.error("Error in booking GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch booking" },
      { status: 500 }
    );
  }
}
