import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { cookies } from "next/headers";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let userId = user?.id;

    // If no user from Supabase client, try reading from localhost cookie
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
        } catch (e) {
          // Cookie parse error
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role using service role to bypass RLS
    const serviceSupabase = createServiceRoleClient();
    const { data: userRoles } = await serviceSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const roles = userRoles?.map((r) => r.role) || [];
    const isSuperadmin = roles.includes("superadmin");

    if (!isSuperadmin) {
      return NextResponse.json({ 
        error: "Forbidden - Superadmin role required",
        yourRoles: roles 
      }, { status: 403 });
    }

    // Fetch attendees with limited columns for performance
    const { data: attendees, error } = await serviceSupabase
      .from("attendees")
      .select("id, name, email, phone, gender, user_id, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      throw error;
    }

    if (!attendees || attendees.length === 0) {
      return NextResponse.json({ attendees: [] });
    }

    // BATCH QUERY OPTIMIZATION: Fetch all related data in bulk instead of N+1 queries
    const attendeeIds = attendees.map((a) => a.id);

    // 1. Batch fetch all registrations for these attendees
    const { data: allRegistrations } = await serviceSupabase
      .from("registrations")
      .select("id, attendee_id, event_id")
      .in("attendee_id", attendeeIds);

    // Build maps for O(1) lookups
    const registrationsByAttendee = new Map<string, Array<{ id: string; event_id: string }>>();
    const allRegistrationIds: string[] = [];
    const eventIdsByAttendee = new Map<string, Set<string>>();

    (allRegistrations || []).forEach((reg) => {
      if (!registrationsByAttendee.has(reg.attendee_id)) {
        registrationsByAttendee.set(reg.attendee_id, []);
        eventIdsByAttendee.set(reg.attendee_id, new Set());
      }
      registrationsByAttendee.get(reg.attendee_id)!.push({ id: reg.id, event_id: reg.event_id });
      eventIdsByAttendee.get(reg.attendee_id)!.add(reg.event_id);
      allRegistrationIds.push(reg.id);
    });

    // 2. Batch fetch all checkins for these registrations
    const checkinsByRegistration = new Map<string, number>();
    if (allRegistrationIds.length > 0) {
      const { data: allCheckins } = await serviceSupabase
        .from("checkins")
        .select("registration_id")
        .in("registration_id", allRegistrationIds)
        .is("undo_at", null);

      (allCheckins || []).forEach((checkin) => {
        const current = checkinsByRegistration.get(checkin.registration_id) || 0;
        checkinsByRegistration.set(checkin.registration_id, current + 1);
      });
    }

    // 3. Batch fetch venue_ids for all events
    const allEventIds = [...new Set((allRegistrations || []).map((r) => r.event_id))];
    const venueByEvent = new Map<string, string>();
    if (allEventIds.length > 0) {
      const { data: events } = await serviceSupabase
        .from("events")
        .select("id, venue_id")
        .in("id", allEventIds);

      (events || []).forEach((event) => {
        if (event.venue_id) {
          venueByEvent.set(event.id, event.venue_id);
        }
      });
    }

    // 4. Build final response using the pre-fetched data
    const attendeesWithCounts = attendees.map((attendee) => {
      const regs = registrationsByAttendee.get(attendee.id) || [];
      const eventsCount = regs.length;

      // Sum checkins from the registration map
      let checkinsCount = 0;
      regs.forEach((reg) => {
        checkinsCount += checkinsByRegistration.get(reg.id) || 0;
      });

      // Calculate unique venues
      const venueIds = new Set<string>();
      regs.forEach((reg) => {
        const venueId = venueByEvent.get(reg.event_id);
        if (venueId) venueIds.add(venueId);
      });

      // User info
      const userInfo = attendee.user_id
        ? { user_id: attendee.user_id, has_account: true }
        : null;

      return {
        ...attendee,
        events_count: eventsCount,
        checkins_count: checkinsCount,
        venues_count: venueIds.size,
        user_info: userInfo,
      };
    });

    return NextResponse.json({ attendees: attendeesWithCounts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch attendees" },
      { status: 500 }
    );
  }
}

