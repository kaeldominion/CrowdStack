import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { verifyQRPassToken } from "@crowdstack/shared/qr/verify";
import { decodeTokenType, verifyTablePartyToken } from "@crowdstack/shared/qr/table-party";
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
        if (tokenData.eventId !== eventId) {
          return NextResponse.json(
            { error: "QR token is for a different event" },
            { status: 400 }
          );
        }
        finalRegistrationId = tokenData.registrationId;
      } catch (error: any) {
        // Try table party token
        try {
          const tokenType = decodeTokenType(qrToken);
          if (tokenType === "table_party") {
            const tableData = verifyTablePartyToken(qrToken);
            if (tableData.eventId !== eventId) {
              return NextResponse.json(
                { error: "QR token is for a different event" },
                { status: 400 }
              );
            }
            finalRegistrationId = tableData.registrationId;
          } else {
            return NextResponse.json(
              { error: "Invalid QR token" },
              { status: 400 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: "Invalid QR token" },
            { status: 400 }
          );
        }
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
          global_vip_reason
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

    // Get event info for venue_id and organizer_id
    const { data: eventInfo } = await serviceSupabase
      .from("events")
      .select("venue_id, organizer_id, name")
      .eq("id", eventId)
      .single();

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

    // Check for table party
    let tablePartyInfo = null;
    if (qrToken) {
      try {
        const tokenType = decodeTokenType(qrToken);
        if (tokenType === "table_party") {
          const tableData = verifyTablePartyToken(qrToken);
          const { data: table } = await serviceSupabase
            .from("table_parties")
            .select("name, host_registration_id")
            .eq("id", tableData.tablePartyId)
            .single();

          if (table) {
            const { data: hostReg } = await serviceSupabase
              .from("registrations")
              .select(`
                attendee:attendees(name, surname)
              `)
              .eq("id", table.host_registration_id)
              .single();

            const host = Array.isArray(hostReg?.attendee) 
              ? hostReg?.attendee[0] 
              : hostReg?.attendee;

            tablePartyInfo = {
              tableName: table.name,
              isHost: table.host_registration_id === finalRegistrationId,
              hostName: host 
                ? (host.surname ? `${host.name} ${host.surname}` : host.name)
                : null,
            };
          }
        }
      } catch {
        // Not a table party token, ignore
      }
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
