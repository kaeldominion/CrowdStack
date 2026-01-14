import { NextResponse } from "next/server";
import { createClient } from "@crowdstack/shared/supabase/server";
import { createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserPromoterId } from "@/lib/data/get-user-entity";


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
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
        max_guestlist_size,
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

    // BATCH QUERY OPTIMIZATION: Get promoter-specific stats in bulk
    const eventIdsFromEvents = (events || []).map((e) => e.id);

    // Batch fetch all registrations for this promoter across all events
    const { data: allPromoterRegs } = eventIdsFromEvents.length > 0
      ? await serviceClient
          .from("registrations")
          .select("id, event_id")
          .in("event_id", eventIdsFromEvents)
          .eq("referral_promoter_id", promoterId)
      : { data: [] };

    // Get all registration IDs for batch checkin lookup
    const allRegIds = (allPromoterRegs || []).map((r) => r.id);

    // Batch fetch all checkins for these registrations
    const { data: allCheckins } = allRegIds.length > 0
      ? await serviceClient
          .from("checkins")
          .select("registration_id")
          .in("registration_id", allRegIds)
          .is("undo_at", null)
      : { data: [] };

    // Build lookup maps for O(1) access
    const regsByEvent = new Map<string, number>();
    const checkinRegIds = new Set((allCheckins || []).map((c) => c.registration_id));
    const checkinsByEvent = new Map<string, number>();

    (allPromoterRegs || []).forEach((reg) => {
      regsByEvent.set(reg.event_id, (regsByEvent.get(reg.event_id) || 0) + 1);
      if (checkinRegIds.has(reg.id)) {
        checkinsByEvent.set(reg.event_id, (checkinsByEvent.get(reg.event_id) || 0) + 1);
      }
    });

    const eventsWithStats = (events || []).map((event) => ({
      ...event,
      registrations: regsByEvent.get(event.id) || 0,
      checkins: checkinsByEvent.get(event.id) || 0,
    }));

    return NextResponse.json({ events: eventsWithStats });
  } catch (error) {
    console.error("Error in promoter live events API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

