import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { userHasRoleOrSuperadmin, getUserId } from "@/lib/auth/check-role";
import { getUserOrganizerId } from "@/lib/data/get-user-entity";

// GET - Get organizers that have worked together (same venue)
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await userHasRoleOrSuperadmin("event_organizer"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizerId = await getUserOrganizerId();
    if (!organizerId) {
      return NextResponse.json(
        { error: "No organizer found" },
        { status: 404 }
      );
    }

    const serviceSupabase = createServiceRoleClient();

    // Get all events for this organizer
    const { data: events } = await serviceSupabase
      .from("events")
      .select("venue_id")
      .eq("organizer_id", organizerId);

    const venueIds = [...new Set(events?.map((e) => e.venue_id).filter(Boolean) || [])];

    if (venueIds.length === 0) {
      return NextResponse.json({ organizers: [] });
    }

    // Get all organizers who have events at the same venues
    const { data: otherEvents } = await serviceSupabase
      .from("events")
      .select("organizer_id")
      .in("venue_id", venueIds)
      .neq("organizer_id", organizerId);

    const organizerIds = [
      ...new Set(otherEvents?.map((e) => e.organizer_id).filter(Boolean) || []),
    ];

    if (organizerIds.length === 0) {
      return NextResponse.json({ organizers: [] });
    }

    // Get organizer details
    const { data: organizers, error } = await serviceSupabase
      .from("organizers")
      .select("id, name, email, phone, company_name, created_at")
      .in("id", organizerIds)
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    // Get stats for each organizer
    const organizersWithStats = await Promise.all(
      (organizers || []).map(async (organizer) => {
        // Count shared venues
        const { data: organizerEvents } = await serviceSupabase
          .from("events")
          .select("venue_id")
          .eq("organizer_id", organizer.id)
          .in("venue_id", venueIds);

        const sharedVenueIds = [
          ...new Set(organizerEvents?.map((e) => e.venue_id).filter(Boolean) || []),
        ];

        return {
          ...organizer,
          shared_venues_count: sharedVenueIds.length,
        };
      })
    );

    return NextResponse.json({ organizers: organizersWithStats });
  } catch (error: any) {
    console.error("Error fetching organizers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch organizers" },
      { status: 500 }
    );
  }
}

