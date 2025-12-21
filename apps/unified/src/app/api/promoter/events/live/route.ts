import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserPromoterId } from "@/lib/data/get-user-entity";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promoterId = await getUserPromoterId();

    if (!promoterId) {
      return NextResponse.json({ events: [] });
    }

    const serviceClient = createServiceRoleClient();

    // Get events this promoter is assigned to
    const { data: eventPromotions } = await serviceClient
      .from("event_promoters")
      .select("event_id")
      .eq("promoter_id", promoterId);

    const eventIds = eventPromotions?.map((ep) => ep.event_id) || [];

    if (eventIds.length === 0) {
      return NextResponse.json({ events: [] });
    }

    // Fetch live events (currently happening)
    const now = new Date().toISOString();
    const { data: events, error } = await serviceClient
      .from("events")
      .select(`
        id,
        name,
        slug,
        start_time,
        end_time,
        status,
        capacity,
        venue:venues (
          id,
          name
        ),
        organizer:organizers (
          id,
          name
        )
      `)
      .in("id", eventIds)
      .eq("status", "published")
      .lte("start_time", now)
      .or(`end_time.is.null,end_time.gte.${now}`)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching live events:", error);
      return NextResponse.json(
        { error: "Failed to fetch live events" },
        { status: 500 }
      );
    }

    // Get registration and check-in counts for each event (promoter-specific)
    const eventsWithStats = await Promise.all(
      (events || []).map(async (event) => {
        // Get all registrations for this event through this promoter's referral
        const { count: registrations } = await serviceClient
          .from("registrations")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id)
          .eq("referral_promoter_id", promoterId);

        // Get check-ins for this promoter's referrals
        const { data: regs } = await serviceClient
          .from("registrations")
          .select("id")
          .eq("event_id", event.id)
          .eq("referral_promoter_id", promoterId);

        const regIds = regs?.map((r) => r.id) || [];
        let checkinCount = 0;
        if (regIds.length > 0) {
          const { count } = await serviceClient
            .from("checkins")
            .select("*", { count: "exact", head: true })
            .in("registration_id", regIds)
            .is("undo_at", null);
          checkinCount = count || 0;
        }

        return {
          ...event,
          registrations: registrations || 0,
          checkins: checkinCount,
        };
      })
    );

    return NextResponse.json({ events: eventsWithStats });
  } catch (error) {
    console.error("Error in promoter live events API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

