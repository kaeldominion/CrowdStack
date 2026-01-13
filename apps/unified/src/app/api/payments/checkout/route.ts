import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import {
  DokuService,
  formatDokuAmount,
  generateBookingInvoiceNumber,
} from "@/lib/services/doku";

export const dynamic = "force-dynamic";

interface CreateCheckoutRequest {
  booking_id: string;
}

/**
 * POST /api/payments/checkout
 * Create a DOKU checkout session for a table booking
 *
 * This endpoint:
 * 1. Validates the booking exists and has a deposit required
 * 2. Gets the venue's DOKU credentials
 * 3. Creates a checkout session with DOKU
 * 4. Creates a payment_transaction record
 * 5. Returns the payment URL
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateCheckoutRequest = await request.json();

    if (!body.booking_id) {
      return NextResponse.json(
        { error: "Missing required field: booking_id" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get booking with event and venue details
    const { data: booking, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        event_id,
        table_id,
        guest_name,
        guest_email,
        guest_whatsapp,
        party_size,
        deposit_required,
        minimum_spend,
        status,
        payment_status,
        payment_transaction_id,
        event:events(
          id,
          name,
          slug,
          venue_id,
          currency,
          venue:venues(
            id,
            name,
            currency
          )
        ),
        table:venue_tables(
          id,
          name,
          zone:table_zones(name)
        )
      `)
      .eq("id", body.booking_id)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError);
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if deposit is required
    if (!booking.deposit_required || booking.deposit_required <= 0) {
      return NextResponse.json(
        { error: "No deposit required for this booking" },
        { status: 400 }
      );
    }

    // Check if already paid
    if (booking.payment_status === "paid") {
      return NextResponse.json(
        { error: "This booking has already been paid" },
        { status: 400 }
      );
    }

    // Check if there's already a pending payment transaction
    if (booking.payment_transaction_id) {
      const { data: existingTransaction } = await serviceSupabase
        .from("payment_transactions")
        .select("id, status, doku_payment_url, expires_at")
        .eq("id", booking.payment_transaction_id)
        .single();

      if (existingTransaction) {
        const isExpired = existingTransaction.expires_at &&
          new Date(existingTransaction.expires_at) < new Date();

        if (existingTransaction.status === "pending" && !isExpired && existingTransaction.doku_payment_url) {
          // Return existing payment URL
          return NextResponse.json({
            success: true,
            payment_url: existingTransaction.doku_payment_url,
            transaction_id: existingTransaction.id,
            expires_at: existingTransaction.expires_at,
            message: "Existing payment session found",
          });
        }
      }
    }

    // Type assertions for nested data
    const event = booking.event as any;
    const table = booking.table as any;
    const venue = event?.venue;

    console.log("[Checkout] Booking lookup:", {
      bookingId: booking.id,
      eventId: event?.id,
      eventName: event?.name,
      venueId: venue?.id,
      venueName: venue?.name,
    });

    if (!venue?.id) {
      return NextResponse.json(
        { error: "Venue not found for this booking" },
        { status: 400 }
      );
    }

    // Get venue payment settings
    const { data: paymentSettings, error: settingsError } = await serviceSupabase
      .from("venue_payment_settings")
      .select("*")
      .eq("venue_id", venue.id)
      .single();

    console.log("[Checkout] Payment settings lookup:", {
      venueId: venue.id,
      foundSettings: !!paymentSettings,
      settingsError: settingsError?.message,
      dokuEnabled: paymentSettings?.doku_enabled,
    });

    if (settingsError || !paymentSettings) {
      return NextResponse.json(
        { error: "Payment settings not configured for this venue" },
        { status: 400 }
      );
    }

    if (!paymentSettings.doku_enabled) {
      return NextResponse.json(
        { error: "Online payments are not enabled for this venue" },
        { status: 400 }
      );
    }

    if (!paymentSettings.doku_client_id || !paymentSettings.doku_secret_key) {
      return NextResponse.json(
        { error: "Payment gateway credentials not configured" },
        { status: 400 }
      );
    }

    console.log("[Checkout] DOKU settings:", {
      venueId: venue.id,
      clientIdLength: paymentSettings.doku_client_id?.length,
      clientIdPrefix: paymentSettings.doku_client_id?.substring(0, 10) + "...",
      hasSecretKey: !!paymentSettings.doku_secret_key,
      secretKeyLength: paymentSettings.doku_secret_key?.length,
      environment: paymentSettings.doku_environment,
    });

    // Create DOKU service
    const dokuService = new DokuService({
      clientId: paymentSettings.doku_client_id,
      secretKey: paymentSettings.doku_secret_key,
      environment: paymentSettings.doku_environment as "sandbox" | "production",
    });

    // Generate invoice number
    const invoiceNumber = generateBookingInvoiceNumber(booking.id);

    // Build callback URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";
    const callbackUrl = `${baseUrl}/booking/${booking.id}/payment-complete`;
    const callbackUrlCancel = `${baseUrl}/booking/${booking.id}/payment-cancelled`;

    // Calculate payment expiry (in minutes)
    const paymentDueMinutes = (paymentSettings.payment_expiry_hours || 24) * 60;

    // Create checkout session
    const checkoutResult = await dokuService.createCheckout({
      order: {
        amount: formatDokuAmount(booking.deposit_required),
        invoiceNumber,
        callbackUrl,
        callbackUrlCancel,
        lineItems: [
          {
            name: `Table Deposit - ${table?.name || "Table"} at ${event?.name || "Event"}`,
            price: formatDokuAmount(booking.deposit_required),
            quantity: 1,
          },
        ],
      },
      customer: {
        name: booking.guest_name,
        email: booking.guest_email,
        phone: booking.guest_whatsapp || undefined,
      },
      payment: {
        paymentDueDate: paymentDueMinutes,
      },
    });

    if (!checkoutResult.success) {
      console.error("DOKU checkout creation failed:", checkoutResult.error);
      return NextResponse.json(
        { error: `Payment gateway error: ${checkoutResult.error}` },
        { status: 500 }
      );
    }

    // Calculate expiry timestamp
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + paymentDueMinutes);

    // Create payment transaction record
    const { data: transaction, error: transactionError } = await serviceSupabase
      .from("payment_transactions")
      .insert({
        venue_id: venue.id,
        reference_type: "table_booking",
        reference_id: booking.id,
        amount: booking.deposit_required,
        currency: event?.currency || venue?.currency || "IDR",
        doku_invoice_id: invoiceNumber,
        doku_payment_url: checkoutResult.paymentUrl,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Failed to create payment transaction:", transactionError);
      return NextResponse.json(
        { error: "Failed to create payment record" },
        { status: 500 }
      );
    }

    // Update booking with payment transaction ID and status
    await serviceSupabase
      .from("table_bookings")
      .update({
        payment_transaction_id: transaction.id,
        payment_status: "pending",
      })
      .eq("id", booking.id);

    return NextResponse.json({
      success: true,
      payment_url: checkoutResult.paymentUrl,
      transaction_id: transaction.id,
      invoice_number: invoiceNumber,
      expires_at: expiresAt.toISOString(),
      amount: booking.deposit_required,
      currency: event?.currency || venue?.currency || "IDR",
    });
  } catch (error: any) {
    console.error("Error creating payment checkout:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment session" },
      { status: 500 }
    );
  }
}
