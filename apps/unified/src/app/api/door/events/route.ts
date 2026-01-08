import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRole } from "@crowdstack/shared/auth/roles";
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


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check door_staff role
    if (!(await userHasRole("door_staff"))) {
      return NextResponse.json({ error: "Forbidden - door_staff role required" }, { status: 403 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Check if user is a superadmin (can access all events)
    const { data: superadminRole } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "superadmin")
      .single();

    const isSuperadmin = !!superadminRole;

    // Check if user is a venue admin or organizer (can access their events)
    const { data: venueAdminRole } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "venue_admin")
      .single();

    const { data: organizerRole } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "event_organizer")
      .single();

    const isVenueAdmin = !!venueAdminRole;
    const isOrganizer = !!organizerRole;

    let events: any[] = [];

    if (isSuperadmin) {
      // Superadmins can see all published events
      const { data } = await serviceSupabase
        .from("events")
        .select(`
          id,
          name,
          slug,
          start_time,
          end_time,
          capacity,
          status,
          venue:venues(name)
        `)
        .eq("status", "published")
        .gte("start_time", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("start_time", { ascending: true })
        .limit(50);
      events = data || [];
    } else {
      // Get events user is assigned to as door staff
      const { data: doorStaffAssignments } = await serviceSupabase
        .from("event_door_staff")
        .select("event_id")
        .eq("user_id", userId)
        .eq("status", "active");

      const assignedEventIds = doorStaffAssignments?.map((a) => a.event_id) || [];

      // Also get events from venues/organizers they belong to (if they're venue admin or organizer)
      let additionalEventIds: string[] = [];

      if (isVenueAdmin) {
        // Get events at venues they manage
        const { data: venueIds } = await serviceSupabase
          .from("venue_users")
          .select("venue_id")
          .eq("user_id", userId);
        
        const { data: createdVenues } = await serviceSupabase
          .from("venues")
          .select("id")
          .eq("created_by", userId);

        const allVenueIds = [
          ...(venueIds?.map((v) => v.venue_id) || []),
          ...(createdVenues?.map((v) => v.id) || []),
        ];

        if (allVenueIds.length > 0) {
          const { data: venueEvents } = await serviceSupabase
            .from("events")
            .select("id")
            .in("venue_id", allVenueIds)
            .eq("status", "published");
          additionalEventIds.push(...(venueEvents?.map((e) => e.id) || []));
        }
      }

      if (isOrganizer) {
        // Get events from organizers they belong to
        const { data: organizerIds } = await serviceSupabase
          .from("organizer_users")
          .select("organizer_id")
          .eq("user_id", userId);
        
        const { data: createdOrganizers } = await serviceSupabase
          .from("organizers")
          .select("id")
          .eq("created_by", userId);

        const allOrganizerIds = [
          ...(organizerIds?.map((o) => o.organizer_id) || []),
          ...(createdOrganizers?.map((o) => o.id) || []),
        ];

        if (allOrganizerIds.length > 0) {
          const { data: organizerEvents } = await serviceSupabase
            .from("events")
            .select("id")
            .in("organizer_id", allOrganizerIds)
            .eq("status", "published");
          additionalEventIds.push(...(organizerEvents?.map((e) => e.id) || []));
        }
      }

      // Check for permanent venue door staff access
      const { data: venueDoorStaff } = await serviceSupabase
        .from("venue_door_staff")
        .select("venue_id")
        .eq("user_id", userId)
        .eq("status", "active");

      if (venueDoorStaff && venueDoorStaff.length > 0) {
        const venueIds = venueDoorStaff.map((v) => v.venue_id);
        const { data: venueEvents } = await serviceSupabase
          .from("events")
          .select("id")
          .in("venue_id", venueIds)
          .eq("status", "published");
        additionalEventIds.push(...(venueEvents?.map((e) => e.id) || []));
      }

      // Check for permanent organizer door staff access
      const { data: organizerDoorStaff } = await serviceSupabase
        .from("organizer_door_staff")
        .select("organizer_id")
        .eq("user_id", userId)
        .eq("status", "active");

      if (organizerDoorStaff && organizerDoorStaff.length > 0) {
        const organizerIds = organizerDoorStaff.map((o) => o.organizer_id);
        const { data: organizerEvents } = await serviceSupabase
          .from("events")
          .select("id")
          .in("organizer_id", organizerIds)
          .eq("status", "published");
        additionalEventIds.push(...(organizerEvents?.map((e) => e.id) || []));
      }

      // Combine all event IDs
      const allEventIds = [...new Set([...assignedEventIds, ...additionalEventIds])];

      if (allEventIds.length === 0) {
        return NextResponse.json({ 
          events: [],
          message: "No events assigned. Contact your venue or organizer to get access."
        });
      }

      // Fetch event details
      const { data } = await serviceSupabase
        .from("events")
        .select(`
          id,
          name,
          slug,
          start_time,
          end_time,
          capacity,
          status,
          venue:venues(name)
        `)
        .in("id", allEventIds)
        .eq("status", "published")
        .gte("start_time", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("start_time", { ascending: true })
        .limit(50);
      
      events = data || [];
    }

    // Get current attendance for each event
    const eventsWithStats = await Promise.all(
      events.map(async (event: any) => {
        const { data: registrations } = await serviceSupabase
          .from("registrations")
          .select("id")
          .eq("event_id", event.id);

        const regIds = registrations?.map((r) => r.id) || [];
        let currentAttendance = 0;

        if (regIds.length > 0) {
          const { count } = await serviceSupabase
            .from("checkins")
            .select("*", { count: "exact", head: true })
            .in("registration_id", regIds)
            .is("undo_at", null);
          currentAttendance = count || 0;
        }

        return {
          ...event,
          current_attendance: currentAttendance,
        };
      })
    );

    return NextResponse.json({ events: eventsWithStats });
  } catch (error: any) {
    console.error("Error fetching door events:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}
