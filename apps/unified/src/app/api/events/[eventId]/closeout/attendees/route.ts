import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserId } from "@/lib/auth/check-role";

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[eventId]/closeout/attendees?promoter_id=xxx
 * Get list of checked-in attendees referred by a specific promoter
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const promoterId = searchParams.get("promoter_id");

    if (!promoterId) {
      return NextResponse.json(
        { error: "promoter_id is required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get event and verify access
    const { data: event } = await serviceSupabase
      .from("events")
      .select("id, organizer_id, venue_id")
      .eq("id", params.eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if user has access (same logic as closeout)
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    let hasAccess = isSuperadmin;

    if (!hasAccess) {
      // Check if user is organizer creator
      const { data: organizerCreator } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("id", event.organizer_id)
        .eq("created_by", userId)
        .single();

      if (organizerCreator) {
        hasAccess = true;
      }

      // Check if user is organizer team member
      if (!hasAccess) {
        const { data: organizerUser } = await serviceSupabase
          .from("organizer_users")
          .select("id")
          .eq("organizer_id", event.organizer_id)
          .eq("user_id", userId)
          .single();

        if (organizerUser) {
          hasAccess = true;
        }
      }

      // Check if user is venue creator
      if (!hasAccess && event.venue_id) {
        const { data: venueCreator } = await serviceSupabase
          .from("venues")
          .select("id")
          .eq("id", event.venue_id)
          .eq("created_by", userId)
          .single();

        if (venueCreator) {
          hasAccess = true;
        }
      }

      // Check if user is venue team member
      if (!hasAccess && event.venue_id) {
        const { data: venueUser } = await serviceSupabase
          .from("venue_users")
          .select("id")
          .eq("venue_id", event.venue_id)
          .eq("user_id", userId)
          .single();

        if (venueUser) {
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get checked-in attendees referred by this promoter
    // Query from checkins table (not registrations.checked_in) to get accurate data
    const { data: checkins, error: checkinsError } = await serviceSupabase
      .from("checkins")
      .select(`
        id,
        checked_in_at,
        checked_in_by,
        registration:registrations!inner(
          id,
          event_id,
          referral_promoter_id,
          attendee:attendees(
            id,
            name,
            email,
            phone
          )
        )
      `)
      .eq("registration.event_id", params.eventId)
      .eq("registration.referral_promoter_id", promoterId)
      .is("undo_at", null)
      .order("checked_in_at", { ascending: false });

    if (checkinsError) {
      throw checkinsError;
    }

    // Format the response
    const attendees = (checkins || []).map((checkin: any) => {
      const reg = checkin.registration;
      const attendee = Array.isArray(reg?.attendee) ? reg.attendee[0] : reg?.attendee;
      return {
        registration_id: reg?.id || null,
        attendee_id: attendee?.id || null,
        name: attendee?.name || "Unknown",
        email: attendee?.email || null,
        phone: attendee?.phone || null,
        checked_in_at: checkin.checked_in_at,
      };
    });

    return NextResponse.json({
      attendees,
      count: attendees.length,
    });
  } catch (error: any) {
    console.error("[Closeout Attendees API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get attendees" },
      { status: 500 }
    );
  }
}
