import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { generateTablePartyToken } from "@crowdstack/shared/qr/table-party";

export const dynamic = "force-dynamic";

interface AddGuestRequest {
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
}

interface EventWithVenue {
  id: string;
  name: string;
  venue_id: string;
  start_time: string;
  timezone: string | null;
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
  guest_email: string;
  party_size: number;
  status: string;
  payment_status: string;
  table: {
    id: string;
    name: string;
  } | null;
}

/**
 * GET /api/booking/[id]/guests
 * List all guests for a table booking (host access only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get authenticated user (if any)
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email?.toLowerCase();

    // Get booking details
    const { data: booking, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select("id, guest_email, status, payment_status")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Check if user is the host (matches booking email or is host guest)
    let isHost = false;
    if (userEmail && booking.guest_email?.toLowerCase() === userEmail) {
      isHost = true;
    } else if (user) {
      // Check if user is the host guest record
      const { data: hostGuest } = await serviceSupabase
        .from("table_party_guests")
        .select("id, guest_email")
        .eq("booking_id", bookingId)
        .eq("is_host", true)
        .single();

      if (hostGuest && hostGuest.guest_email?.toLowerCase() === userEmail) {
        isHost = true;
      }
    }

    // Also allow access via email parameter (for public access with email verification)
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get("email")?.toLowerCase();
    if (!isHost && emailParam && booking.guest_email?.toLowerCase() === emailParam) {
      isHost = true;
    }

    if (!isHost) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all guests for this booking
    const { data: guests, error: guestsError } = await serviceSupabase
      .from("table_party_guests")
      .select(`
        id,
        booking_id,
        guest_name,
        guest_email,
        guest_phone,
        status,
        is_host,
        checked_in,
        created_at
      `)
      .eq("booking_id", bookingId)
      .neq("status", "removed")
      .order("is_host", { ascending: false })
      .order("created_at", { ascending: true });

    if (guestsError) {
      console.error("Error fetching guests:", guestsError);
      return NextResponse.json({ error: "Failed to fetch guests" }, { status: 500 });
    }

    // Calculate summary
    const summary = {
      total: guests?.length || 0,
      invited: guests?.filter(g => g.status === "invited").length || 0,
      joined: guests?.filter(g => g.status === "joined").length || 0,
      checked_in: guests?.filter(g => g.checked_in).length || 0,
    };

    return NextResponse.json({
      guests: guests || [],
      summary,
    });
  } catch (error: any) {
    console.error("Error in guests GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch guests" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/booking/[id]/guests
 * Add a guest to a table booking (host access only, sends invite email)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();
    const body: AddGuestRequest = await request.json();

    // Validate required fields
    if (!body.guest_name || !body.guest_email) {
      return NextResponse.json(
        { error: "Missing required fields: guest_name, guest_email" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.guest_email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Get authenticated user (if any)
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email?.toLowerCase();

    // CRITICAL: Use a direct query for status fields to avoid any PostgREST
    // field collision issues (consistent with main booking route)
    const { data: directBooking, error: directError } = await serviceSupabase
      .from("table_bookings")
      .select("id, status, payment_status")
      .eq("id", bookingId)
      .single();

    if (directError || !directBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get booking with related data (without status fields to avoid collision)
    const { data: bookingData, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        event_id,
        guest_name,
        guest_email,
        party_size,
        table:venue_tables(id, name)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !bookingData) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Use authoritative status values from direct query
    const booking = {
      ...bookingData,
      status: directBooking.status,
      payment_status: directBooking.payment_status,
    } as unknown as BookingWithTable;

    // Check if booking is confirmed/paid (hosts can only manage confirmed bookings)
    if (booking.status !== "confirmed" && booking.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Booking must be confirmed before adding guests" },
        { status: 400 }
      );
    }

    // Check if user is the host
    let isHost = false;
    if (userEmail && booking.guest_email?.toLowerCase() === userEmail) {
      isHost = true;
    } else if (user) {
      // Check if user is the host guest record
      const { data: hostGuest } = await serviceSupabase
        .from("table_party_guests")
        .select("id, guest_email")
        .eq("booking_id", bookingId)
        .eq("is_host", true)
        .single();

      if (hostGuest && hostGuest.guest_email?.toLowerCase() === userEmail) {
        isHost = true;
      }
    }

    // Also allow access via email parameter (for public access with email verification)
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get("email")?.toLowerCase();
    if (!isHost && emailParam && booking.guest_email?.toLowerCase() === emailParam) {
      isHost = true;
    }

    if (!isHost) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get event details
    const { data: eventData, error: eventError } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        venue_id,
        start_time,
        timezone,
        venue:venues(id, name, address, city)
      `)
      .eq("id", booking.event_id)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = eventData as unknown as EventWithVenue;

    // Check if guest already exists for this booking
    const { data: existingGuest } = await serviceSupabase
      .from("table_party_guests")
      .select("id, status")
      .eq("booking_id", bookingId)
      .eq("guest_email", body.guest_email.toLowerCase())
      .single();

    if (existingGuest) {
      if (existingGuest.status === "removed") {
        // Re-add removed guest
        const { data: reAddedGuest, error: reAddError } = await serviceSupabase
          .from("table_party_guests")
          .update({
            guest_name: body.guest_name,
            guest_phone: body.guest_phone || null,
            status: "invited",
            invite_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingGuest.id)
          .select()
          .single();

        if (reAddError) {
          console.error("Error re-adding guest:", reAddError);
          return NextResponse.json({ error: "Failed to add guest" }, { status: 500 });
        }

        // Send invite email
        return sendInviteAndRespond(
          serviceSupabase,
          reAddedGuest,
          event,
          booking,
          "Guest re-added and invite sent"
        );
      }

      return NextResponse.json(
        { error: "This email is already on the guest list" },
        { status: 400 }
      );
    }

    // Check attendee by email (for linking)
    let attendeeId: string | null = null;
    const { data: attendee } = await serviceSupabase
      .from("attendees")
      .select("id")
      .eq("email", body.guest_email.toLowerCase())
      .single();

    if (attendee) {
      attendeeId = attendee.id;
    }

    // Create the guest
    const { data: newGuest, error: createError } = await serviceSupabase
      .from("table_party_guests")
      .insert({
        booking_id: bookingId,
        attendee_id: attendeeId,
        guest_name: body.guest_name,
        guest_email: body.guest_email.toLowerCase(),
        guest_phone: body.guest_phone || null,
        is_host: false,
        status: "invited",
        invite_sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating guest:", createError);
      return NextResponse.json({ error: "Failed to add guest" }, { status: 500 });
    }

    return sendInviteAndRespond(
      serviceSupabase,
      newGuest,
      event,
      booking,
      "Guest added. Share the join link with them."
    );
  } catch (error: any) {
    console.error("Error in guests POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add guest" },
      { status: 500 }
    );
  }
}

async function sendInviteAndRespond(
  serviceSupabase: any,
  guest: any,
  event: EventWithVenue,
  booking: BookingWithTable,
  successMessage: string
) {
  // Build join URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";
  const joinUrl = `${baseUrl}/join-table/${guest.invite_token}`;

  // Note: We no longer send email invites automatically to avoid conflicts
  // with existing user accounts. Hosts should share the join link directly.
  // The shareable link works for both new and existing users.

  return NextResponse.json({
    success: true,
    guest,
    join_url: joinUrl,
    message: successMessage,
  });
}

/**
 * DELETE /api/booking/[id]/guests
 * Remove a guest from the table party (host only)
 * Body: { guest_id: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    const userEmail = user.email.toLowerCase();

    // Get booking details
    const { data: booking, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        guest_email,
        guest_name,
        event:events(
          id,
          name,
          start_time,
          timezone,
          venue:venues(id, name)
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify user is the host
    const isHost = booking.guest_email?.toLowerCase() === userEmail;
    if (!isHost) {
      // Also check if user is the host guest record
      const { data: hostGuest } = await serviceSupabase
        .from("table_party_guests")
        .select("id, guest_email")
        .eq("booking_id", bookingId)
        .eq("is_host", true)
        .single();

      if (!hostGuest || hostGuest.guest_email?.toLowerCase() !== userEmail) {
        return NextResponse.json(
          { error: "Only the table host can remove guests" },
          { status: 403 }
        );
      }
    }

    // Get guest_id from request body
    const body = await request.json();
    const guestId = body.guest_id;

    if (!guestId) {
      return NextResponse.json(
        { error: "Guest ID is required" },
        { status: 400 }
      );
    }

    // Get the guest to be removed
    const { data: guest, error: guestError } = await serviceSupabase
      .from("table_party_guests")
      .select("id, guest_name, guest_email, is_host, status, attendee_id")
      .eq("id", guestId)
      .eq("booking_id", bookingId)
      .single();

    if (guestError || !guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    // Cannot remove the host
    if (guest.is_host) {
      return NextResponse.json(
        { error: "Cannot remove the table host" },
        { status: 400 }
      );
    }

    // Update guest status to "removed"
    const { error: updateError } = await serviceSupabase
      .from("table_party_guests")
      .update({
        status: "removed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", guestId);

    if (updateError) {
      console.error("Error removing guest:", updateError);
      return NextResponse.json(
        { error: "Failed to remove guest" },
        { status: 500 }
      );
    }

    // Also cancel their event registration if they have one
    if (guest.attendee_id) {
      const event = booking.event as unknown as EventWithVenue;
      if (event?.id) {
        await serviceSupabase
          .from("registrations")
          .update({ status: "cancelled" })
          .eq("attendee_id", guest.attendee_id)
          .eq("event_id", event.id);
      }
    }

    // Send email notification to removed guest
    if (guest.guest_email) {
      try {
        const { sendTemplateEmail } = await import("@crowdstack/shared/email/template-renderer");
        const event = booking.event as unknown as EventWithVenue;
        const venue = event?.venue as { name: string } | null;

        await sendTemplateEmail(
          "table_party_guest_removed",
          guest.guest_email,
          guest.attendee_id || null,
          {
            guest_name: guest.guest_name || "Guest",
            event_name: event?.name || "the event",
            host_name: booking.guest_name || "The host",
            venue_name: venue?.name || "",
          },
          {
            event_id: event?.id,
            booking_id: bookingId,
          }
        );
      } catch (emailError) {
        console.error("Failed to send removal notification email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `${guest.guest_name || "Guest"} has been removed from the table`,
    });
  } catch (error: any) {
    console.error("Error in guests DELETE:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove guest" },
      { status: 500 }
    );
  }
}
