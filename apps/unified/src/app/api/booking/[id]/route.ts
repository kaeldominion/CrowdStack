import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getCurrencySymbol } from "@/lib/constants/currencies";
import { generateTablePartyToken } from "@crowdstack/shared/qr/table-party";

// CRITICAL: Force dynamic rendering and disable all caching
// This ensures fresh data is always fetched from the database
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * GET /api/booking/[id]
 * Get booking details for the guest payment flow
 *
 * This is a public endpoint - anyone with the booking ID can view the status
 * (Booking IDs are UUIDs and not easily guessable)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;

    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // CRITICAL: Use a simple direct query for status fields to avoid any PostgREST
    // field collision issues with nested relations (events also has a status column).
    // This is a known PostgREST limitation when both parent and nested tables have
    // columns with the same name. By fetching these fields separately, we ensure
    // we get the correct values from table_bookings, not events.
    // Also fetch updated_at for debugging and cache invalidation purposes.
    const { data: directBooking, error: directError } = await serviceSupabase
      .from("table_bookings")
      .select("id, status, payment_status, updated_at")
      .eq("id", bookingId)
      .single();

    console.log(`[Booking API] Direct query result for ${bookingId}:`, JSON.stringify(directBooking, null, 2));
    if (directError) {
      console.error(`[Booking API] Direct query error:`, directError);
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Store the authoritative status values from direct query
    const authoritativeStatus = directBooking.status;
    const authoritativePaymentStatus = directBooking.payment_status;

    // Get booking with related data
    // NOTE: We intentionally do NOT select status/payment_status here to avoid
    // PostgREST field collision issues with events.status. We use the authoritative
    // values from the direct query above instead.
    const { data: booking, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        guest_name,
        guest_email,
        guest_whatsapp,
        party_size,
        deposit_required,
        minimum_spend,
        special_requests,
        created_at,
        payment_transaction_id,
        event:events(
          id,
          name,
          slug,
          start_time,
          timezone,
          cover_image_url,
          currency,
          venue_id,
          venue:venues(
            id,
            name,
            slug,
            address,
            city,
            state,
            country,
            currency
          )
        ),
        table:venue_tables(
          id,
          name,
          zone:table_zones(
            id,
            name
          )
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("[Booking API] Error fetching booking:", bookingError);
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Log the authoritative values - these are the source of truth
    console.log(`[Booking API] Authoritative status values:`, {
      status: authoritativeStatus,
      payment_status: authoritativePaymentStatus,
      updated_at: directBooking.updated_at,
      bookingId,
    });

    // IMPORTANT: Always use the authoritative values from the direct query
    // The nested query with events() relation can sometimes have field collision issues
    console.log(`[Booking API] Returning AUTHORITATIVE status: ${authoritativeStatus}, payment_status: ${authoritativePaymentStatus}`);

    // Type assertions for nested data
    const event = booking.event as any;
    const table = booking.table as any;
    const venue = event?.venue;

    // Get payment transaction if exists
    let paymentInfo = null;
    if (booking.payment_transaction_id) {
      const { data: transaction } = await serviceSupabase
        .from("payment_transactions")
        .select("id, status, doku_payment_url, expires_at")
        .eq("id", booking.payment_transaction_id)
        .single();

      if (transaction) {
        paymentInfo = {
          transaction_id: transaction.id,
          status: transaction.status,
          payment_url: transaction.doku_payment_url,
          expires_at: transaction.expires_at,
        };
      }
    }

    // Check if DOKU is enabled and get manual payment fallback info for this venue
    let dokuEnabled = false;
    let manualPaymentEnabled = false;
    let manualPaymentInstructions = "";
    if (venue?.id) {
      const { data: paymentSettings } = await serviceSupabase
        .from("venue_payment_settings")
        .select("doku_enabled, manual_payment_enabled, manual_payment_instructions")
        .eq("venue_id", venue.id)
        .single();

      dokuEnabled = paymentSettings?.doku_enabled ?? false;
      manualPaymentEnabled = paymentSettings?.manual_payment_enabled ?? false;
      manualPaymentInstructions = paymentSettings?.manual_payment_instructions || "";
    }

    // Determine currency
    const currency = event?.currency || venue?.currency || "IDR";
    const currencySymbol = getCurrencySymbol(currency);

    // For confirmed/paid bookings, fetch/create party data
    // Use authoritative status values from direct query
    let partyData = null;
    if (authoritativeStatus === "confirmed" || authoritativePaymentStatus === "paid") {
      // Get existing party guests
      const { data: partyGuests } = await serviceSupabase
        .from("table_party_guests")
        .select("id, guest_name, guest_email, status, is_host, invite_token, qr_token, checked_in")
        .eq("booking_id", bookingId)
        .order("is_host", { ascending: false })
        .order("created_at", { ascending: true });

      // Check if host guest record exists
      let hostGuest = partyGuests?.find(g => g.is_host);

      // If no host record, create one or upgrade existing guest to host
      if (!hostGuest) {
        // First check if there's already a guest with the host's email
        const existingGuest = partyGuests?.find(
          g => g.guest_email?.toLowerCase() === booking.guest_email?.toLowerCase()
        );

        if (existingGuest) {
          // Upgrade existing guest to host
          const { error: upgradeError } = await serviceSupabase
            .from("table_party_guests")
            .update({
              is_host: true,
              status: "joined",
              joined_at: existingGuest.status !== "joined" ? new Date().toISOString() : undefined,
            })
            .eq("id", existingGuest.id);

          if (!upgradeError) {
            // Generate QR token if missing
            if (!existingGuest.qr_token) {
              const qrToken = generateTablePartyToken(existingGuest.id, bookingId, event?.id);
              await serviceSupabase
                .from("table_party_guests")
                .update({ qr_token: qrToken })
                .eq("id", existingGuest.id);
              existingGuest.qr_token = qrToken;
            }
            existingGuest.is_host = true;
            hostGuest = existingGuest;
          }
        } else {
          // Create new host guest record
          const { data: newHostGuest, error: hostError } = await serviceSupabase
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
            .select("id, guest_name, guest_email, status, is_host, invite_token, qr_token, checked_in")
            .single();

          if (!hostError && newHostGuest) {
            // Generate QR token for host
            const qrToken = generateTablePartyToken(
              newHostGuest.id,
              bookingId,
              event?.id
            );

            // Update with QR token
            await serviceSupabase
              .from("table_party_guests")
              .update({ qr_token: qrToken })
              .eq("id", newHostGuest.id);

            hostGuest = { ...newHostGuest, qr_token: qrToken };
          }
        }
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.com";

      partyData = {
        host: hostGuest ? {
          id: hostGuest.id,
          name: hostGuest.guest_name,
          pass_url: `${baseUrl}/table-pass/${hostGuest.id}`,
          checked_in: hostGuest.checked_in,
        } : null,
        guests: (partyGuests || []).filter(g => !g.is_host).map(g => ({
          id: g.id,
          name: g.guest_name,
          email: g.guest_email,
          status: g.status,
          checked_in: g.checked_in,
        })),
        invite_url: hostGuest ? `${baseUrl}/join-table/${hostGuest.invite_token}` : null,
        total_joined: (partyGuests || []).filter(g => g.status === "joined").length,
        party_size: booking.party_size,
      };
    }

    // Look up attendee to get full name (first + last)
    let guestFullName = booking.guest_name;
    if (booking.guest_email) {
      const { data: attendee } = await serviceSupabase
        .from("attendees")
        .select("name, surname")
        .eq("email", booking.guest_email)
        .single();
      
      if (attendee && attendee.name) {
        guestFullName = attendee.surname 
          ? `${attendee.name} ${attendee.surname}`
          : attendee.name;
      }
    }

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          // CRITICAL: Use authoritative status from direct query to avoid PostgREST field collision
          status: authoritativeStatus,
          payment_status: authoritativePaymentStatus || "not_required",
          guest_name: guestFullName, // Use full name from attendee lookup
          guest_email: booking.guest_email,
          party_size: booking.party_size,
          deposit_required: booking.deposit_required,
          minimum_spend: booking.minimum_spend,
          special_requests: booking.special_requests,
          created_at: booking.created_at,
          updated_at: directBooking.updated_at, // Useful for debugging and cache invalidation
        },
        event: {
          id: event?.id,
          name: event?.name,
          slug: event?.slug,
          start_time: event?.start_time,
          timezone: event?.timezone,
          cover_image: event?.cover_image_url,
        },
        venue: {
          id: venue?.id,
          name: venue?.name,
          address: venue?.address,
          city: venue?.city,
        },
        table: {
          id: table?.id,
          name: table?.name,
          zone_name: table?.zone?.name,
        },
        payment: {
          ...paymentInfo,
          doku_enabled: dokuEnabled,
          manual_payment_enabled: manualPaymentEnabled,
          manual_payment_instructions: manualPaymentInstructions,
        },
        party: partyData,
        currency,
        currencySymbol,
      },
      {
        headers: {
          // Aggressive cache prevention for all layers (browser, CDN, proxy)
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          // Prevent CDN/edge caching (Vercel, Cloudflare, etc.)
          'Surrogate-Control': 'no-store',
          'CDN-Cache-Control': 'no-store',
          // Vary on everything to prevent any response caching
          'Vary': '*',
          // Add timestamp to prove fresh response
          'X-Response-Time': new Date().toISOString(),
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch booking" },
      { status: 500 }
    );
  }
}
