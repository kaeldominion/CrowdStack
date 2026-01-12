import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getCurrencySymbol } from "@/lib/constants/currencies";
import { generateTablePartyToken } from "@crowdstack/shared/qr/table-party";

export const dynamic = "force-dynamic";

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

    // First, do a simple direct query to verify the status field
    const { data: directBooking, error: directError } = await serviceSupabase
      .from("table_bookings")
      .select("id, status, payment_status, deposit_received, updated_at")
      .eq("id", bookingId)
      .single();
    
    console.log(`[Booking API] Direct query result for ${bookingId}:`, JSON.stringify(directBooking, null, 2));
    if (directError) {
      console.error(`[Booking API] Direct query error:`, directError);
    }

    // Get booking with related data
    const { data: booking, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        status,
        payment_status,
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

    // Log the actual status values for debugging - log the FULL booking object to see everything
    console.log(`[Booking API] Full booking object from DB query:`, JSON.stringify({
      id: booking.id,
      status: booking.status,
      payment_status: booking.payment_status,
      deposit_received: (booking as any).deposit_received,
      updated_at: (booking as any).updated_at,
    }, null, 2));
    console.log(`[Booking API] Raw booking.status type:`, typeof booking.status, `value:`, booking.status);
    
    // Also log what we're about to return
    const responseStatus = booking.status;
    const responsePaymentStatus = booking.payment_status || "not_required";
    console.log(`[Booking API] Returning - status: ${responseStatus}, payment_status: ${responsePaymentStatus}`);

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

    // Check if DOKU is enabled for this venue
    let dokuEnabled = false;
    if (venue?.id) {
      const { data: paymentSettings } = await serviceSupabase
        .from("venue_payment_settings")
        .select("doku_enabled")
        .eq("venue_id", venue.id)
        .single();

      dokuEnabled = paymentSettings?.doku_enabled ?? false;
    }

    // Determine currency
    const currency = event?.currency || venue?.currency || "IDR";
    const currencySymbol = getCurrencySymbol(currency);

    // For confirmed/paid bookings, fetch/create party data
    let partyData = null;
    if (booking.status === "confirmed" || booking.payment_status === "paid") {
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

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          status: booking.status,
          payment_status: booking.payment_status || "not_required",
          guest_name: booking.guest_name,
          guest_email: booking.guest_email,
          party_size: booking.party_size,
          deposit_required: booking.deposit_required,
          minimum_spend: booking.minimum_spend,
          special_requests: booking.special_requests,
          created_at: booking.created_at,
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
        },
        party: partyData,
        currency,
        currencySymbol,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
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
