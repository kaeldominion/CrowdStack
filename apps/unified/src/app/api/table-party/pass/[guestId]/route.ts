import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";

export const dynamic = "force-dynamic";

interface EventWithVenue {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  timezone: string | null;
  cover_image: string | null;
  venue: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
  } | null;
}

interface BookingWithTable {
  id: string;
  event_id: string;
  guest_name: string;
  party_size: number;
  status: string;
  table: {
    id: string;
    name: string;
    zone: {
      id: string;
      name: string;
    } | null;
  } | null;
  event: EventWithVenue;
}

/**
 * GET /api/table-party/pass/[guestId]
 * Get QR pass data for a party guest (public - for displaying QR pass)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { guestId: string } }
) {
  try {
    const { guestId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Find the guest
    const { data: guest, error: guestError } = await serviceSupabase
      .from("table_party_guests")
      .select("*")
      .eq("id", guestId)
      .single();

    if (guestError || !guest) {
      return NextResponse.json(
        { error: "Pass not found" },
        { status: 404 }
      );
    }

    // Check if guest has joined (has QR token)
    if (guest.status !== "joined" || !guest.qr_token) {
      return NextResponse.json(
        { error: "Please accept your invitation first to get your pass" },
        { status: 400 }
      );
    }

    // Check if removed
    if (guest.status === "removed") {
      return NextResponse.json(
        { error: "This pass has been revoked" },
        { status: 400 }
      );
    }

    // CRITICAL: Get authoritative status separately to avoid PostgREST field collision
    // (events table also has a "status" column that can interfere with nested selects)
    const { data: statusData } = await serviceSupabase
      .from("table_bookings")
      .select("status")
      .eq("id", guest.booking_id)
      .single();

    const authoritativeStatus = statusData?.status;

    // Get the booking with event and table details (excluding status to avoid collision)
    const { data: bookingData, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        event_id,
        guest_name,
        party_size,
        table:venue_tables(
          id,
          name,
          zone:table_zones(id, name)
        ),
        event:events(
          id,
          name,
          slug,
          start_time,
          timezone,
          cover_image,
          venue:venues(id, name, address, city)
        )
      `)
      .eq("id", guest.booking_id)
      .single();

    if (bookingError || !bookingData) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const booking = bookingData as unknown as BookingWithTable;
    const event = booking.event as EventWithVenue;

    // Check if booking is still valid (using authoritative status)
    if (authoritativeStatus === "cancelled") {
      return NextResponse.json(
        { error: "This booking has been cancelled" },
        { status: 400 }
      );
    }

    // Format event date
    const eventTimezone = event.timezone || "UTC";
    const eventStartTime = event.start_time ? new Date(event.start_time) : null;
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

    // Check if event is in the past
    const now = new Date();
    const isPastEvent = eventStartTime && eventStartTime < now;

    return NextResponse.json({
      pass: {
        qr_token: guest.qr_token,
        guest_name: guest.guest_name,
        guest_email: guest.guest_email,
        is_host: guest.is_host,
        checked_in: guest.checked_in,
        checked_in_at: guest.checked_in_at,
      },
      booking: {
        id: booking.id,
        host_name: booking.guest_name,
        party_size: booking.party_size,
        table_name: booking.table?.name || "Table",
        zone_name: booking.table?.zone?.name || "General",
        status: authoritativeStatus, // Use authoritative status from direct query
      },
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        date: eventDate,
        time: eventTime,
        start_time: event.start_time,
        cover_image: event.cover_image,
        is_past: isPastEvent,
      },
      venue: {
        name: event.venue?.name || "",
        address: event.venue?.address || "",
        city: event.venue?.city || "",
      },
    });
  } catch (error: any) {
    console.error("Error in pass GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load pass" },
      { status: 500 }
    );
  }
}
