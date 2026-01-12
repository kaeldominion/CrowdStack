import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserVenueId } from "@/lib/data/get-user-entity";
import { userHasRoleOrSuperadmin } from "@/lib/auth/check-role";
import { sendFeedbackRequest } from "@crowdstack/shared/email/feedback-request";

/**
 * POST /api/venue/events/[eventId]/feedback/send-test
 * Manually send a feedback request email to a specific attendee (for testing)
 * Venue admins only
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
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
      return NextResponse.json(
        { error: "Venue not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { registrationId } = body;

    if (!registrationId) {
      return NextResponse.json(
        { error: "registrationId is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Verify event belongs to venue
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id, venue_id")
      .eq("id", params.eventId)
      .eq("venue_id", venueId)
      .single();

    if (!event) {
      return NextResponse.json(
        { error: "Event not found or no access" },
        { status: 404 }
      );
    }

    // Get registration and attendee details
    const { data: registration, error: regError } = await serviceSupabase
      .from("registrations")
      .select(`
        id,
        attendee_id,
        event_id,
        attendees!inner(
          id,
          email,
          user_id,
          name
        )
      `)
      .eq("id", registrationId)
      .eq("event_id", params.eventId)
      .single();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    const attendee = Array.isArray(registration.attendees)
      ? registration.attendees[0]
      : registration.attendees;

    if (!attendee?.email) {
      return NextResponse.json(
        { error: "Attendee does not have an email address" },
        { status: 400 }
      );
    }

    if (!attendee?.user_id) {
      return NextResponse.json(
        { error: "Attendee does not have a user account (required for feedback)" },
        { status: 400 }
      );
    }

    // Check if attendee was checked in
    const { data: checkin } = await serviceSupabase
      .from("checkins")
      .select("id")
      .eq("registration_id", registrationId)
      .is("undo_at", null)
      .single();

    if (!checkin) {
      return NextResponse.json(
        { error: "Attendee was not checked in to this event" },
        { status: 400 }
      );
    }

    // Send feedback request (this will create the request record if it doesn't exist)
    const result = await sendFeedbackRequest(
      registrationId,
      params.eventId,
      attendee.user_id,
      attendee.email
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send feedback request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Feedback request sent successfully",
      attendee: {
        name: attendee.name,
        email: attendee.email,
      },
    });
  } catch (error: any) {
    console.error("[Send Test Feedback] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
