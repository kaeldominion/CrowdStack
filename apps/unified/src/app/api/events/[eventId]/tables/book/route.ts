import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";
import { getCurrencySymbol } from "@/lib/constants/currencies";
import {
  DokuService,
  formatDokuAmount,
  generateBookingInvoiceNumber,
} from "@/lib/services/doku";

export const dynamic = "force-dynamic";

interface BookTableRequest {
  table_id: string;
  guest_name: string;
  guest_email: string;
  guest_whatsapp: string;
  party_size?: number; // Optional - will default to table's effective capacity
  special_requests?: string;
}

interface EventWithVenue {
  id: string;
  name: string;
  slug: string;
  status: string;
  start_time: string;
  timezone: string | null;
  table_booking_mode: string | null;
  venue_id: string;
  currency: string | null;
  venue: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    currency: string | null;
  } | null;
}

interface TableWithZone {
  id: string;
  name: string;
  capacity: number;
  minimum_spend: number | null;
  deposit_amount: number | null;
  is_active: boolean;
  zone: {
    id: string;
    name: string;
  } | null;
}

/**
 * POST /api/events/[eventId]/tables/book
 * Submit a table booking request
 *
 * Query params:
 * - ref: promoter referral code (optional)
 * - code: direct booking link code (optional)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const serviceSupabase = createServiceRoleClient();
    const body: BookTableRequest = await request.json();

    const { searchParams } = new URL(request.url);
    const refCode = searchParams.get("ref");
    const linkCode = searchParams.get("code");

    // Validate required fields
    if (!body.table_id || !body.guest_name || !body.guest_email || !body.guest_whatsapp) {
      return NextResponse.json(
        { error: "Missing required fields: table_id, guest_name, guest_email, guest_whatsapp" },
        { status: 400 }
      );
    }

    // Party size will be determined by table's effective capacity (see below)

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.guest_email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get event details
    const { data: eventData, error: eventError } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        status,
        start_time,
        timezone,
        table_booking_mode,
        venue_id,
        currency,
        venue:venues(
          id,
          name,
          address,
          city,
          state,
          country,
          currency
        )
      `)
      .eq("id", params.eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Type assertion to fix Supabase's nested relation type inference
    const event = eventData as unknown as EventWithVenue;

    if (event.status !== "published") {
      return NextResponse.json(
        { error: "Event is not available for bookings" },
        { status: 400 }
      );
    }

    // Check booking mode access
    const bookingMode = event.table_booking_mode || "disabled";
    let isDirectLinkBooking = false;

    if (linkCode) {
      // Verify the booking link
      const { data: bookingLink } = await serviceSupabase
        .from("table_booking_links")
        .select("id, table_id, is_active, expires_at")
        .eq("code", linkCode)
        .eq("event_id", params.eventId)
        .single();

      if (bookingLink && bookingLink.is_active) {
        const isExpired = bookingLink.expires_at && new Date(bookingLink.expires_at) < new Date();
        if (!isExpired) {
          isDirectLinkBooking = true;
          // If link specifies a table, ensure it matches
          if (bookingLink.table_id && bookingLink.table_id !== body.table_id) {
            return NextResponse.json(
              { error: "This booking link is for a specific table" },
              { status: 400 }
            );
          }
        }
      }
    }

    if (!isDirectLinkBooking) {
      if (bookingMode === "disabled") {
        return NextResponse.json(
          { error: "Table booking is not enabled for this event" },
          { status: 400 }
        );
      }

      if (bookingMode === "promoter_only" && !refCode) {
        return NextResponse.json(
          { error: "Table booking requires a promoter referral link" },
          { status: 400 }
        );
      }
    }

    // Get table details
    const { data: tableData, error: tableError } = await serviceSupabase
      .from("venue_tables")
      .select(`
        id,
        name,
        capacity,
        minimum_spend,
        deposit_amount,
        is_active,
        zone:table_zones(id, name)
      `)
      .eq("id", body.table_id)
      .eq("venue_id", event.venue_id)
      .single();

    if (tableError || !tableData) {
      return NextResponse.json(
        { error: "Table not found" },
        { status: 404 }
      );
    }

    // Type assertion to fix Supabase's nested relation type inference
    const table = tableData as unknown as TableWithZone;

    console.log("[Table Book] Table data from venue_tables:", {
      tableId: table.id,
      tableName: table.name,
      deposit_amount: table.deposit_amount,
      minimum_spend: table.minimum_spend,
      capacity: table.capacity,
    });

    if (!table.is_active) {
      return NextResponse.json(
        { error: "This table is not available" },
        { status: 400 }
      );
    }

    // Check event-specific availability and overrides
    const { data: availability, error: availabilityError } = await serviceSupabase
      .from("event_table_availability")
      .select("is_available, override_minimum_spend, override_deposit, override_capacity")
      .eq("event_id", params.eventId)
      .eq("table_id", body.table_id)
      .single();

    console.log("[Table Book] Availability check:", {
      eventId: params.eventId,
      tableId: body.table_id,
      hasAvailability: !!availability,
      availabilityError: availabilityError?.code, // PGRST116 means no row found (OK)
      isAvailable: availability?.is_available,
      overrideDeposit: availability?.override_deposit,
      overrideMinSpend: availability?.override_minimum_spend,
      overrideCapacity: availability?.override_capacity,
    });

    if (availability && availability.is_available === false) {
      return NextResponse.json(
        { error: "This table is not available for this event" },
        { status: 400 }
      );
    }

    // Calculate effective values (using event overrides if set, otherwise table defaults)
    const effectiveMinimumSpend = availability?.override_minimum_spend ?? table.minimum_spend;
    const effectiveDeposit = availability?.override_deposit ?? table.deposit_amount;
    const effectiveCapacity = availability?.override_capacity ?? table.capacity;

    // Party size is set to the table's effective capacity (guests don't choose)
    const partySize = effectiveCapacity;

    console.log("[Table Book] Effective values:", {
      tableDeposit: table.deposit_amount,
      overrideDeposit: availability?.override_deposit,
      effectiveDeposit,
      tableMinSpend: table.minimum_spend,
      overrideMinSpend: availability?.override_minimum_spend,
      effectiveMinimumSpend,
      tableCapacity: table.capacity,
      overrideCapacity: availability?.override_capacity,
      effectiveCapacity,
      partySize,
    });

    // Resolve promoter attribution
    let promoterId: string | null = null;
    let resolvedRefCode: string | null = refCode;

    if (refCode) {
      // Check if ref is a promoter ID (UUID format)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(refCode)) {
        const { data: promoter } = await serviceSupabase
          .from("promoters")
          .select("id")
          .eq("id", refCode)
          .single();

        if (promoter) {
          promoterId = promoter.id;
        } else {
          // Check if it's a user ID who is also a promoter
          const { data: userPromoter } = await serviceSupabase
            .from("promoters")
            .select("id")
            .eq("created_by", refCode)
            .single();

          if (userPromoter) {
            promoterId = userPromoter.id;
          }
        }
      }
    }

    // Try to link to existing attendee
    let attendeeId: string | null = null;

    // If user is authenticated, find their attendee record
    if (user?.id) {
      const { data: userAttendee } = await serviceSupabase
        .from("attendees")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (userAttendee) {
        attendeeId = userAttendee.id;
      }
    }

    // If no attendee found by user, try by email
    if (!attendeeId) {
      const { data: emailAttendee } = await serviceSupabase
        .from("attendees")
        .select("id")
        .eq("email", body.guest_email)
        .single();

      if (emailAttendee) {
        attendeeId = emailAttendee.id;
      }
    }

    // Check if user already has a pending or confirmed booking for this table at this event
    // This prevents duplicate requests from the same person
    const { data: existingBooking } = await serviceSupabase
      .from("table_bookings")
      .select("id, status")
      .eq("event_id", params.eventId)
      .eq("table_id", body.table_id)
      .eq("guest_email", body.guest_email)
      .in("status", ["pending", "confirmed"])
      .single();

    if (existingBooking) {
      return NextResponse.json(
        {
          error: existingBooking.status === "pending"
            ? "You already have a pending request for this table. Please wait for venue confirmation."
            : "You already have a confirmed booking for this table."
        },
        { status: 400 }
      );
    }

    // Create the booking
    // Set payment_status based on whether deposit is required
    const initialPaymentStatus = effectiveDeposit && effectiveDeposit > 0 ? "pending" : "not_required";

    const { data: booking, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .insert({
        event_id: params.eventId,
        table_id: body.table_id,
        attendee_id: attendeeId,
        guest_name: body.guest_name,
        guest_email: body.guest_email,
        guest_whatsapp: body.guest_whatsapp,
        party_size: partySize,
        special_requests: body.special_requests || null,
        promoter_id: promoterId,
        referral_code: resolvedRefCode,
        status: "pending",
        minimum_spend: effectiveMinimumSpend,
        deposit_required: effectiveDeposit,
        payment_status: initialPaymentStatus,
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      return NextResponse.json(
        { error: "Failed to create booking" },
        { status: 500 }
      );
    }

    // Send confirmation email
    try {
      const currency = event.currency || event.venue?.currency || "USD";
      const currencySymbol = getCurrencySymbol(currency);

      // Format date/time
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

      // Build deposit instructions
      const depositInstructions = effectiveDeposit
        ? "Please contact the venue to arrange your deposit payment. Your booking will be confirmed once the deposit is received."
        : "";

      await sendTemplateEmail(
        "table_booking_request",
        body.guest_email,
        attendeeId,
        {
          guest_name: body.guest_name,
          event_name: event.name,
          event_date: eventDate,
          table_name: table.name,
          zone_name: table.zone?.name || "General",
          party_size: partySize.toString(),
          minimum_spend: effectiveMinimumSpend?.toFixed(2) || "0",
          currency_symbol: currencySymbol,
          deposit_required: effectiveDeposit ? "true" : "",
          deposit_amount: effectiveDeposit?.toFixed(2) || "0",
          deposit_instructions: depositInstructions,
        },
        {
          event_id: params.eventId,
          booking_id: booking.id,
        }
      );
    } catch (emailError) {
      console.error("Failed to send booking confirmation email:", emailError);
      // Don't fail the booking if email fails
    }

    // Build booking URL for payment/status page
    // Use relative URL for same-site navigation (returned to frontend)
    // DOKU callbacks below use baseUrl since they need absolute URLs for external redirect
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";
    const bookingUrl = `/booking/${booking.id}`;

    // If deposit is required, check if DOKU is enabled and create checkout session
    let paymentInfo: {
      payment_url: string;
      expires_at: string;
      invoice_number: string;
      doku_enabled: boolean;
    } | null = null;

    if (effectiveDeposit && effectiveDeposit > 0) {
      try {
        // Check if DOKU is enabled for this venue
        const { data: paymentSettings } = await serviceSupabase
          .from("venue_payment_settings")
          .select("*")
          .eq("venue_id", event.venue_id)
          .single();

        if (paymentSettings?.doku_enabled && paymentSettings.doku_client_id && paymentSettings.doku_secret_key) {
          // Create DOKU checkout session
          const dokuService = new DokuService({
            clientId: paymentSettings.doku_client_id,
            secretKey: paymentSettings.doku_secret_key,
            environment: paymentSettings.doku_environment as "sandbox" | "production",
          });

          const invoiceNumber = generateBookingInvoiceNumber(booking.id);
          const callbackUrl = `${baseUrl}/booking/${booking.id}/payment-complete`;
          const callbackUrlCancel = `${baseUrl}/booking/${booking.id}/payment-cancelled`;
          const paymentDueMinutes = (paymentSettings.payment_expiry_hours || 24) * 60;

          const checkoutResult = await dokuService.createCheckout({
            order: {
              amount: formatDokuAmount(effectiveDeposit),
              invoiceNumber,
              callbackUrl,
              callbackUrlCancel,
              lineItems: [
                {
                  name: `Table Deposit - ${table.name} at ${event.name}`,
                  price: formatDokuAmount(effectiveDeposit),
                  quantity: 1,
                },
              ],
            },
            customer: {
              name: body.guest_name,
              email: body.guest_email,
              phone: body.guest_whatsapp || undefined,
            },
            payment: {
              paymentDueDate: paymentDueMinutes,
            },
          });

          if (checkoutResult.success) {
            // Calculate expiry timestamp
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + paymentDueMinutes);

            // Create payment transaction record
            const { data: transaction } = await serviceSupabase
              .from("payment_transactions")
              .insert({
                venue_id: event.venue_id,
                reference_type: "table_booking",
                reference_id: booking.id,
                amount: effectiveDeposit,
                currency: event.currency || event.venue?.currency || "IDR",
                doku_invoice_id: invoiceNumber,
                doku_payment_url: checkoutResult.paymentUrl,
                status: "pending",
                expires_at: expiresAt.toISOString(),
              })
              .select()
              .single();

            // Update booking with payment transaction ID
            if (transaction) {
              await serviceSupabase
                .from("table_bookings")
                .update({
                  payment_transaction_id: transaction.id,
                  payment_status: "pending",
                })
                .eq("id", booking.id);
            }

            paymentInfo = {
              payment_url: checkoutResult.paymentUrl,
              expires_at: expiresAt.toISOString(),
              invoice_number: invoiceNumber,
              doku_enabled: true,
            };
          }
        }
      } catch (paymentError) {
        console.error("Failed to create DOKU checkout:", paymentError);
        // Don't fail the booking if payment session creation fails
        // User can still pay later from the booking page
      }
    }

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        table_name: table.name,
        zone_name: table.zone?.name,
        minimum_spend: effectiveMinimumSpend,
        deposit_required: effectiveDeposit,
        party_size: partySize,
        booking_url: bookingUrl,
      },
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
      },
      payment: paymentInfo,
      message: effectiveDeposit
        ? "Your table booking request has been received. Please pay your deposit to confirm."
        : "Your table booking request has been received. We will contact you shortly to confirm.",
    });
  } catch (error: any) {
    console.error("Error in table booking:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process booking" },
      { status: 500 }
    );
  }
}
