import { notFound } from "next/navigation";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getCurrencySymbol } from "@/lib/constants/currencies";
import { generateQRPassToken } from "@crowdstack/shared/qr/generate";
import { BookingPageClient, BookingData } from "./BookingPageClient";
import Link from "next/link";
import { Button } from "@crowdstack/ui";
import { ArrowLeft, AlertCircle } from "lucide-react";

// CRITICAL: Force dynamic rendering - this page MUST always fetch fresh data
// This prevents any Next.js static/dynamic caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface BookingPageProps {
  params: { id: string };
}

/**
 * Fetch booking data directly from Supabase (server-side)
 * This mirrors the /me page pattern which is known to work correctly
 */
async function getBookingData(bookingId: string): Promise<BookingData | null> {
  const supabase = await createClient();
  const serviceSupabase = createServiceRoleClient();
  
  // Get current user to check if they're the host
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserEmail = user?.email?.toLowerCase();

  // CRITICAL: Direct query for status fields to avoid PostgREST field collision
  // (events table also has a status column that can interfere)
  const { data: directBooking, error: directError } = await serviceSupabase
    .from("table_bookings")
    .select("id, status, payment_status, updated_at")
    .eq("id", bookingId)
    .single();

  if (directError || !directBooking) {
    console.error(`[Booking Page] Booking not found: ${bookingId}`, directError);
    return null;
  }

  // Store authoritative status values from direct query
  const authoritativeStatus = directBooking.status;
  const authoritativePaymentStatus = directBooking.payment_status;

  console.log(`[Booking Page] Fetched status for ${bookingId}:`, {
    status: authoritativeStatus,
    payment_status: authoritativePaymentStatus,
    updated_at: directBooking.updated_at,
  });

  // Get booking with related data (without status fields to avoid collision)
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
    console.error("[Booking Page] Error fetching booking relations:", bookingError);
    return null;
  }

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

  // Check if DOKU is enabled and get manual payment info
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
  let partyData = null;
  if (authoritativeStatus === "confirmed" || authoritativePaymentStatus === "paid") {
    // Get existing party guests
    const { data: partyGuests } = await serviceSupabase
      .from("table_party_guests")
      .select("id, guest_name, guest_email, status, is_host, invite_token, qr_token, checked_in, attendee_id")
      .eq("booking_id", bookingId)
      .order("is_host", { ascending: false })
      .order("created_at", { ascending: true });

    // Check if host guest record exists
    let hostGuest = partyGuests?.find(g => g.is_host);

    // Helper function to ensure host has attendee_id and registration
    // Returns both attendeeId and registrationId for token generation
    const ensureHostLinked = async (hostId: string, hostEmail: string): Promise<{ attendeeId: string | null; registrationId: string | null }> => {
      // Look up or create attendee for the host
      let attendeeId: string | null = null;
      let registrationId: string | null = null;

      // First try to find existing attendee by email
      const { data: existingAttendee } = await serviceSupabase
        .from("attendees")
        .select("id")
        .eq("email", hostEmail.toLowerCase())
        .single();

      if (existingAttendee) {
        attendeeId = existingAttendee.id;
      } else {
        // Create new attendee for the host
        const { data: newAttendee } = await serviceSupabase
          .from("attendees")
          .insert({
            email: hostEmail.toLowerCase(),
            name: booking.guest_name,
          })
          .select("id")
          .single();

        if (newAttendee) {
          attendeeId = newAttendee.id;
        }
      }

      if (attendeeId) {
        // Update host guest record with attendee_id
        await serviceSupabase
          .from("table_party_guests")
          .update({ attendee_id: attendeeId })
          .eq("id", hostId);

        // Ensure registration exists for this attendee at this event
        const { data: existingReg } = await serviceSupabase
          .from("registrations")
          .select("id")
          .eq("attendee_id", attendeeId)
          .eq("event_id", event?.id)
          .single();

        if (existingReg) {
          registrationId = existingReg.id;
        } else if (event?.id) {
          // Create registration for the host
          const { data: newReg } = await serviceSupabase
            .from("registrations")
            .insert({
              attendee_id: attendeeId,
              event_id: event.id,
              source: "table_booking",
              registered_at: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (newReg) {
            registrationId = newReg.id;
          }
        }
      }

      return { attendeeId, registrationId };
    };

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
          existingGuest.is_host = true;
          hostGuest = existingGuest;

          // Ensure host is linked to attendee and has registration FIRST
          if (booking.guest_email) {
            const { attendeeId, registrationId } = await ensureHostLinked(existingGuest.id, booking.guest_email);

            // Generate registration-based QR token if missing or regenerate to ensure consistency
            if (registrationId && attendeeId && event?.id) {
              const qrToken = generateQRPassToken(registrationId, event.id, attendeeId);
              await serviceSupabase
                .from("table_party_guests")
                .update({ qr_token: qrToken, attendee_id: attendeeId })
                .eq("id", existingGuest.id);
              existingGuest.qr_token = qrToken;
              existingGuest.attendee_id = attendeeId;
            }
          }
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
          .select("id, guest_name, guest_email, status, is_host, invite_token, qr_token, checked_in, attendee_id")
          .single();

        if (!hostError && newHostGuest) {
          hostGuest = newHostGuest;

          // Link host to attendee and create registration FIRST
          if (booking.guest_email) {
            const { attendeeId, registrationId } = await ensureHostLinked(newHostGuest.id, booking.guest_email);

            // Generate registration-based QR token
            if (registrationId && attendeeId && event?.id) {
              const qrToken = generateQRPassToken(registrationId, event.id, attendeeId);
              await serviceSupabase
                .from("table_party_guests")
                .update({ qr_token: qrToken, attendee_id: attendeeId })
                .eq("id", newHostGuest.id);
              hostGuest = { ...newHostGuest, qr_token: qrToken, attendee_id: attendeeId };
            }
          }
        }
      }
    } else {
      // Host exists - ensure they're linked to attendee and have registration
      // Also regenerate token if needed for consistency
      if (hostGuest.guest_email) {
        const { attendeeId, registrationId } = await ensureHostLinked(hostGuest.id, hostGuest.guest_email);

        // Regenerate registration-based token if we have the needed data
        if (registrationId && attendeeId && event?.id && !hostGuest.qr_token) {
          const qrToken = generateQRPassToken(registrationId, event.id, attendeeId);
          await serviceSupabase
            .from("table_party_guests")
            .update({ qr_token: qrToken })
            .eq("id", hostGuest.id);
          hostGuest.qr_token = qrToken;
        }
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";

    // Re-fetch the host to get updated data (including attendee_id if just linked)
    if (hostGuest) {
      const { data: refreshedHost } = await serviceSupabase
        .from("table_party_guests")
        .select("id, guest_name, guest_email, status, is_host, invite_token, qr_token, checked_in, attendee_id")
        .eq("id", hostGuest.id)
        .single();
      
      if (refreshedHost) {
        hostGuest = refreshedHost;
      }
    }

    // Count total joined (host + guests with status "joined")
    // The host should always be counted since they have status "joined"
    const allGuests = partyGuests || [];
    const joinedCount = allGuests.filter(g => g.status === "joined").length;
    // If we just created the host and they're not in partyGuests yet, add 1
    const hostInList = allGuests.some(g => g.id === hostGuest?.id);
    const totalJoined = hostInList ? joinedCount : joinedCount + (hostGuest ? 1 : 0);

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
      total_joined: totalJoined,
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

  // Check if current user is the host
  const isHost = currentUserEmail ? booking.guest_email?.toLowerCase() === currentUserEmail : false;
  
  // Check if current user is a guest on this table (joined the party but not the host)
  let isGuest = false;
  if (currentUserEmail && !isHost && partyData?.guests) {
    isGuest = partyData.guests.some(g => g.email?.toLowerCase() === currentUserEmail);
  }
  // Also check by user ID in the table_party_guests directly
  if (!isGuest && !isHost && user) {
    const { data: userAsGuest } = await serviceSupabase
      .from("table_party_guests")
      .select("id, status")
      .eq("booking_id", bookingId)
      .eq("is_host", false)
      .or(`guest_email.ilike.${currentUserEmail}`)
      .limit(1);
    
    if (userAsGuest && userAsGuest.length > 0 && userAsGuest[0].status === "joined") {
      isGuest = true;
    }
  }

  return {
    booking: {
      id: booking.id,
      // CRITICAL: Use authoritative status from direct query
      status: authoritativeStatus,
      payment_status: authoritativePaymentStatus || "not_required",
      guest_name: guestFullName,
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
      payment_url: paymentInfo?.payment_url || null,
      expires_at: paymentInfo?.expires_at || null,
      doku_enabled: dokuEnabled,
      manual_payment_enabled: manualPaymentEnabled,
      manual_payment_instructions: manualPaymentInstructions,
    },
    party: partyData,
    isHost,
    isGuest,
    currency,
    currencySymbol,
  };
}

/**
 * Booking details page - Server Component
 * 
 * This fetches data directly from Supabase on EVERY request (no caching).
 * This pattern is proven to work correctly (same as /me page).
 */
export default async function BookingPage({ params }: BookingPageProps) {
  const bookingId = params.id;

  if (!bookingId) {
    notFound();
  }

  const data = await getBookingData(bookingId);

  if (!data) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-raised rounded-full flex items-center justify-center mb-4 border border-border-subtle">
            <AlertCircle className="h-8 w-8 text-accent-error" />
          </div>
          <h1 className="text-xl font-bold text-primary mb-2">Booking Not Found</h1>
          <p className="text-secondary mb-6">This booking could not be found or may have been cancelled.</p>
          <Link href="/">
            <Button variant="secondary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Pass fresh data to client component
  return <BookingPageClient initialData={data} />;
}
