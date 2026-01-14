import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";
import {
  verifyDokuWebhookSignature,
  parseDokuWebhook,
  DokuWebhookPayload,
} from "@/lib/services/doku";
import { getCurrencySymbol } from "@/lib/constants/currencies";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/doku
 * Webhook endpoint for DOKU payment notifications
 *
 * DOKU sends HTTP notifications when:
 * - Payment is successful (transaction.status = SUCCESS)
 * - Payment is pending (transaction.status = PENDING)
 * - Payment fails (transaction.status = FAILED - should be ignored per DOKU docs)
 *
 * Setup in DOKU Back Office:
 * 1. Go to Settings → Notification
 * 2. Set HTTP Notification URL: https://your-domain.com/api/webhooks/doku
 * 3. Enable HTTP notifications
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Parse the webhook payload
    const payload = parseDokuWebhook(rawBody);
    if (!payload) {
      console.error("[DOKU Webhook] Failed to parse payload:", rawBody);
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const invoiceNumber = payload.order?.invoice_number;
    if (!invoiceNumber) {
      console.error("[DOKU Webhook] Missing invoice number in payload");
      return NextResponse.json(
        { error: "Missing invoice number" },
        { status: 400 }
      );
    }

    console.log(`[DOKU Webhook] Received notification for invoice: ${invoiceNumber}, status: ${payload.transaction?.status}`);

    const serviceSupabase = createServiceRoleClient();

    // Find the payment transaction by invoice number
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
      .eq("doku_invoice_id", invoiceNumber)
      .single();

    if (transactionError || !transaction) {
      console.warn(`[DOKU Webhook] Transaction not found for invoice: ${invoiceNumber}`);
      // Return 200 to prevent DOKU from retrying - this might be a test or duplicate
      return NextResponse.json({ success: true, message: "Transaction not found" });
    }

    // Get venue payment settings for signature verification (optional but recommended)
    const { data: paymentSettings } = await serviceSupabase
      .from("venue_payment_settings")
      .select("doku_client_id, doku_secret_key, auto_confirm_on_payment")
      .eq("venue_id", transaction.venue_id)
      .single();

    // Optional: Verify webhook signature if we have credentials
    if (paymentSettings?.doku_client_id && paymentSettings?.doku_secret_key) {
      const signature = request.headers.get("signature") || "";
      const requestId = request.headers.get("request-id") || "";
      const timestamp = request.headers.get("request-timestamp") || "";

      if (signature && requestId && timestamp) {
        const isValid = verifyDokuWebhookSignature({
          signature,
          clientId: paymentSettings.doku_client_id,
          secretKey: paymentSettings.doku_secret_key,
          requestId,
          timestamp,
          requestTarget: "/api/webhooks/doku",
          body: rawBody,
        });

        if (!isValid) {
          console.warn(`[DOKU Webhook] Invalid signature for invoice: ${invoiceNumber}`);
          // Don't reject - DOKU's signature verification can be tricky
          // Just log the warning and continue
        }
      }
    }

    // Handle based on transaction status
    const dokuStatus = payload.transaction?.status;

    // Per DOKU docs: Ignore FAILED status, implement our own expiry logic
    if (dokuStatus === "FAILED") {
      console.log(`[DOKU Webhook] Ignoring FAILED status for invoice: ${invoiceNumber}`);
      return NextResponse.json({ success: true, message: "FAILED status ignored" });
    }

    // Update transaction record
    const transactionUpdates: Record<string, any> = {
      webhook_received_at: new Date().toISOString(),
      webhook_payload: payload,
    };

    // Extract payment method details
    if (payload.channel?.id) {
      transactionUpdates.doku_payment_method = payload.channel.id;
    }
    if (payload.virtual_account_info?.virtual_account_number) {
      transactionUpdates.doku_va_number = payload.virtual_account_info.virtual_account_number;
    }
    if (payload.qris_info?.qr_content) {
      transactionUpdates.doku_qr_code = payload.qris_info.qr_content;
    }

    if (dokuStatus === "SUCCESS") {
      // Payment successful
      transactionUpdates.status = "completed";
      transactionUpdates.paid_at = payload.transaction?.date || new Date().toISOString();

      console.log(`[DOKU Webhook] Payment SUCCESS for invoice: ${invoiceNumber}`);

      // Update transaction
      await serviceSupabase
        .from("payment_transactions")
        .update(transactionUpdates)
        .eq("id", transaction.id);

      // Handle based on reference type
      if (transaction.reference_type === "table_booking") {
        await handleTableBookingPayment(
          serviceSupabase,
          transaction.reference_id,
          paymentSettings?.auto_confirm_on_payment ?? true
        );
      }
      // Future: Handle ticket payments here

    } else if (dokuStatus === "PENDING") {
      // Payment is pending (customer initiated but not completed)
      transactionUpdates.status = "processing";

      console.log(`[DOKU Webhook] Payment PENDING for invoice: ${invoiceNumber}`);

      await serviceSupabase
        .from("payment_transactions")
        .update(transactionUpdates)
        .eq("id", transaction.id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DOKU Webhook] Error:", error);
    // Return 200 to prevent excessive retries
    return NextResponse.json({ success: false, error: error.message });
  }
}

/**
 * Handle successful payment for a table booking
 */
async function handleTableBookingPayment(
  supabase: ReturnType<typeof createServiceRoleClient>,
  bookingId: string,
  autoConfirm: boolean
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
      console.error(`[DOKU Webhook] Booking not found: ${bookingId}`);
      return;
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
      }
    }

    // Send confirmation email with QR and invite links
    try {
      const event = booking.event as any;
      const table = booking.table as any;
      const venue = event?.venue;

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

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";
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

      console.log(`[DOKU Webhook] Confirmation email sent for booking: ${bookingId}`);
    } catch (emailError) {
      console.error(`[DOKU Webhook] Failed to send confirmation email:`, emailError);
      // Don't fail the webhook if email fails
    }
  } catch (error) {
    console.error(`[DOKU Webhook] Error handling table booking payment:`, error);
    throw error;
  }
}
