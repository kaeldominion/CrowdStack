import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";
import { generateTablePartyToken } from "@crowdstack/shared/qr/table-party";

export const dynamic = "force-dynamic";

interface JoinPartyRequest {
  name?: string;
  email?: string;
  phone?: string;
}

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
  guest_email: string;
  party_size: number;
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
 * GET /api/table-party/join/[inviteToken]
 * Get party details for an invite (public - no auth required)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { inviteToken: string } }
) {
  try {
    const { inviteToken } = params;
    const serviceSupabase = createServiceRoleClient();

    // Find the guest by invite token
    const { data: guest, error: guestError } = await serviceSupabase
      .from("table_party_guests")
      .select("*")
      .eq("invite_token", inviteToken)
      .single();

    if (guestError || !guest) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Check if invite is still valid
    if (guest.status === "removed") {
      return NextResponse.json(
        { error: "This invitation has been revoked" },
        { status: 400 }
      );
    }

    if (guest.status === "declined") {
      return NextResponse.json(
        { error: "This invitation was declined" },
        { status: 400 }
      );
    }

    // Get the booking with event and table details
    const { data: bookingData, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        event_id,
        guest_name,
        guest_email,
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

    // Check if event is in the past
    const eventStartTime = event.start_time ? new Date(event.start_time) : null;
    const now = new Date();
    const isPastEvent = eventStartTime && eventStartTime < now;

    // Check party capacity
    const { data: allGuests } = await serviceSupabase
      .from("table_party_guests")
      .select("id, status")
      .eq("booking_id", guest.booking_id);

    const joinedCount = (allGuests || []).filter(g => g.status === "joined").length;
    const isPartyFull = joinedCount >= booking.party_size;
    const spotsRemaining = Math.max(0, booking.party_size - joinedCount);

    // Format event date
    const eventTimezone = event.timezone || "UTC";
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

    // Build response with guest status info
    return NextResponse.json({
      guest: {
        id: guest.id,
        name: guest.guest_name,
        email: guest.guest_email,
        status: guest.status,
        is_host: guest.is_host,
        has_joined: guest.status === "joined",
        checked_in: guest.checked_in,
      },
      booking: {
        id: booking.id,
        host_name: booking.guest_name,
        party_size: booking.party_size,
        joined_count: joinedCount,
        spots_remaining: spotsRemaining,
        is_full: isPartyFull,
        table_name: booking.table?.name || "Table",
        zone_name: booking.table?.zone?.name || "General",
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
    console.error("Error in party join GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load invitation" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/table-party/join/[inviteToken]
 * Accept a party invitation and create basic account
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { inviteToken: string } }
) {
  try {
    const { inviteToken } = params;
    const body: JoinPartyRequest = await request.json().catch(() => ({}));
    const serviceSupabase = createServiceRoleClient();

    // Find the guest by invite token
    const { data: guest, error: guestError } = await serviceSupabase
      .from("table_party_guests")
      .select("*")
      .eq("invite_token", inviteToken)
      .single();

    if (guestError || !guest) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Check if invite is still valid
    if (guest.status === "removed") {
      return NextResponse.json(
        { error: "This invitation has been revoked" },
        { status: 400 }
      );
    }

    if (guest.status === "declined") {
      return NextResponse.json(
        { error: "This invitation was declined" },
        { status: 400 }
      );
    }

    // If already joined, return success with existing QR token
    if (guest.status === "joined" && guest.qr_token) {
      return NextResponse.json({
        success: true,
        already_joined: true,
        guest_id: guest.id,
        qr_token: guest.qr_token,
        message: "You've already joined this party",
      });
    }

    // Check if party is full before allowing join
    const { data: partyGuests } = await serviceSupabase
      .from("table_party_guests")
      .select("id, status")
      .eq("booking_id", guest.booking_id)
      .in("status", ["joined"]);

    // Get booking to check party_size
    const { data: bookingCheck } = await serviceSupabase
      .from("table_bookings")
      .select("party_size")
      .eq("id", guest.booking_id)
      .single();

    const currentJoined = partyGuests?.length || 0;
    const maxPartySize = bookingCheck?.party_size || 1;

    if (currentJoined >= maxPartySize) {
      return NextResponse.json(
        { error: "This party is full. Contact the host to request additional spots." },
        { status: 400 }
      );
    }

    // Get the booking with event details (for QR token generation)
    const { data: bookingData, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        event_id,
        guest_name,
        table:venue_tables(id, name),
        event:events(
          id,
          name,
          start_time,
          timezone,
          venue:venues(id, name)
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

    // Update guest name/phone if provided
    const updateName = body.name || guest.guest_name;
    const updatePhone = body.phone || guest.guest_phone;

    // Check/create attendee record for the guest email
    let attendeeId = guest.attendee_id;

    if (!attendeeId) {
      // Check if attendee exists with this email
      const { data: existingAttendee } = await serviceSupabase
        .from("attendees")
        .select("id")
        .eq("email", guest.guest_email.toLowerCase())
        .single();

      if (existingAttendee) {
        attendeeId = existingAttendee.id;
      } else {
        // Create new attendee record (basic account)
        const { data: newAttendee, error: createError } = await serviceSupabase
          .from("attendees")
          .insert({
            email: guest.guest_email.toLowerCase(),
            name: updateName,
            phone: updatePhone,
            source: "table_party_invite",
          })
          .select("id")
          .single();

        if (createError) {
          console.error("Error creating attendee:", createError);
          // Continue without attendee link - not critical
        } else if (newAttendee) {
          attendeeId = newAttendee.id;
        }
      }
    }

    // Generate QR token
    const qrToken = generateTablePartyToken(
      guest.id,
      guest.booking_id,
      booking.event_id
    );

    // Update guest to joined status with QR token
    const { data: updatedGuest, error: updateError } = await serviceSupabase
      .from("table_party_guests")
      .update({
        status: "joined",
        joined_at: new Date().toISOString(),
        qr_token: qrToken,
        guest_name: updateName,
        guest_phone: updatePhone,
        attendee_id: attendeeId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", guest.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating guest:", updateError);
      return NextResponse.json(
        { error: "Failed to join party" },
        { status: 500 }
      );
    }

    // Send confirmation email with QR code link
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.com";
      const qrUrl = `${baseUrl}/table-pass/${guest.id}`;

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

      // Send confirmation to guest
      await sendTemplateEmail(
        "table_party_joined",
        guest.guest_email,
        attendeeId,
        {
          guest_name: updateName,
          event_name: event.name,
          event_date: eventDate,
          table_name: booking.table?.name || "Table",
          venue_name: event.venue?.name || "",
          qr_url: qrUrl,
        },
        {
          event_id: event.id,
          booking_id: booking.id,
        }
      );

      // Notify host that guest joined
      await sendTemplateEmail(
        "table_party_guest_joined_host",
        booking.guest_email,
        null,
        {
          host_name: booking.guest_name,
          guest_name: updateName,
          event_name: event.name,
          table_name: booking.table?.name || "Table",
        },
        {
          event_id: event.id,
          booking_id: booking.id,
        }
      );
    } catch (emailError) {
      console.error("Failed to send party joined email:", emailError);
      // Don't fail if email fails
    }

    return NextResponse.json({
      success: true,
      guest_id: guest.id,
      qr_token: qrToken,
      message: "Successfully joined the party! Check your email for your QR pass.",
    });
  } catch (error: any) {
    console.error("Error in party join POST:", error);
    return NextResponse.json(
      { error: error.message || "Failed to join party" },
      { status: 500 }
    );
  }
}
