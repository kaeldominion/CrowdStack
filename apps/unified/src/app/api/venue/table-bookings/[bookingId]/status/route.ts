import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";
import { generateTablePartyToken } from "@crowdstack/shared/qr/table-party";
import { getCurrencySymbol } from "@/lib/constants/currencies";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["pending", "confirmed", "cancelled", "no_show", "completed"];

/**
 * PATCH /api/venue/table-bookings/[bookingId]/status
 * Update booking status
 */
export async function PATCH(
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
    const body = await request.json();
    const { status } = body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get current booking with event details
    const { data: booking, error: fetchError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        status,
        guest_name,
        guest_email,
        guest_whatsapp,
        party_size,
        attendee_id,
        event:events(
          id,
          name,
          slug,
          start_time,
          timezone,
          currency,
          venue:venues(id, name, slug, address, city, currency)
        ),
        table:venue_tables(
          id,
          name,
          zone:table_zones(id, name)
        )
      `)
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const previousStatus = booking.status;

    // Update the booking status
    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Add confirmed_by and confirmed_at when confirming
    if (status === "confirmed" && previousStatus !== "confirmed") {
      updateData.confirmed_by = userId;
      updateData.confirmed_at = new Date().toISOString();
    }

    const { error: updateError } = await serviceSupabase
      .from("table_bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (updateError) {
      console.error("Error updating booking status:", updateError);
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    // Type assertions for nested data
    const event = booking.event as any;
    const table = booking.table as any;
    const venue = event?.venue;

    // When confirming, create host guest record for party system
    let hostGuestId: string | null = null;
    if (status === "confirmed" && previousStatus !== "confirmed") {
      // Check if host guest record already exists
      const { data: existingHost } = await serviceSupabase
        .from("table_party_guests")
        .select("id, invite_token")
        .eq("booking_id", bookingId)
        .eq("is_host", true)
        .single();

      if (!existingHost) {
        // Create host guest record
        const { data: newHost, error: hostError } = await serviceSupabase
          .from("table_party_guests")
          .insert({
            booking_id: bookingId,
            guest_name: booking.guest_name,
            guest_email: booking.guest_email,
            guest_phone: booking.guest_whatsapp,
            is_host: true,
            status: "joined",
            joined_at: new Date().toISOString(),
          })
          .select("id, invite_token")
          .single();

        if (hostError) {
          console.error("Error creating host guest:", hostError);
        }

        if (!hostError && newHost) {
          hostGuestId = newHost.id;

          // Generate QR token for host
          const qrToken = generateTablePartyToken(newHost.id, bookingId, event?.id);
          await serviceSupabase
            .from("table_party_guests")
            .update({ qr_token: qrToken })
            .eq("id", newHost.id);
        }
      } else {
        hostGuestId = existingHost.id;
      }
    }

    const eventTimezone = event?.timezone || "UTC";
    const eventStartTime = event?.start_time ? new Date(event.start_time) : null;
    const eventDate = eventStartTime
      ? eventStartTime.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: eventTimezone,
        })
      : "TBA";
    const eventTime = eventStartTime
      ? eventStartTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: eventTimezone,
        })
      : "TBA";

    try {
      if (status === "confirmed" && previousStatus !== "confirmed") {
        // Build URLs for email
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.com";
        const passUrl = hostGuestId ? `${baseUrl}/table-pass/${hostGuestId}` : `${baseUrl}/booking/${bookingId}`;
        const bookingUrl = `${baseUrl}/booking/${bookingId}`;
        const venueUrl = venue?.slug ? `${baseUrl}/venue/${venue.slug}` : "";

        const currency = event?.currency || venue?.currency || "IDR";
        const currencySymbol = getCurrencySymbol(currency);

        // Send confirmation email
        await sendTemplateEmail(
          "table_booking_confirmed",
          booking.guest_email,
          booking.attendee_id,
          {
            guest_name: booking.guest_name,
            event_name: event?.name || "Event",
            event_date: eventDate,
            event_time: eventTime,
            table_name: table?.name || "Table",
            zone_name: table?.zone?.name || "General",
            party_size: String(booking.party_size || 1),
            venue_name: venue?.name || "",
            venue_address: venue?.address ? `${venue.address}, ${venue.city || ""}` : "",
            venue_url: venueUrl,
            minimum_spend: "0",
            currency_symbol: currencySymbol,
            confirmation_number: bookingId.slice(0, 8).toUpperCase(),
            pass_url: passUrl,
            booking_url: bookingUrl,
          },
          {
            event_id: event?.id,
            booking_id: bookingId,
          }
        );
      } else if (status === "cancelled" && previousStatus !== "cancelled") {
        // Send cancellation email
        await sendTemplateEmail(
          "table_booking_cancelled",
          booking.guest_email,
          null,
          {
            guest_name: booking.guest_name,
            event_name: event?.name || "",
            event_date: eventDate,
            table_name: table?.name || "Table",
          },
          {
            event_id: event?.id,
            booking_id: bookingId,
          }
        );
      }
    } catch (emailError) {
      console.error("Failed to send status update email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      previous_status: previousStatus,
      new_status: status,
    });
  } catch (error: any) {
    console.error("Error in booking status PATCH:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update status" },
      { status: 500 }
    );
  }
}
