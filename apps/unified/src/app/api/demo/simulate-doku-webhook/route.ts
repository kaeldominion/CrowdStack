import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";
import { getCurrencySymbol } from "@/lib/constants/currencies";

export const dynamic = "force-dynamic";

/**
 * POST /api/demo/simulate-doku-webhook
 *
 * Simulates a DOKU webhook for demo/testing purposes.
 * This endpoint is only active when DOKU_DEMO_MODE=true
 *
 * It mimics what the real /api/webhooks/doku endpoint does,
 * allowing you to test the full payment flow without real DOKU credentials.
 */
export async function POST(request: NextRequest) {
  // Only allow in demo mode
  if (process.env.DOKU_DEMO_MODE !== "true") {
    return NextResponse.json(
      { error: "Demo mode is not enabled" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { invoice_number, status, payment_method } = body;

    if (!invoice_number) {
      return NextResponse.json(
        { error: "Missing invoice_number" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Find the payment transaction
    const { data: transaction, error: transactionError } = await serviceSupabase
      .from("payment_transactions")
      .select(`
        id,
        venue_id,
        reference_type,
        reference_id,
        status,
        amount,
        currency
      `)
      .eq("doku_invoice_id", invoice_number)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json({ success: true, message: "Transaction not found" });
    }

    // Update transaction
    const transactionUpdates: Record<string, any> = {
      webhook_received_at: new Date().toISOString(),
      webhook_payload: { demo: true, status, payment_method },
      doku_payment_method: payment_method || "DEMO",
    };

    if (status === "SUCCESS") {
      transactionUpdates.status = "completed";
      transactionUpdates.paid_at = new Date().toISOString();

      await serviceSupabase
        .from("payment_transactions")
        .update(transactionUpdates)
        .eq("id", transaction.id);

      // Handle table booking payment
      if (transaction.reference_type === "table_booking") {
        await handleTableBookingPayment(
          serviceSupabase,
          transaction.reference_id
        );
      }
    }

    return NextResponse.json({ success: true, message: "Demo webhook processed" });
  } catch (error: any) {
    console.error("[Demo Webhook] Error:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
}

/**
 * Handle successful payment for a table booking (copied from real webhook)
 */
async function handleTableBookingPayment(
  supabase: ReturnType<typeof createServiceRoleClient>,
  bookingId: string
) {
  try {
    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from("table_bookings")
      .select(`
        id,
        status,
        guest_name,
        guest_email,
        party_size,
        attendee_id,
        event:events(
          id,
          name,
          start_time,
          timezone,
          currency,
          venue_id,
          venue:venues(
            name,
            slug,
            address,
            currency
          )
        ),
        table:venue_tables(
          name,
          zone:table_zones(name)
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return;
    }

    // Get venue payment settings for auto_confirm
    const event = booking.event as any;
    const venue = event?.venue;

    let autoConfirm = true;
    if (event?.venue_id) {
      const { data: paymentSettings } = await supabase
        .from("venue_payment_settings")
        .select("auto_confirm_on_payment")
        .eq("venue_id", event.venue_id)
        .single();

      autoConfirm = paymentSettings?.auto_confirm_on_payment ?? true;
    }

    // Update booking payment status
    const bookingUpdates: Record<string, any> = {
      payment_status: "paid",
      deposit_received: true,
      deposit_received_at: new Date().toISOString(),
    };

    // Auto-confirm if enabled and booking is still pending
    if (autoConfirm && booking.status === "pending") {
      bookingUpdates.status = "confirmed";
      bookingUpdates.confirmed_at = new Date().toISOString();
    }

    await supabase
      .from("table_bookings")
      .update(bookingUpdates)
      .eq("id", bookingId);

    // Create host guest record if it doesn't exist
    const { data: existingHost } = await supabase
      .from("table_party_guests")
      .select("id, invite_token")
      .eq("booking_id", bookingId)
      .eq("is_host", true)
      .single();

    let hostGuestId = existingHost?.id;
    let inviteToken = existingHost?.invite_token;

    if (!existingHost) {
      const { data: newHost } = await supabase
        .from("table_party_guests")
        .insert({
          booking_id: bookingId,
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          is_host: true,
          status: "joined",
          joined_at: new Date().toISOString(),
        })
        .select("id, invite_token")
        .single();

      if (newHost) {
        hostGuestId = newHost.id;
        inviteToken = newHost.invite_token;

        // Generate QR token for host
        const { generateTablePartyToken } = await import("@crowdstack/shared/qr/table-party");
        const qrToken = generateTablePartyToken(newHost.id, bookingId, event?.id);
        await supabase
          .from("table_party_guests")
          .update({ qr_token: qrToken })
          .eq("id", newHost.id);
      }
    }

    // Send confirmation email with QR and invite links
    try {
      const table = booking.table as any;

      const currency = event?.currency || venue?.currency || "IDR";
      const currencySymbol = getCurrencySymbol(currency);

      const startTime = event?.start_time ? new Date(event.start_time) : null;
      const eventTimezone = event?.timezone || "UTC";

      const eventDate = startTime
        ? startTime.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: eventTimezone,
          })
        : "TBA";

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.com";
      const passUrl = hostGuestId ? `${baseUrl}/table-pass/${hostGuestId}` : `${baseUrl}/booking/${bookingId}`;
      const bookingUrl = `${baseUrl}/booking/${bookingId}`;
      const venueUrl = venue?.slug ? `${baseUrl}/venue/${venue.slug}` : "";

      await sendTemplateEmail(
        "table_booking_confirmed",
        booking.guest_email,
        booking.attendee_id,
        {
          guest_name: booking.guest_name,
          event_name: event?.name || "Event",
          event_date: eventDate,
          event_time: startTime
            ? startTime.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: eventTimezone,
              })
            : "TBA",
          venue_name: venue?.name || "",
          venue_address: venue?.address || "",
          venue_url: venueUrl,
          table_name: table?.name || "Table",
          zone_name: table?.zone?.name || "General",
          party_size: booking.party_size?.toString() || "1",
          minimum_spend: "0",
          currency_symbol: currencySymbol,
          confirmation_number: bookingId.split("-")[0].toUpperCase(),
          pass_url: passUrl,
          booking_url: bookingUrl,
        },
        {
          event_id: event?.id,
          booking_id: bookingId,
        }
      );

    } catch (emailError) {
      // Don't fail if email fails
    }
  } catch (error) {
    throw error;
  }
}
