import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId, userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";
import { generateTablePartyToken } from "@crowdstack/shared/qr/table-party";

export const dynamic = "force-dynamic";

interface AddGuestRequest {
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  is_host?: boolean;
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
  table: {
    id: string;
    name: string;
  } | null;
}

/**
 * GET /api/venue/events/[eventId]/bookings/[bookingId]/guests
 * List all guests for a table booking
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string; bookingId: string } }
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

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const { eventId, bookingId } = params;
    const serviceSupabase = createServiceRoleClient();

    // Verify the event belongs to this venue
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id, venue_id")
      .eq("id", eventId)
      .single();

    if (!event || event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Verify the booking exists and belongs to this event
    const { data: booking } = await serviceSupabase
      .from("table_bookings")
      .select("id, event_id")
      .eq("id", bookingId)
      .eq("event_id", eventId)
      .single();

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Get all guests for this booking
    const { data: guests, error: guestsError } = await serviceSupabase
      .from("table_party_guests")
      .select(`
        id,
        booking_id,
        attendee_id,
        guest_name,
        guest_email,
        guest_phone,
        invite_token,
        invite_sent_at,
        joined_at,
        checked_in,
        checked_in_at,
        status,
        is_host,
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
 * POST /api/venue/events/[eventId]/bookings/[bookingId]/guests
 * Add a guest to a table booking (sends invite email)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string; bookingId: string } }
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

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const { eventId, bookingId } = params;
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

    const serviceSupabase = createServiceRoleClient();

    // Verify the event belongs to this venue and get details
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
      .eq("id", eventId)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const event = eventData as unknown as EventWithVenue;

    if (event.venue_id !== venueId) {
      return NextResponse.json({ error: "Event does not belong to this venue" }, { status: 403 });
    }

    // Verify the booking exists and get details
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
      .eq("event_id", eventId)
      .single();

    if (bookingError || !bookingData) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = bookingData as unknown as BookingWithTable;

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

        // Send invite email (will be handled below)
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
        is_host: body.is_host || false,
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
      "Guest added and invite sent"
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

  // Format event date
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

  // Send invite email
  try {
    await sendTemplateEmail(
      "table_party_invite",
      guest.guest_email,
      guest.attendee_id,
      {
        guest_name: guest.guest_name,
        host_name: booking.guest_name,
        event_name: event.name,
        event_date: eventDate,
        table_name: booking.table?.name || "Table",
        venue_name: event.venue?.name || "",
        join_url: joinUrl,
      },
      {
        event_id: event.id,
        booking_id: booking.id,
      }
    );
  } catch (emailError) {
    console.error("Failed to send party invite email:", emailError);
    // Don't fail the operation if email fails
  }

  return NextResponse.json({
    success: true,
    guest,
    join_url: joinUrl,
    message: successMessage,
  });
}
