import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { getUserVenueId } from "@/lib/data/get-user-entity";

// Force dynamic rendering since this route uses getUserId() which uses cookies()
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRoleOrSuperadmin("venue_admin"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const venueId = await getUserVenueId();
    if (!venueId) {
      return NextResponse.json(
        { error: "No venue found" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all organizers who have events at this venue
    const { data: events, error: eventsError } = await serviceSupabase
      .from("events")
      .select("organizer_id")
      .eq("venue_id", venueId);

    if (eventsError) {
      throw eventsError;
    }

    // Get unique organizer IDs
    const organizerIds = [
      ...new Set(events?.map((e) => e.organizer_id).filter(Boolean) || []),
    ];

    if (organizerIds.length === 0) {
      return NextResponse.json({ organizers: [] });
    }

    // Get organizer details
    const { data: organizers, error: orgError } = await serviceSupabase
      .from("organizers")
      .select("id, name, email, phone, company_name, created_at")
      .in("id", organizerIds)
      .order("name", { ascending: true });

    if (orgError) {
      throw orgError;
    }

    // Get event counts and stats for each organizer
    const organizersWithStats = await Promise.all(
      (organizers || []).map(async (organizer) => {
        // Count events at this venue
        const { count: eventsCount } = await serviceSupabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("venue_id", venueId)
          .eq("organizer_id", organizer.id);

        // Get event IDs for this organizer at this venue
        const { data: organizerEvents } = await serviceSupabase
          .from("events")
          .select("id")
          .eq("venue_id", venueId)
          .eq("organizer_id", organizer.id);

        const eventIds = organizerEvents?.map((e) => e.id) || [];

        // Count total registrations
        let totalRegistrations = 0;
        let totalCheckIns = 0;

        if (eventIds.length > 0) {
          const { count: regCount } = await serviceSupabase
            .from("registrations")
            .select("*", { count: "exact", head: true })
            .in("event_id", eventIds);

          totalRegistrations = regCount || 0;

          // Get registration IDs for check-ins
          const { data: regs } = await serviceSupabase
            .from("registrations")
            .select("id")
            .in("event_id", eventIds);

          const regIds = regs?.map((r) => r.id) || [];

          if (regIds.length > 0) {
            const { count: checkinCount } = await serviceSupabase
              .from("checkins")
              .select("*", { count: "exact", head: true })
              .in("registration_id", regIds)
              .is("undo_at", null);

            totalCheckIns = checkinCount || 0;
          }
        }

        // Check if pre-approved
        const { data: partnership } = await serviceSupabase
          .from("venue_organizer_partnerships")
          .select("id, auto_approve")
          .eq("venue_id", venueId)
          .eq("organizer_id", organizer.id)
          .single();

        return {
          ...organizer,
          events_count: eventsCount || 0,
          total_registrations: totalRegistrations,
          total_checkins: totalCheckIns,
          is_preapproved: !!partnership?.auto_approve,
          partnership_id: partnership?.id || null,
        };
      })
    );

    return NextResponse.json({ organizers: organizersWithStats });
  } catch (error: any) {
    console.error("Error fetching venue organizers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch organizers" },
      { status: 500 }
    );
  }
}


