import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { verifyQRPassToken } from "@crowdstack/shared/qr/verify";
import { cookies } from "next/headers";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[eventId]/checkin/preview
 * Get attendee details for check-in confirmation without actually checking them in
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    // Development-only fallback
    let userId = user?.id;
    if (!userId && process.env.NODE_ENV !== "production") {
      const localhostUser = cookieStore.get("localhost_user_id")?.value;
      if (localhostUser) {
        userId = localhostUser;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const registrationId = searchParams.get("registration_id");
    const qrToken = searchParams.get("qr_token");

    if (!registrationId && !qrToken) {
      return NextResponse.json(
        { error: "registration_id or qr_token required" },
        { status: 400 }
      );
    }

    let finalRegistrationId = registrationId;

    // If QR token provided, verify and extract registration ID
    if (qrToken && !registrationId) {
      try {
        const tokenData = verifyQRPassToken(qrToken);
        if (tokenData.event_id !== eventId) {
          return NextResponse.json(
            { error: "QR token is for a different event" },
            { status: 400 }
          );
        }
        finalRegistrationId = tokenData.registration_id;
      } catch (error: any) {
        return NextResponse.json(
          { error: "Invalid QR token" },
          { status: 400 }
        );
      }
    }

    if (!finalRegistrationId) {
      return NextResponse.json(
        { error: "Could not determine registration ID" },
        { status: 400 }
      );
    }

    // Get registration with full attendee info
    const { data: registration, error: regError } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        event_id,
        attendee_id,
        registered_at,
        attendee:attendees(
          id,
          name,
          surname,
          email,
          phone,
          user_id,
          avatar_url,
          is_global_vip,
          global_vip_reason,
          gender
        )
      `)
      .eq("id", finalRegistrationId)
      .single();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    if (registration.event_id !== eventId) {
      return NextResponse.json(
        { error: "Registration is for a different event" },
        { status: 400 }
      );
    }

    const attendee = Array.isArray(registration.attendee) 
      ? registration.attendee[0] 
      : registration.attendee;

    if (!attendee) {
      return NextResponse.json(
        { error: "Attendee not found" },
        { status: 404 }
      );
    }

    const attendeeName = attendee.surname 
      ? `${attendee.name || ""} ${attendee.surname}`.trim() 
      : attendee.name || "Unknown Attendee";

    // Check if already checked in
    const { data: existingCheckin } = await serviceSupabase
      .from("checkins")
      .select("id, checked_in_at")
      .eq("registration_id", finalRegistrationId)
      .is("undo_at", null)
      .maybeSingle();

    // Get event info for venue_id, organizer_id, and cutoff settings
    const { data: eventInfo } = await serviceSupabase
      .from("events")
      .select("venue_id, organizer_id, name, checkin_cutoff_enabled, checkin_cutoff_time_male, checkin_cutoff_time_female, timezone, start_time")
      .eq("id", eventId)
      .single();

    // Calculate cutoff status (gender-based)
    let cutoffStatus = {
      isPastCutoff: false,
      cutoffTime: null as string | null,
      cutoffTimeFormatted: null as string | null,
    };

    if (eventInfo?.checkin_cutoff_enabled) {
      // Select cutoff time based on attendee gender (default to male if no gender set)
      const attendeeGender = attendee?.gender || 'male';
      const cutoffTime = attendeeGender === 'female'
        ? eventInfo.checkin_cutoff_time_female
        : eventInfo.checkin_cutoff_time_male;

      if (cutoffTime) {
        const now = new Date();
        const eventDate = new Date(eventInfo.start_time);
        const [hours, minutes] = cutoffTime.split(':').map(Number);
        const eventHour = eventDate.getHours();

        // Create cutoff datetime by combining event date with cutoff time
        const cutoffDateTime = new Date(eventDate);
        cutoffDateTime.setHours(hours, minutes, 0, 0);

        // If cutoff time is earlier than event start time, it must be the next day
        // (e.g., event at 10PM with 2AM cutoff = cutoff is next day)
        if (hours < eventHour) {
          cutoffDateTime.setDate(cutoffDateTime.getDate() + 1);
        }

        // Format the cutoff time for display
        cutoffStatus.cutoffTime = cutoffTime;
        cutoffStatus.cutoffTimeFormatted = cutoffDateTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: eventInfo.timezone || 'UTC',
        });

        cutoffStatus.isPastCutoff = now > cutoffDateTime;
      }
    }

    // Fetch VIP status
    let vipStatus = {
      isVip: false,
      isGlobalVip: attendee.is_global_vip || false,
      isVenueVip: false,
      isOrganizerVip: false,
      isEventVip: false,
      vipReasons: [] as string[],
    };

    if (attendee.is_global_vip && attendee.global_vip_reason) {
      vipStatus.vipReasons.push(attendee.global_vip_reason);
    }

    if (eventInfo?.venue_id) {
      const { data: venueVip } = await serviceSupabase
        .from("venue_vips")
        .select("reason")
        .eq("attendee_id", attendee.id)
        .eq("venue_id", eventInfo.venue_id)
        .maybeSingle();

      if (venueVip) {
        vipStatus.isVenueVip = true;
        if (venueVip.reason) {
          vipStatus.vipReasons.push(venueVip.reason);
        }
      }
    }

    if (eventInfo?.organizer_id) {
      const { data: organizerVip } = await serviceSupabase
        .from("organizer_vips")
        .select("reason")
        .eq("attendee_id", attendee.id)
        .eq("organizer_id", eventInfo.organizer_id)
        .maybeSingle();

      if (organizerVip) {
        vipStatus.isOrganizerVip = true;
        if (organizerVip.reason) {
          vipStatus.vipReasons.push(organizerVip.reason);
        }
      }
    }

    vipStatus.isVip = vipStatus.isGlobalVip || vipStatus.isVenueVip || vipStatus.isOrganizerVip;

    // Get XP points
    let xpTotal = 0;
    let xpAtVenue = 0;
    if (attendee.user_id) {
      const { data: xpLedger } = await serviceSupabase
        .from("xp_ledger")
        .select("amount, event_id")
        .eq("user_id", attendee.user_id);

      xpTotal = xpLedger?.reduce((sum, entry) => sum + (entry.amount || 0), 0) || 0;

      if (eventInfo?.venue_id) {
        const { data: venueEvents } = await serviceSupabase
          .from("events")
          .select("id")
          .eq("venue_id", eventInfo.venue_id);

        const venueEventIds = venueEvents?.map((e) => e.id) || [];
        if (venueEventIds.length > 0) {
          const venueXp = xpLedger?.filter((entry) => 
            entry.event_id && venueEventIds.includes(entry.event_id)
          ) || [];
          xpAtVenue = venueXp.reduce((sum, entry) => sum + (entry.amount || 0), 0);
        }
      }
    }

    // Get feedback history for this venue
    let feedbackHistory: any[] = [];
    if (eventInfo?.venue_id) {
      const { data: venueEvents } = await serviceSupabase
        .from("events")
        .select("id")
        .eq("venue_id", eventInfo.venue_id);

      const venueEventIds = venueEvents?.map((e) => e.id) || [];

      if (venueEventIds.length > 0) {
        const { data: feedback } = await serviceSupabase
          .from("event_feedback")
          .select(`
            id,
            rating,
            feedback_type,
            comment,
            submitted_at,
            events!inner(id, name, start_time)
          `)
          .eq("attendee_id", attendee.id)
          .in("event_id", venueEventIds)
          .order("submitted_at", { ascending: false })
          .limit(5);

        if (feedback) {
          feedbackHistory = feedback.map((fb) => {
            const event = Array.isArray(fb.events) ? fb.events[0] : fb.events;
            return {
              id: fb.id,
              rating: fb.rating,
              feedback_type: fb.feedback_type,
              comment: fb.comment,
              submitted_at: fb.submitted_at,
              event_name: event?.name || "Unknown Event",
              event_date: event?.start_time || null,
            };
          });
        }
      }
    }

    // Check for table party info
    let tablePartyInfo: {
      isTableParty: boolean;
      tableName: string | null;
      hostName: string | null;
      isHost: boolean;
      checkedInCount: number;
      partySize: number;
      zoneName: string | null;
      bookingId: string | null;
      notes: string | null;
    } | null = null;

    console.log(`[Check-in Preview API] Looking for table party for attendee_id: ${attendee.id}, event: ${eventId}`);

    try {
      // Look for a table_party_guests record for this attendee at this event
      const { data: tableGuest, error: tableGuestError } = await serviceSupabase
        .from("table_party_guests")
        .select(`
          id,
          is_host,
          status,
          booking_id,
          table_bookings!inner(
            id,
            event_id,
            guest_name,
            party_size,
            status,
            special_requests,
            table:venue_tables(
              id,
              name,
              zone:table_zones(id, name)
            )
          )
        `)
        .eq("attendee_id", attendee.id)
        .eq("table_bookings.event_id", eventId)
        .eq("status", "joined")
        .maybeSingle();

      console.log(`[Check-in Preview API] Table guest lookup result:`, {
        found: !!tableGuest,
        error: tableGuestError?.message || 'none',
        guestData: tableGuest ? { id: tableGuest.id, is_host: tableGuest.is_host, booking_id: tableGuest.booking_id } : null
      });

      if (tableGuest) {
        const booking = tableGuest.table_bookings as any;
        const table = booking?.table;
        const zone = table?.zone;

        // Count how many guests are checked in for this booking
        const { count: checkedInCount } = await serviceSupabase
          .from("table_party_guests")
          .select("*", { count: "exact", head: true })
          .eq("booking_id", tableGuest.booking_id)
          .eq("status", "joined")
          .eq("checked_in", true);

        tablePartyInfo = {
          isTableParty: true,
          tableName: table?.name || null,
          hostName: booking?.guest_name || null,
          isHost: tableGuest.is_host,
          checkedInCount: checkedInCount || 0,
          partySize: booking?.party_size || 0,
          zoneName: zone?.name || null,
          bookingId: tableGuest.booking_id,
          notes: booking?.special_requests || null,
        };
      }
    } catch (tablePartyError) {
      console.warn(`[Check-in Preview API] Error checking table party info:`, tablePartyError);
      // Continue without table party info - non-critical
    }

    return NextResponse.json({
      registration_id: finalRegistrationId,
      attendee_id: attendee.id,
      attendee: {
        id: attendee.id,
        name: attendee.name,
        surname: attendee.surname,
        full_name: attendeeName,
        email: attendee.email,
        phone: attendee.phone,
        avatar_url: attendee.avatar_url,
        user_id: attendee.user_id,
      },
      vip_status: vipStatus,
      xp: {
        total: xpTotal,
        at_venue: xpAtVenue,
      },
      feedback_history: feedbackHistory,
      table_party: tablePartyInfo,
      cutoff_status: cutoffStatus,
      already_checked_in: !!existingCheckin,
      checked_in_at: existingCheckin?.checked_in_at || null,
      registered_at: registration.registered_at,
    });
  } catch (error: any) {
    console.error("[Check-in Preview API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendee details" },
      { status: 500 }
    );
  }
}
