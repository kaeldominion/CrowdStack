import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

interface QuickAddRequest {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  promoter_id?: string;
}

/**
 * POST /api/events/[eventId]/quick-add
 * Quick add an attendee and check them in immediately
 * 
 * Allowed roles: superadmin, door_staff, venue_admin, event_organizer (with event access)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const eventId = params.eventId;
  console.log(`[Quick Add API] Starting quick add for event ${eventId}`);

  try {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();

    // Get user - support localhost dev mode
    const localhostUser = cookieStore.get("localhost_user_id")?.value;
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || localhostUser;

    if (!userId) {
      console.log("[Quick Add API] No authenticated user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Quick Add API] User ${userId} attempting quick add`);

    // Check user roles
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");
    const isDoorStaff = roles.includes("door_staff");
    const isVenueAdmin = roles.includes("venue_admin");
    const isOrganizer = roles.includes("event_organizer");

    // Check if user has access to this event
    let hasAccess = isSuperadmin || isDoorStaff;

    if (!hasAccess && (isVenueAdmin || isOrganizer)) {
      const { data: event } = await serviceSupabase
        .from("events")
        .select(`
          id,
          venue_id,
          organizer_id,
          venue:venues(created_by),
          organizer:organizers(created_by)
        `)
        .eq("id", eventId)
        .single();

      if (event) {
        if (isVenueAdmin && event.venue_id) {
          const { data: venueUser } = await serviceSupabase
            .from("venue_users")
            .select("id")
            .eq("venue_id", event.venue_id)
            .eq("user_id", userId)
            .single();
          const venue = Array.isArray(event.venue) ? event.venue[0] : event.venue;
          hasAccess = hasAccess || !!venueUser || venue?.created_by === userId;
        }

        if (isOrganizer && event.organizer_id) {
          const { data: organizerUser } = await serviceSupabase
            .from("organizer_users")
            .select("id")
            .eq("organizer_id", event.organizer_id)
            .eq("user_id", userId)
            .single();
          const organizer = Array.isArray(event.organizer) ? event.organizer[0] : event.organizer;
          hasAccess = hasAccess || !!organizerUser || organizer?.created_by === userId;
        }
      }
    }

    // Also check door_staff assignments for this specific event
    if (!hasAccess) {
      const { data: doorStaffAssignment } = await serviceSupabase
        .from("event_door_staff")
        .select("id")
        .eq("event_id", eventId)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();
      hasAccess = !!doorStaffAssignment;
    }

    if (!hasAccess) {
      console.log(`[Quick Add API] User ${userId} does not have access to event ${eventId}`);
      return NextResponse.json({ error: "Forbidden: No access to this event" }, { status: 403 });
    }

    const body: QuickAddRequest = await request.json();
    console.log(`[Quick Add API] Adding attendee: ${body.name}`);

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Find or create attendee
    let attendee;
    
    if (body.email || body.phone) {
      const orConditions = [];
      if (body.email) orConditions.push(`email.eq.${body.email}`);
      if (body.phone) orConditions.push(`phone.eq.${body.phone}`);

      const { data: existingAttendee } = await serviceSupabase
        .from("attendees")
        .select("*")
        .or(orConditions.join(","))
        .single();

      if (existingAttendee) {
        console.log(`[Quick Add API] Found existing attendee: ${existingAttendee.id}`);
        attendee = existingAttendee;
      }
    }

    if (!attendee) {
      const { data: created, error: createError } = await serviceSupabase
        .from("attendees")
        .insert({
          name: body.name.trim(),
          email: body.email || null,
          phone: body.phone || null,
        })
        .select()
        .single();

      if (createError) {
        console.error("[Quick Add API] Error creating attendee:", createError);
        throw createError;
      }
      console.log(`[Quick Add API] Created new attendee: ${created.id}`);
      attendee = created;
    }

    // Check if already registered for this event
    const { data: existingReg } = await serviceSupabase
      .from("registrations")
      .select("id")
      .eq("attendee_id", attendee.id)
      .eq("event_id", eventId)
      .single();

    let registration;
    if (existingReg) {
      console.log(`[Quick Add API] Attendee already registered: ${existingReg.id}`);
      registration = existingReg;
    } else {
      const { data: newReg, error: regError } = await serviceSupabase
        .from("registrations")
        .insert({
          attendee_id: attendee.id,
          event_id: eventId,
          referral_promoter_id: body.promoter_id || null,
        })
        .select()
        .single();

      if (regError) {
        console.error("[Quick Add API] Error creating registration:", regError);
        throw regError;
      }
      console.log(`[Quick Add API] Created registration: ${newReg.id}`);
      registration = newReg;
    }

    // Check if already checked in
    const { data: existingCheckin } = await serviceSupabase
      .from("checkins")
      .select("*")
      .eq("registration_id", registration.id)
      .single();

    if (existingCheckin) {
      console.log(`[Quick Add API] Attendee already checked in`);
      return NextResponse.json({
        success: true,
        duplicate: true,
        attendee,
        registration,
        checkin: existingCheckin,
        registration_id: registration.id,
        message: `${attendee.name} was already checked in`,
      });
    }

    // Create checkin
    const { data: checkin, error: checkinError } = await serviceSupabase
      .from("checkins")
      .insert({
        registration_id: registration.id,
        checked_in_by: userId,
      })
      .select()
      .single();

    if (checkinError) {
      console.error("[Quick Add API] Error creating checkin:", checkinError);
      throw checkinError;
    }

    console.log(`[Quick Add API] ✅ Successfully quick-added and checked in ${attendee.name}`);

    return NextResponse.json({
      success: true,
      duplicate: false,
      attendee,
      registration,
      checkin,
      registration_id: registration.id,
      message: `${attendee.name} added and checked in`,
    });
  } catch (error: any) {
    console.error("[Quick Add API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to quick add" },
      { status: 500 }
    );
  }
}
