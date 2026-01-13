import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/venue/feedback/attendee/[attendeeId]
 * Get attendee details including contact info and history for this venue
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { attendeeId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has venue_admin role or is superadmin
    const hasAccess = await userHasRoleOrSuperadmin("venue_admin");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json({ error: "No venue found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { attendeeId } = params;

    // Get attendee basic info
    const { data: attendee, error: attendeeError } = await serviceSupabase
      .from("attendees")
      .select("id, name, surname, email, whatsapp, created_at")
      .eq("id", attendeeId)
      .single();

    if (attendeeError || !attendee) {
      return NextResponse.json({ error: "Attendee not found" }, { status: 404 });
    }

    // Get all events for this venue
    const { data: venueEvents } = await serviceSupabase
      .from("events")
      .select("id, name, start_time")
      .eq("venue_id", venueId);

    const eventIds = venueEvents?.map((e) => e.id) || [];

    if (eventIds.length === 0) {
      return NextResponse.json({
        attendee: {
          ...attendee,
          full_name: attendee.surname 
            ? `${attendee.name || ""} ${attendee.surname}`.trim() 
            : attendee.name || "Unknown",
        },
        registrations: [],
        feedback: [],
        checkins: [],
      });
    }

    // Get registrations for this attendee at this venue's events
    const { data: registrations } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        event_id,
        registered_at,
        checked_in,
        events!inner(id, name, start_time)
      `)
      .eq("attendee_id", attendeeId)
      .in("event_id", eventIds)
      .order("registered_at", { ascending: false });

    // Get feedback history for this attendee at this venue's events
    const { data: feedback } = await serviceSupabase
      .from("event_feedback")
      .select(`
        id,
        rating,
        feedback_type,
        comment,
        submitted_at,
        resolved_at,
        events!inner(id, name, start_time)
      `)
      .eq("attendee_id", attendeeId)
      .in("event_id", eventIds)
      .order("submitted_at", { ascending: false });

    // Get check-in history
    const registrationIds = registrations?.map((r) => r.id) || [];
    let checkins: any[] = [];
    if (registrationIds.length > 0) {
      const { data: checkinData } = await serviceSupabase
        .from("checkins")
        .select(`
          id,
          registration_id,
          checked_in_at,
          registrations!inner(
            event_id,
            events!inner(id, name, start_time)
          )
        `)
        .in("registration_id", registrationIds)
        .order("checked_in_at", { ascending: false });
      checkins = checkinData || [];
    }

    // Format the data
    const formattedRegistrations = (registrations || []).map((reg) => {
      const event = Array.isArray(reg.events) ? reg.events[0] : reg.events;
      return {
        id: reg.id,
        event_id: reg.event_id,
        event_name: event?.name || "Unknown Event",
        event_date: event?.start_time || null,
        registered_at: reg.registered_at,
        checked_in: reg.checked_in,
      };
    });

    const formattedFeedback = (feedback || []).map((fb) => {
      const event = Array.isArray(fb.events) ? fb.events[0] : fb.events;
      return {
        id: fb.id,
        rating: fb.rating,
        feedback_type: fb.feedback_type,
        comment: fb.comment,
        submitted_at: fb.submitted_at,
        resolved_at: fb.resolved_at,
        event_id: event?.id || null,
        event_name: event?.name || "Unknown Event",
        event_date: event?.start_time || null,
      };
    });

    const formattedCheckins = checkins.map((checkin) => {
      const reg = Array.isArray(checkin.registrations) 
        ? checkin.registrations[0] 
        : checkin.registrations;
      const event = reg && Array.isArray(reg.events) 
        ? reg.events[0] 
        : reg?.events;
      return {
        id: checkin.id,
        checked_in_at: checkin.checked_in_at,
        event_id: event?.id || null,
        event_name: event?.name || "Unknown Event",
        event_date: event?.start_time || null,
      };
    });

    return NextResponse.json({
      attendee: {
        ...attendee,
        full_name: attendee.surname 
          ? `${attendee.name || ""} ${attendee.surname}`.trim() 
          : attendee.name || "Unknown",
      },
      registrations: formattedRegistrations,
      feedback: formattedFeedback,
      checkins: formattedCheckins,
    });
  } catch (error: any) {
    console.error("Error fetching attendee details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendee details" },
      { status: 500 }
    );
  }
}
