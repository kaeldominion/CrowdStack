import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userId = user?.id;

  if (!userId) {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase/)?.[1] || "supabase";
    const authCookieName = `sb-${projectRef}-auth-token`;
    const authCookie = cookieStore.get(authCookieName);

    if (authCookie) {
      try {
        const cookieValue = decodeURIComponent(authCookie.value);
        const parsed = JSON.parse(cookieValue);
        if (parsed.user?.id) {
          userId = parsed.user.id;
        }
      } catch (e) {}
    }
  }

  return userId || null;
}

/**
 * GET /api/door/events/[eventId]
 * Get event details for door scanner
 * Permissions: venue_admin, event_organizer, door_staff assigned to event, or superadmin
 */

// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", requiresLogin: true }, { status: 401 });
    }

    const serviceSupabase = createServiceRoleClient();
    const eventId = params.eventId;

    // Get event details first
    const { data: event, error: eventError } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        start_time,
        end_time,
        max_guestlist_size,
        status,
        flier_url,
        venue_id,
        organizer_id,
        venue:venues(id, name, address, city, capacity),
        organizer:organizers(id, name, email, created_by)
      `)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check user roles
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");
    const isVenueAdmin = roles.includes("venue_admin");
    const isOrganizer = roles.includes("event_organizer");
    const isDoorStaff = roles.includes("door_staff");

    let hasAccess = false;

    // Superadmins can access any event
    if (isSuperadmin) {
      hasAccess = true;
    }

    // Check venue admin access
    if (isVenueAdmin && !hasAccess && event.venue_id) {
      const { data: venueUsers } = await serviceSupabase
        .from("venue_users")
        .select("id")
        .eq("user_id", userId)
        .eq("venue_id", event.venue_id)
        .single();

      const { data: venueCreator } = await serviceSupabase
        .from("venues")
        .select("id")
        .eq("id", event.venue_id)
        .eq("created_by", userId)
        .single();

      if (venueUsers || venueCreator) {
        hasAccess = true;
      }
    }

    // Check organizer access
    if (isOrganizer && !hasAccess && event.organizer_id) {
      const { data: organizerUsers } = await serviceSupabase
        .from("organizer_users")
        .select("id")
        .eq("user_id", userId)
        .eq("organizer_id", event.organizer_id)
        .single();

      const { data: organizerCreator } = await serviceSupabase
        .from("organizers")
        .select("id")
        .eq("id", event.organizer_id)
        .eq("created_by", userId)
        .single();

      if (organizerUsers || organizerCreator) {
        hasAccess = true;
      }
    }

    // Check door staff access (event-specific)
    if (isDoorStaff && !hasAccess) {
      const { data: doorStaffAssignment } = await serviceSupabase
        .from("event_door_staff")
        .select("id")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .eq("status", "active")
        .single();

      if (doorStaffAssignment) {
        hasAccess = true;
      }
    }

    // Check permanent venue door staff access
    if (!hasAccess && event.venue_id) {
      const { data: venueDoorStaff } = await serviceSupabase
        .from("venue_door_staff")
        .select("id")
        .eq("user_id", userId)
        .eq("venue_id", event.venue_id)
        .eq("status", "active")
        .single();

      if (venueDoorStaff) {
        hasAccess = true;
      }
    }

    // Check permanent organizer door staff access
    if (!hasAccess && event.organizer_id) {
      const { data: organizerDoorStaff } = await serviceSupabase
        .from("organizer_door_staff")
        .select("id")
        .eq("user_id", userId)
        .eq("organizer_id", event.organizer_id)
        .eq("status", "active")
        .single();

      if (organizerDoorStaff) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ 
        error: "Access denied. You don't have door scanner access to this event.",
        requiresAccess: true 
      }, { status: 403 });
    }

    // Get stats
    const { data: registrations } = await serviceSupabase
      .from("registrations")
      .select("id")
      .eq("event_id", eventId);

    const regIds = registrations?.map((r) => r.id) || [];
    let checkinsCount = 0;

    if (regIds.length > 0) {
      const { count } = await serviceSupabase
        .from("checkins")
        .select("*", { count: "exact", head: true })
        .in("registration_id", regIds)
        .is("undo_at", null);
      checkinsCount = count || 0;
    }

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        start_time: event.start_time,
        end_time: event.end_time,
        max_guestlist_size: event.max_guestlist_size,
        status: event.status,
        flier_url: event.flier_url,
        venue: event.venue,
        organizer: event.organizer,
      },
      stats: {
        registrations_count: regIds.length,
        checkins_count: checkinsCount,
      },
    });
  } catch (error: any) {
    console.error("Error fetching door event:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch event" },
      { status: 500 }
    );
  }
}

