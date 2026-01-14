import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { sendTemplateEmail } from "@crowdstack/shared/email/template-renderer";
import { generateQRPassToken } from "@crowdstack/shared/qr/generate";
import { emitOutboxEvent } from "@crowdstack/shared/outbox/emit";

export const dynamic = "force-dynamic";

interface JoinPartyRequest {
  name?: string;
  surname?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  date_of_birth?: string;
  gender?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
}

interface EventWithVenue {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  timezone: string | null;
  cover_image_url: string | null;
  flier_url: string | null;
  venue: {
    id: string;
    name: string;
    slug: string;
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
          cover_image_url,
          flier_url,
          venue:venues(id, name, slug, address, city)
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

    // Get all guests with their details (including who has joined)
    const { data: allGuests } = await serviceSupabase
      .from("table_party_guests")
      .select(`
        id,
        guest_name,
        guest_email,
        status,
        is_host,
        joined_at,
        attendee:attendees(
          id,
          name,
          surname,
          instagram_handle
        )
      `)
      .eq("booking_id", guest.booking_id)
      .order("is_host", { ascending: false })
      .order("joined_at", { ascending: true, nullsFirst: false });

    const joinedGuests = (allGuests || []).filter(g => g.status === "joined");
    const joinedCount = joinedGuests.length;
    const isPartyFull = joinedCount >= booking.party_size;
    const spotsRemaining = Math.max(0, booking.party_size - joinedCount);
    
    // Build guest list for display (mask emails for privacy)
    const guestList = joinedGuests.map(g => {
      // Supabase returns nested relations as arrays when using select
      const attendeeData = g.attendee as unknown;
      const attendee = (Array.isArray(attendeeData) ? attendeeData[0] : attendeeData) as { id: string; name: string; surname?: string | null; instagram_handle?: string | null } | null;
      // Build full name from first + last name
      const fullName = attendee
        ? [attendee.name, attendee.surname].filter(Boolean).join(" ")
        : (g.guest_name || "Guest");
      return {
        id: g.id,
        name: fullName,
        initial: (attendee?.name || g.guest_name || "G").charAt(0).toUpperCase(),
        is_host: g.is_host,
        instagram: attendee?.instagram_handle || null,
        joined_at: g.joined_at,
      };
    });
    
    // Find the host
    const hostGuest = (allGuests || []).find(g => g.is_host);
    const hostAttendeeData = hostGuest?.attendee as unknown;
    const hostAttendee = (Array.isArray(hostAttendeeData) ? hostAttendeeData[0] : hostAttendeeData) as { name: string; surname?: string | null } | null;
    // Build full host name from first + last name
    const hostFullName = hostAttendee
      ? [hostAttendee.name, hostAttendee.surname].filter(Boolean).join(" ")
      : booking.guest_name;

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

    // Build response with guest status info and guest list
    return NextResponse.json({
      // If this is the host's invite token, anyone can join (open invite)
      // If this is a specific guest's token, only that email can join
      is_open_invite: guest.is_host,
      guest: {
        id: guest.id,
        name: guest.guest_name,
        email: guest.guest_email,
        status: guest.status,
        is_host: guest.is_host,
        has_joined: guest.status === "joined",
        checked_in: guest.checked_in,
      },
      host: {
        name: hostFullName,
        initial: (hostFullName || "H").charAt(0).toUpperCase(),
      },
      booking: {
        id: booking.id,
        host_name: hostFullName,
        party_size: booking.party_size,
        joined_count: joinedCount,
        spots_remaining: spotsRemaining,
        is_full: isPartyFull,
        table_name: booking.table?.name || "Table",
        zone_name: booking.table?.zone?.name || "General",
      },
      guests: guestList,
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        date: eventDate,
        time: eventTime,
        start_time: event.start_time,
        cover_image: event.cover_image_url,
        flier_url: event.flier_url,
        is_past: isPastEvent,
      },
      venue: {
        name: event.venue?.name || "",
        slug: event.venue?.slug || "",
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
 * Accept a party invitation - REQUIRES AUTHENTICATION
 * Creates event registration and links to table party guest
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { inviteToken: string } }
) {
  try {
    // REQUIRE AUTHENTICATION
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to join the party." },
        { status: 401 }
      );
    }

    const { inviteToken } = params;
    const body: JoinPartyRequest = await request.json().catch(() => ({}));
    const serviceSupabase = createServiceRoleClient();

    // Find the guest/invite by token
    const { data: inviteGuest, error: guestError } = await serviceSupabase
      .from("table_party_guests")
      .select("*")
      .eq("invite_token", inviteToken)
      .single();

    if (guestError || !inviteGuest) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    const bookingId = inviteGuest.booking_id;
    const isHostInvite = inviteGuest.is_host;

    // Get booking to check event_id and party details
    const { data: bookingForEvent, error: bookingForEventError } = await serviceSupabase
      .from("table_bookings")
      .select("event_id, party_size")
      .eq("id", bookingId)
      .single();

    if (bookingForEventError || !bookingForEvent) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Check if THIS USER has already joined this party (by email or attendee)
    const { data: existingGuestForUser } = await serviceSupabase
      .from("table_party_guests")
      .select("*")
      .eq("booking_id", bookingId)
      .or(`guest_email.ilike.${user.email}`)
      .single();

    // Also check by attendee_id if user has an attendee record
    const { data: userAttendee } = await serviceSupabase
      .from("attendees")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let existingGuest = existingGuestForUser;
    if (!existingGuest && userAttendee) {
      const { data: guestByAttendee } = await serviceSupabase
        .from("table_party_guests")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("attendee_id", userAttendee.id)
        .single();
      existingGuest = guestByAttendee;
    }

    // If user already has a guest entry for this party
    if (existingGuest) {
      if (existingGuest.status === "joined" && existingGuest.attendee_id) {
        // Already joined - return their QR
        const { data: registration } = await serviceSupabase
          .from("registrations")
          .select("id, event_id, attendee_id")
          .eq("attendee_id", existingGuest.attendee_id)
          .eq("event_id", bookingForEvent.event_id)
          .single();

        let qrToken = null;
        if (registration) {
          qrToken = generateQRPassToken(
            registration.id,
            registration.event_id,
            registration.attendee_id
          );
        }

        return NextResponse.json({
          success: true,
          already_joined: true,
          guest_id: existingGuest.id,
          qr_token: qrToken,
          message: "You've already joined this party",
        });
      }

      if (existingGuest.status === "removed") {
        return NextResponse.json(
          { error: "Your invitation has been revoked" },
          { status: 400 }
        );
      }

      if (existingGuest.status === "declined") {
        return NextResponse.json(
          { error: "You previously declined this invitation" },
          { status: 400 }
        );
      }
    }

    // For non-host invites, verify the email matches (specific person invite)
    // For host invites, anyone with the link can join
    let guest = existingGuest;
    if (!isHostInvite && !existingGuest) {
      // This is a specific person's invite token - verify email
      if (user.email.toLowerCase() !== inviteGuest.guest_email.toLowerCase()) {
        return NextResponse.json(
          { error: "This invitation was sent to a different email address. Please use the email that received the invitation." },
          { status: 403 }
        );
      }
      guest = inviteGuest;
    } else if (!existingGuest) {
      // Host invite - user doesn't have an entry yet, will create one below
      guest = null;
    }

    // Check if party is full before allowing join
    const { data: partyGuests } = await serviceSupabase
      .from("table_party_guests")
      .select("id, status")
      .eq("booking_id", bookingId)
      .in("status", ["joined"]);

    // Get booking with full details
    const { data: bookingData, error: bookingError } = await serviceSupabase
      .from("table_bookings")
      .select(`
        id,
        event_id,
        party_size,
        guest_name,
        guest_email,
        table:venue_tables(id, name),
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

    if (bookingError || !bookingData) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const currentJoined = partyGuests?.length || 0;
    const maxPartySize = bookingData.party_size || 1;

    if (currentJoined >= maxPartySize) {
      return NextResponse.json(
        { error: "This party is full. Contact the host to request additional spots." },
        { status: 400 }
      );
    }

    const booking = bookingData as unknown as BookingWithTable;
    const event = booking.event as EventWithVenue;

    // If no guest entry exists (new user joining via host invite), create one
    if (!guest) {
      const { data: newGuest, error: newGuestError } = await serviceSupabase
        .from("table_party_guests")
        .insert({
          booking_id: bookingId,
          guest_name: body.name || user.email.split("@")[0],
          guest_email: user.email.toLowerCase(),
          guest_phone: body.whatsapp || body.phone || null,
          is_host: false,
          status: "invited", // Will be updated to "joined" below
        })
        .select()
        .single();

      if (newGuestError) {
        console.error("Error creating guest entry:", newGuestError);
        return NextResponse.json(
          { error: "Failed to create guest entry" },
          { status: 500 }
        );
      }
      guest = newGuest;
    }

    // Get or create attendee (same logic as event registration)
    let attendee;
    const { data: existingAttendee } = await serviceSupabase
      .from("attendees")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const attendeeData: any = {
      name: body.name || guest.guest_name,
      email: user.email.toLowerCase(),
      user_id: user.id,
    };

    if (body.surname) attendeeData.surname = body.surname;
    if (body.phone || body.whatsapp) {
      attendeeData.phone = body.whatsapp || body.phone || guest.guest_phone;
      if (body.whatsapp) attendeeData.whatsapp = body.whatsapp;
    }
    if (body.date_of_birth) attendeeData.date_of_birth = body.date_of_birth;
    if (body.gender) attendeeData.gender = body.gender;
    if (body.instagram_handle) attendeeData.instagram_handle = body.instagram_handle.replace("@", "");
    if (body.tiktok_handle) attendeeData.tiktok_handle = body.tiktok_handle.replace("@", "");

    if (existingAttendee) {
      // Update existing attendee
      const updateData = { ...attendeeData };
      if (!body.phone && !body.whatsapp && existingAttendee.phone) {
        updateData.phone = existingAttendee.phone;
      }
      if (!body.whatsapp && existingAttendee.whatsapp) {
        updateData.whatsapp = existingAttendee.whatsapp;
      }

      const { data: updated, error: updateError } = await serviceSupabase
        .from("attendees")
        .update(updateData)
        .eq("id", existingAttendee.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update attendee: ${updateError.message}`);
      }
      attendee = updated;
    } else {
      // Create new attendee
      if (body.whatsapp) {
        attendeeData.phone = body.whatsapp;
        attendeeData.whatsapp = body.whatsapp;
      }

      const { data: created, error: createError } = await serviceSupabase
        .from("attendees")
        .insert(attendeeData)
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create attendee: ${createError.message}`);
      }
      attendee = created;
    }

    // Create or get event registration
    let registration;
    const { data: existingRegistration } = await serviceSupabase
      .from("registrations")
      .select("*")
      .eq("attendee_id", attendee.id)
      .eq("event_id", event.id)
      .single();

    if (existingRegistration) {
      registration = existingRegistration;
    } else {
      // Create new registration
      const { data: newRegistration, error: regError } = await serviceSupabase
        .from("registrations")
        .insert({
          attendee_id: attendee.id,
          event_id: event.id,
        })
        .select()
        .single();

      if (regError) {
        throw new Error(`Failed to create registration: ${regError.message}`);
      }
      registration = newRegistration;

      // Emit registration event
      await emitOutboxEvent("registration_created", {
        registration_id: registration.id,
        attendee_id: attendee.id,
        event_id: event.id,
      });
    }

    // Generate QR token from registration (not table party token)
    const qrToken = generateQRPassToken(
      registration.id,
      event.id,
      attendee.id
    );

    // Update guest to joined status and link to attendee
    const { data: updatedGuest, error: updateError } = await serviceSupabase
      .from("table_party_guests")
      .update({
        status: "joined",
        joined_at: new Date().toISOString(),
        guest_name: attendee.name,
        guest_phone: attendee.phone || attendee.whatsapp,
        attendee_id: attendee.id,
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
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://crowdstack.app";
      const qrUrl = `${baseUrl}/e/${event.slug}/pass?token=${qrToken}`;

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
        attendee.id,
        {
          guest_name: attendee.name,
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
      // Get updated guest count after this join
      const { data: updatedPartyGuests } = await serviceSupabase
        .from("table_party_guests")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("status", "joined");

      const updatedJoinedCount = updatedPartyGuests?.length || 1;
      const bookingUrl = `${baseUrl}/me`;

      await sendTemplateEmail(
        "table_party_guest_joined_host",
        booking.guest_email,
        null,
        {
          host_name: booking.guest_name,
          guest_name: attendee.name,
          event_name: event.name,
          table_name: booking.table?.name || "Table",
          current_count: String(updatedJoinedCount),
          party_size: String(booking.party_size),
          booking_url: bookingUrl,
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
      guest_id: updatedGuest.id,
      registration_id: registration.id,
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
