import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@crowdstack/shared/supabase/server";
import { getUserPromoterId } from "@/lib/data/get-user-entity";

export interface PromoterDashboardEvent {
  id: string;
  name: string;
  slug: string;
  start_time: string;
  end_time: string | null;
  status: string;
  flier_url: string | null;
  venue_name: string | null;
  referral_link: string;
  registrations: number;
  checkins: number;
  conversionRate: number;
  isLive: boolean;
  isUpcoming: boolean;
  isPast: boolean;
}


// Force dynamic rendering since this route uses cookies() or createClient()
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promoterId = await getUserPromoterId();
    if (!promoterId) {
      return NextResponse.json({ error: "Promoter not found" }, { status: 404 });
    }

    const serviceSupabase = createServiceRoleClient();

    // Get events this promoter is assigned to
    const { data: eventPromoters } = await serviceSupabase
      .from("event_promoters")
      .select("event_id")
      .eq("promoter_id", promoterId);

    const eventIds = eventPromoters?.map((ep) => ep.event_id) || [];

    if (eventIds.length === 0) {
      return NextResponse.json({ 
        events: [],
        liveEvents: [],
        upcomingEvents: [],
        pastEvents: [],
      });
    }

    // Get events with venue info
    const { data: events } = await serviceSupabase
      .from("events")
      .select(`
        id,
        name,
        slug,
        start_time,
        end_time,
        status,
        flier_url,
        venue:venues(name)
      `)
      .in("id", eventIds)
      .order("start_time", { ascending: false });

    if (!events || events.length === 0) {
      return NextResponse.json({ 
        events: [],
        liveEvents: [],
        upcomingEvents: [],
        pastEvents: [],
      });
    }

    // BATCH QUERY OPTIMIZATION: Get all stats in bulk instead of per-event
    const now = new Date();

    // Batch fetch all registrations for this promoter across all events
    const { data: allPromoterRegs } = await serviceSupabase
      .from("registrations")
      .select("id, event_id, checked_in")
      .in("event_id", eventIds)
      .eq("referral_promoter_id", promoterId);

    // Build counts maps for O(1) lookups
    const regsByEvent = new Map<string, number>();
    const checkinsByEvent = new Map<string, number>();

    (allPromoterRegs || []).forEach((reg) => {
      regsByEvent.set(reg.event_id, (regsByEvent.get(reg.event_id) || 0) + 1);
      if (reg.checked_in) {
        checkinsByEvent.set(reg.event_id, (checkinsByEvent.get(reg.event_id) || 0) + 1);
      }
    });

    // Process events using pre-computed maps (no additional queries)
    const enrichedEvents: PromoterDashboardEvent[] = [];
    const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://crowdstack.app";

    for (const event of events) {
      const registrations = regsByEvent.get(event.id) || 0;
      const checkins = checkinsByEvent.get(event.id) || 0;

      const startTime = new Date(event.start_time);
      const endTime = event.end_time ? new Date(event.end_time) : new Date(startTime.getTime() + 6 * 60 * 60 * 1000); // Default 6 hours

      const isLive = now >= startTime && now <= endTime && event.status === "published";
      const isUpcoming = now < startTime && event.status === "published";
      const isPast = now > endTime || event.status === "completed";

      enrichedEvents.push({
        id: event.id,
        name: event.name,
        slug: event.slug,
        start_time: event.start_time,
        end_time: event.end_time,
        status: event.status,
        flier_url: event.flier_url,
        venue_name: (event.venue as any)?.name || null,
        referral_link: `${baseUrl}/e/${event.slug}?ref=${promoterId}`,
        registrations,
        checkins,
        conversionRate: registrations > 0
          ? Math.round((checkins / registrations) * 100)
          : 0,
        isLive,
        isUpcoming,
        isPast,
      });
    }

    // Sort and categorize
    const liveEvents = enrichedEvents.filter(e => e.isLive);
    const upcomingEvents = enrichedEvents
      .filter(e => e.isUpcoming)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    const pastEvents = enrichedEvents
      .filter(e => e.isPast)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return NextResponse.json({
      events: enrichedEvents,
      liveEvents,
      upcomingEvents,
      pastEvents,
      promoterId,
    });
  } catch (error: any) {
    console.error("[Promoter Dashboard Events] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch promoter events" },
      { status: 500 }
    );
  }
}

